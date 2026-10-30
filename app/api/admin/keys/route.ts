import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";
import { randomBytes } from "node:crypto";
import { generateAccessKey, hashAccessKey, last4 } from "@/lib/accessKeys";
import { encryptKey, keyedHash, decryptKey } from "@/lib/keyEncryption";

function keyStatus(row: any): string {
  if (row.revoked) return "Revoked";
  if (row.suspended) return "Suspended";
  if (row.used_at || row.uses > 0) return "Used";
  if (row.expires_at && new Date(row.expires_at) < new Date()) return "Expired";
  return "Active";
}

export async function GET(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const csv = searchParams.get("csv") === "1";

  const { data } = await admin.from("access_codes").select("*, profiles(username)").order("created_at", { ascending: false });
  // Full key is decrypted server-side for admins only. Legacy rows (hash-only,
  // no encrypted_key) have no recoverable full key -> marked legacy.
  let rows = (data || []).map((r) => ({
    ...r,
    status: keyStatus(r),
    legacy: !r.encrypted_key || !r.key_hash,
    full_key: r.encrypted_key ? decryptKey(r.encrypted_key) : "",
  }));
  if (status) rows = rows.filter((r) => r.status === status);
  if (q) {
    rows = rows.filter(
      (r) =>
        (r.email || "").toLowerCase().includes(q) ||
        (r.label || "").toLowerCase().includes(q) ||
        (r.last4 || "").toLowerCase().includes(q)
    );
  }

  if (csv) {
    const head = "email,label,status,created_at,expires_at,mode,starting_balance,used_by,used_at\n";
    const body = rows
      .map((r) =>
        [r.email || "", r.label || "", r.status, r.created_at || "", r.expires_at || "", r.mode || "self", r.starting_balance ?? 0, r.profiles?.username || "", r.used_at || ""]
          .map((f) => `"${String(f).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    return new NextResponse(head + body, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="access-keys.csv"' },
    });
  }

  const { data: setRow } = await admin.from("settings").select("value").eq("key", "invite_only").maybeSingle();

  // Audit: one entry per keys-list view (no full keys in the log).
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await admin.from("audit_logs").insert({
        action: "admin_keys_view",
        details: { actor: user.id, count: rows.length, timestamp: new Date().toISOString() },
      });
    }
  } catch {
    // never throw for logging failures
  }

  return NextResponse.json({ keys: rows, inviteOnly: setRow?.value === "true" });
}

export async function POST(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  // Capture the acting admin's id (for created_by audit on generated licenses).
  let createdBy: string | null = null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    createdBy = user?.id || null;
  } catch {}

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action;
  const admin = createAdminClient();
  const audit = async (actionName: string, details: Record<string, unknown>) => {
    try {
      await admin.from("audit_logs").insert({ action: actionName, details });
    } catch {
      // never throw for logging failures
    }
  };
  const logError = async (message: string) => {
    try {
      await admin.from("error_logs").insert({ level: "error", source: "admin/keys", message });
    } catch {
      // never throw for logging failures
    }
  };

  if (action === "generate") {
    const inputs: any[] = body.inputs || [body];
    const origin = new URL(req.url).origin;
    const out: { id: string; email: string; key: string; last4: string; message?: string }[] = [];

    for (const inp of inputs) {
      const email = (inp.email || "").trim().toLowerCase();
      const label = (inp.label || "").trim();
      const note = (inp.note || "").trim();
      const mode = inp.mode === "admin" ? "admin" : "self";
      const startingBalance = Math.max(0, Number(inp.startingBalance) || 0);

      // Email optional: empty → unbound key (binds on first use).
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await audit("admin_key_generate_failed", { email, error: "invalid email format" });
        await logError("Invalid email format for key generation: " + email);
        continue;
      }

      const key = generateAccessKey();
      // Defaults when empty: redemption valid 30 days.
      const expiresAt = inp.expiresAt
        ? new Date(inp.expiresAt).toISOString()
        : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

      // access days: default 30 when not supplied; "permanent" stays permanent.
      let accessDays: number | null = 30;
      if (inp.accessDays === "permanent") {
        accessDays = null;
      } else if (inp.accessDays != null && inp.accessDays !== "") {
        const n = Number(inp.accessDays);
        accessDays = Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
      }
      const planName = (inp.planName || "").trim() || "Standard";
      const features = Array.isArray(inp.features) ? inp.features.filter((f: unknown) => typeof f === "string" && (f as string).trim()) : [];
      const redemptionExpiresAt = inp.redemptionExpiresAt
        ? new Date(inp.redemptionExpiresAt).toISOString()
        : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

      const created = {
        email: email || null, label, note, mode,
        created_by: createdBy,
        code: hashAccessKey(key),
        hash: hashAccessKey(key),
        key_hash: keyedHash(key),
        encrypted_key: encryptKey(key),
        legacy: false,
        last4: last4(key),
        expires_at: expiresAt,
        access_days: accessDays,
        plan_name: planName,
        features,
        redemption_expires_at: redemptionExpiresAt,
        usage_limit: 1,
        starting_balance: startingBalance,
        active: true,
      };

      if (mode === "admin") {
        const tempPassword = randomBytes(12).toString("base64url").slice(0, 16);
        const { data: nu, error: ce } = await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: !!inp.markVerified,
        });
        if (ce) {
          await audit("admin_key_generate_failed", { email, error: ce.message });
          continue;
        }
        const uid = nu?.user?.id;
        try {
          await admin.from("profiles").upsert({ id: uid, email, must_change_password: true }, { onConflict: "id" });
        } catch {
          // ignore
        }
        let row: { id?: string } | null = null;
        try {
          const rr = await admin
            .from("access_codes")
            .insert({ ...created, uses: 1, used_by: uid, used_at: new Date().toISOString(), must_change_password: true })
            .select("id").single();
          row = rr.data;
        } catch {
          row = null;
        }
        out.push({ id: row?.id || "", email, key, last4: last4(key), message: `Temp password: ${tempPassword} (show once, not stored)` });
        await audit("admin_key_generate", { email, mode, label });
        continue;
      }

      const { data: row, error: ie } = await admin.from("access_codes").insert(created).select("id").single();
      if (ie) {
        await audit("admin_key_generate_failed", { email, error: ie.message });
        continue;
      }
      out.push({ id: row.id, email, key, last4: last4(key) });
      await audit("admin_key_generate", { email, mode, label, balance: startingBalance });
    }

    return NextResponse.json({ ok: true, keys: out });
  }

  if (action === "revoke" || action === "regenerate") {
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
    const { data: existing } = await admin.from("access_codes").select("*").eq("id", id).single();
    if (!existing) return NextResponse.json({ error: "Key not found." }, { status: 404 });

    if (action === "revoke") {
      await admin.from("access_codes").update({ revoked: true, active: false }).eq("id", id);
      await audit("admin_key_revoke", { id, email: existing.email });
      return NextResponse.json({ ok: true });
    }

    await admin.from("access_codes").update({ revoked: true, active: false }).eq("id", id);
    const key = generateAccessKey();
    const { data: row } = await admin
      .from("access_codes")
      .insert({
        email: existing.email,
        label: existing.label,
        note: existing.note,
        mode: existing.mode || "self",
        code: hashAccessKey(key),
        hash: hashAccessKey(key),
        key_hash: keyedHash(key),
        encrypted_key: encryptKey(key),
        legacy: false,
        last4: last4(key),
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        usage_limit: 1,
        starting_balance: existing.starting_balance || 0,
        active: true,
      })
      .select("id")
      .single();
    await audit("admin_key_regenerate", { old_id: id, email: existing.email });
    return NextResponse.json({ ok: true, id: row?.id, key, last4: last4(key) });
  }

  if (action === "deleteExpired") {
    const { data: expired } = await admin
      .from("access_codes")
      .select("id")
      .lt("expires_at", new Date().toISOString())
      .eq("revoked", false)
      .eq("uses", 0);
    const ids = (expired || []).map((r) => r.id);
    if (ids.length) await admin.from("access_codes").delete().in("id", ids);
    await audit("admin_key_delete_expired", { count: ids.length });
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  if (action === "setInvite") {
    await admin.from("settings").upsert({ key: "invite_only", value: body.value ? "true" : "false" }, { onConflict: "key" });
    await audit("admin_set_invite_only", { value: !!body.value });
    return NextResponse.json({ ok: true });
  }

  if (action === "extendAccess") {
    const userId = body.userId;
    if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });
    const days = body.days === "permanent" || body.days == null || body.days === "" ? null : Number(body.days);
    const accessExpiresAt = days && Number.isFinite(days) && days > 0
      ? new Date(Date.now() + days * 86400000).toISOString()
      : null;
    const { error: ue } = await admin.from("profiles").update({ access_expires_at: accessExpiresAt }).eq("id", userId);
    if (ue) return NextResponse.json({ error: ue.message }, { status: 400 });
    await audit("admin_extend_access", { userId, days: days ?? "permanent" });
    return NextResponse.json({ ok: true });
  }

  if (action === "revokeUserAccess") {
    const userId = body.userId;
    if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });
    const { error: ue } = await admin.from("profiles").update({ access_expires_at: new Date().toISOString() }).eq("id", userId);
    if (ue) return NextResponse.json({ error: ue.message }, { status: 400 });
    await audit("admin_revoke_user_access", { userId });
    return NextResponse.json({ ok: true });
  }

  // ---- License management actions (operate on access_codes by id) ----
  const licenseActions = ["suspend", "reactivate", "resetBinding", "transfer", "adjustLicense"] as const;
  if (licenseActions.includes(action as (typeof licenseActions)[number])) {
    const id = body.id;
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
    const { data: existing } = await admin.from("access_codes").select("*").eq("id", id).single();
    if (!existing) return NextResponse.json({ error: "License not found." }, { status: 404 });

    if (action === "suspend") {
      await admin.from("access_codes").update({ suspended: true }).eq("id", id);
      await audit("admin_license_suspend", { id, email: existing.email, last4: existing.last4 });
      return NextResponse.json({ ok: true });
    }

    if (action === "reactivate") {
      await admin.from("access_codes").update({ suspended: false }).eq("id", id);
      await audit("admin_license_reactivate", { id, email: existing.email, last4: existing.last4 });
      return NextResponse.json({ ok: true });
    }

    if (action === "resetBinding") {
      await admin.from("access_codes").update({
        email: null, bound_at: null, used_by: null,
        uses: 0, active: true, used_at: null, revoked: false, suspended: false,
      }).eq("id", id);
      await audit("admin_license_reset_binding", { id, previous_email: existing.email, last4: existing.last4 });
      return NextResponse.json({ ok: true });
    }

    if (action === "transfer") {
      const newEmail = String(body.email || "").trim().toLowerCase();
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(newEmail)) {
        return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
      }
      await admin.from("access_codes").update({ email: newEmail, bound_at: new Date().toISOString() }).eq("id", id);
      await audit("admin_license_transfer", { id, from_email: existing.email, to_email: newEmail, last4: existing.last4 });
      return NextResponse.json({ ok: true });
    }

    if (action === "adjustLicense") {
      const patch: Record<string, unknown> = {};
      if (body.accessDays !== undefined && body.accessDays !== null) {
        const days = body.accessDays === "permanent" ? null : Number(body.accessDays);
        patch.access_days = days === null || (Number.isFinite(days) && days > 0) ? days : existing.access_days;
        patch.plan_name = body.planName && String(body.planName).trim() ? String(body.planName).trim() : existing.plan_name;
      }
      if (body.expiresAt !== undefined && body.expiresAt !== null && body.expiresAt !== "") {
        patch.expires_at = new Date(body.expiresAt).toISOString();
      }
      if (body.features !== undefined) {
        patch.features = Array.isArray(body.features) ? body.features.filter((f: unknown) => typeof f === "string" && (f as string).trim()) : [];
      }
      if (body.permissions !== undefined) {
        patch.permissions = Array.isArray(body.permissions) ? body.permissions : [];
      }
      if (body.quota !== undefined && typeof body.quota === "object") {
        patch.quota = body.quota;
      }
      if (body.startingBalance !== undefined) {
        patch.starting_balance = Math.max(0, Number(body.startingBalance) || 0);
      }
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
      }
      await admin.from("access_codes").update(patch).eq("id", id);
      await audit("admin_license_adjust", { id, patch, email: existing.email, last4: existing.last4 });
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
