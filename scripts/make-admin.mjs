import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- email@example.com");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function findUser() {
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

const user = await findUser();
if (!user) {
  console.error(`❌ No user found with email ${email}. Sign up on the site first.`);
  process.exit(1);
}

try {
  const { error: confirmErr } = await sb.auth.admin.updateUserById(user.id, { email_confirm: true });
  if (confirmErr) console.warn("⚠️ Could not auto-confirm email:", confirmErr.message);

  const { error: roleErr } = await sb.from("profiles").update({ role: "admin" }).eq("id", user.id);
  if (roleErr) throw new Error(roleErr.message);

  console.log(`✅ ${email} is now an ADMIN and email is confirmed.`);
} catch (e) {
  console.error("❌ Failed:", e.message);
  process.exit(1);
}
