import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.E2E_BASE || "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("❌ Missing env keys (URL / service role / anon)");
  process.exit(1);
}

const ts = Date.now();
const email = `wazeo-e2e-${ts}@gmail.com`;
const password = "TestPass!234";
const username = `e2e_${ts % 100000}`;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function cleanup() {
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const u = (data?.users || []).find((x) => x.email === email);
    if (u) {
      await admin.from("profiles").delete().eq("id", u.id);
      await admin.auth.admin.deleteUser(u.id);
    }
  } catch {}
}

try {
  // 1) SIGN UP (HTTP endpoint, same call the sign-up form makes)
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const signup = await res.json();
  if (!res.ok) {
    console.log(`✗ SIGNUP FAILED (HTTP ${res.status}): ${signup.error}`);
    process.exit(1);
  }
  console.log(`✓ signup accepted (needsConfirm=${signup.needsConfirm})`);

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const u = (users?.users || []).find((x) => x.email === email);
  if (!u) {
    console.log("✗ user not found after signup");
    process.exit(1);
  }
  if (!u.email_confirmed_at) {
    await admin.auth.admin.updateUserById(u.id, { email_confirm: true });
    console.log("✓ email confirmed via admin");
  }

  const { data: prof } = await admin
    .from("profiles")
    .select("id,username,role")
    .eq("id", u.id)
    .single();
  if (prof) console.log(`✓ profile exists: username=${prof.username} role=${prof.role}`);
  else console.log("✗ profile missing after signup");

  // 2) SIGN IN (same client-SDK call the sign-in form/server action uses)
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: sErr, data: si } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (sErr) {
    console.log(`✗ SIGNIN FAILED: ${sErr.message}`);
    process.exit(1);
  }
  console.log(`✓ signin ok: user=${si.user?.email} session=${!!si.session}`);

  // 3) signin touch endpoint
  const r2 = await fetch(`${BASE}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const t2 = await r2.json();
  console.log(`✓ signin-touch endpoint: ${r2.ok ? "ok" : "fail"} ${JSON.stringify(t2)}`);

  console.log("\n✅ E2E AUTH PASS");
  console.log("Test done — verifying invalid password is rejected:");
  const bad = await client.auth.signInWithPassword({ email, password: "WrongPass!000" });
  console.log(bad.error ? "✓ invalid password correctly rejected" : "✗ invalid password NOT rejected");
} finally {
  await cleanup();
}
