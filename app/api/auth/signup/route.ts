import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { authErrorMessage, isValidEmail } from "@/lib/authMessages";
import { createHash } from "node:crypto";

export async function POST(req: Request) {
  const rl = rateLimit(`signup:${getClientIp(req)}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  let body: { username?: string; email?: string; password?: string; referral?: string; phone?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.website) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const referral = (body.referral || "").trim();
  const phone = (body.phone || "").replace(/[^0-9+]/g, "").slice(0, 20);

  if (!username || !email || !password) {
    return NextResponse.json({ error: "Username, email and password are required." }, { status: 400 });
  }
  if (username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const ipHash = createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 24);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, referral: referral || undefined, phone: phone || undefined, ip_hash: ipHash },
    },
  });

  if (error) {
    return NextResponse.json({ error: authErrorMessage(error) }, { status: 400 });
  }

  if (data.user && data.user.id) {
    try {
      const admin = createAdminClient();
      await admin.from("profiles").upsert(
        { id: data.user.id, username, phone: phone || null, signup_ip_hash: ipHash },
        { onConflict: "id" }
      );
    } catch {}
  }

  const needsConfirm = !data.session || data.user?.identities?.length === 0;
  return NextResponse.json({ ok: true, needsConfirm });
}
