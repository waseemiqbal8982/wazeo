import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL ya SUPABASE_SERVICE_ROLE_KEY .env.local me."
  );
  process.exit(1);
}

// No argument => pehla email ADMIN_EMAILS se (kabhi print nahi).
const envEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const argEmail = (process.argv[2] || "").trim().toLowerCase();
const email = argEmail || envEmails[0];

const sb = createClient(url, key, { auth: { persistSession: false } });

async function findUser() {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const user = (data?.users || []).find((u) => u.email === email);
    if (user) return user;
    if (!data || data.users.length < 1000) return null;
    page++;
  }
  return null;
}

async function removeMfaFactors(userId) {
  let removed = 0;
  try {
    const { data, error } = await sb.auth.admin.mfa.listFactors({ userId });
    if (error) throw new Error(`mfa.listFactors: ${error.message}`);
    for (const factor of data?.factors || []) {
      const { error: delErr } = await sb.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
      if (delErr) throw new Error(`deleteFactor: ${delErr.message}`);
      removed++;
    }
  } catch (e) {
    // MFA enumeration may be unsupported on some plans — treat as empty, never block rescue.
    console.warn("⚠️ MFA factors hataane me dikkat (chhor diya):", e.message);
  }
  return removed;
}

async function clearOwn2fa(userId) {
  await sb
    .from("admin_2fa")
    .upsert(
      {
        user_id: userId,
        enabled: false,
        method: "email",
        code_hash: null,
        code_expires_at: null,
        recovery_hash: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  // Koi bhi "require 2FA for admins" setting OFF kar do.
  await sb.from("settings").upsert({ key: "require_admin_2fa", value: "false" }, { onConflict: "key" });
}

async function findAdminByRole() {
  // Fallback when no email is known: pick the first profile whose role is 'admin'.
  const { data, error } = await sb
    .from("profiles")
    .select("id, role")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}

async function main() {
  let user = null;
  if (email) {
    user = await findUser();
  } else {
    const row = await findAdminByRole();
    if (row) {
      const { data: u } = await sb.auth.admin.getUserById(row.id);
      user = u?.user || null;
    }
  }
  if (!user) {
    console.error(
      "❌ Koi admin user nahi mila. Ya to [email] arg do, ya ADMIN_EMAILS set karo, ya profiles me role='admin' koi ho."
    );
    process.exit(1);
  }
  const factorsRemoved = await removeMfaFactors(user.id);
  await clearOwn2fa(user.id);
  console.log(`✅ 2FA reset ho gaya: Supabase MFA factors (${factorsRemoved}) hataye gaye, admin_2fa OFF hai, require_admin_2fa=false.`);
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
