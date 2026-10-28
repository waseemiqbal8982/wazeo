import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createHash, timingSafeEqual } from "node:crypto";
import { runHooks } from "@/lib/hooks";

const GENERIC = "This key is invalid, expired or not for this email";
const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");

export async function POST(req: Request) {
  let body: { key?: string; email?: string; password?: string; username?: string; country?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  const key = (body.key || "").trim().toUpperCase();
  const email = (body.email || "").trim().toLowerCase();
  if (!key || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  const rl = rateLimit(`key-redeem:${getClientIp(req)}:${email}`, 5, 600_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait 10 minutes." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: ac } = await admin.from("access_codes").select("*").eq("hash", hashKey(key)).maybeSingle();
  if (!ac) return NextResponse.json({ error: GENERIC }, { status: 400 });

  // constant-time compare of hashes
  const a = Buffer.from(hashKey(key));
  const b = Buffer.from(ac.hash || "");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }
  if ((ac.email || "").toLowerCase() !== email) return NextResponse.json({ error: GENERIC }, { status: 400 });
  if (ac.revoked || !ac.active) return NextResponse.json({ error: GENERIC }, { status: 400 });
  if (ac.used_at || ac.uses > 0) return NextResponse.json({ error: GENERIC }, { status: 400 });
  if (ac.expires_at && new Date(ac.expires_at) < new Date()) return NextResponse.json({ error: GENERIC }, { status: 400 });

  // atomic claim
  const { data: claimed } = await admin
    .from("access_codes")
    .update({ uses: 1, active: false, used_at: new Date().toISOString() })
    .eq("id", ac.id)
    .eq("uses", 0)
    .select("id")
    .maybeSingle();
  if (!claimed) return NextResponse.json({ error: GENERIC }, { status: 400 });

  try {
    await admin.from("audit_logs").insert({ action: "key_redeem_claimed", details: { email } });
  } catch {
    // ignore audit failure
  }

  // Mode (a): create account with user-chosen password
  if (ac.mode !== "admin") {
    const username = (body.username || "").trim();
    const password = body.password || "";
    if (!username || password.length < 8) {
      // rollback claim
      await admin.from("access_codes").update({ uses: 0, active: true, used_at: null }).eq("id", ac.id);
      return NextResponse.json({ error: "Username and a strong password are required." }, { status: 400 });
    }

    const { data: nu, error: ce } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { username, referral: undefined },
    });
    if (ce) {
      await admin.from("access_codes").update({ uses: 0, active: true, used_at: null }).eq("id", ac.id);
      return NextResponse.json({ error: "Could not create the account. Try again." }, { status: 500 });
    }
    const uid = nu?.user?.id;
    const ipHash = createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 24);
    const country = /^[A-Z]{2}$/.test((body.country || "").toUpperCase()) ? (body.country || "").toUpperCase() : null;
    const lang = country === "PK" ? "ur" : country === "IN" ? "hi" : country === "CN" ? "zh" : "en";
    const balance = Math.max(0, Number(ac.starting_balance) || 0);

    await admin.from("profiles").upsert(
      { id: uid, username, email, phone: (body.phone || "").replace(/[^0-9+]/g, "").slice(0, 20) || null, country, language: lang, signup_ip_hash: ipHash, access_key_id: ac.id, balance },
      { onConflict: "id" }
    );
    if (balance > 0) {
      try {
        await admin.from("transactions").insert({ user_id: uid, type: "deposit", amount: balance, note: "Access key starting balance" });
      } catch {
        // ignore
      }
    }
    await admin.from("access_codes").update({ used_by: uid }).eq("id", ac.id);
    try {
      await runHooks("user.signup", { userId: uid });
    } catch {}
    return NextResponse.json({ ok: true, needsVerify: true });
  }

  // Mode (b): account already created by admin; mark used
  return NextResponse.json({ ok: true, mode: "admin" });
}
