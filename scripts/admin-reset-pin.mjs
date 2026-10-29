import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL ya SUPABASE_SERVICE_ROLE_KEY .env.local me.");
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
  if (!email && !envEmails.length) {
    // Fallback: koi bhi admin profile.
    const { data } = await sb.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();
    if (data) {
      const { data: u } = await sb.auth.admin.getUserById(data.id);
      return u?.user || null;
    }
    return null;
  }
  if (!email) return null;
  let page = 1;
  while (page <= 10) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const user = (data?.users || []).find((u) => u.email === email);
    if (user) return user;
    if (!data || data.users.length < 1000) return null;
    page++;
  }
  return null;
}

async function main() {
  const user = await findUser();
  if (!user) {
    console.error("❌ Koi admin user nahi mila (email arg do ya ADMIN_EMAILS set karo).");
    process.exit(1);
  }
  const admin = sb;
  await admin.from("admin_recovery_codes").delete().eq("user_id", user.id);
  await admin.from("admin_pins").delete().eq("user_id", user.id);
  await admin.from("audit_logs").insert({ user_id: user.id, action: "admin_pin_reset_by_owner", details: {} });
  console.log("✅ Admin PIN aur saare recovery codes clear kar diye gaye.");
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
