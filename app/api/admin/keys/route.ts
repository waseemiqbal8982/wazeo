import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/adminAuth";
import { createHash, randomBytes } from "node:crypto";

const SEG = () =>
  randomBytes(3)
    .toString("hex")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .padEnd(4, "X")
    .slice(0, 4);

function makeKey() {
  return `WZ-${SEG()}-${SEG()}-${SEG()}`;
}
const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");
const last4 = (k: string) => k.slice(-4);

function keyStatus(row: any): string {
  if (row.revoked) return "Revoked";
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
  let rows = (data || []).map((r) => ({ ...r, status: keyStatus(r) }));
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

  return NextResponse.json({ keys: rows, inviteOnly: setRow?.value === "true" });
}

export async function POST(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

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
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

      const key = makeKey();
      const expiresAt = inp.expiresAt
        ? new Date(inp.expiresAt).toISOString()
        : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

      // access days: null/number = permanent; default 30 when not supplied
      let accessDays: number | null = null;
      if (inp.accessDays === "permanent" || inp.accessDays == null || inp.accessDays === "") {
        accessDays = null;
      } else {
        const n = Number(inp.accessDays);
        accessDays = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
      }
      const planName = (inp.planName || "").trim() || "Standard";
      const features = Array.isArray(inp.features) ? inp.features.filter((f: unknown) => typeof f === "string" && (f as string).trim()) : [];
      const redemptionExpiresAt = inp.redemptionExpiresAt
        ? new Date(inp.redemptionExpiresAt).toISOString()
        : null;

      const created = {
        email, label, note, mode,
        code: hashKey(key),
        hash: hashKey(key),
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
    const key = makeKey();
    const { data: row } = await admin
      .from("access_codes")
      .insert({
        email: existing.email,
        label: existing.label,
        note: existing.note,
        mode: existing.mode || "self",
        code: hashKey(key),
        hash: hashKey(key),
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

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
