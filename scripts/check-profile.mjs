import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.argv[2] || "").trim().toLowerCase();

if (!url || !key) {
  console.error("❌ Supabase URL / service role key missing in .env.local");
  process.exit(1);
}
if (!email) {
  console.error("Usage: node scripts/check-profile.mjs <email>");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// 1) find the auth user
const { data: users, error: uErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (uErr) {
  console.error("❌ Could not list users:", uErr.message);
  process.exit(1);
}
const user = (users?.users || []).find((u) => u.email === email);
if (!user) {
  console.log("� User not found (auth.users) for this email.");
  process.exit(1);
}
console.log(`✅ auth user found: id=${user.id.slice(0, 8)}… confirmed=${!!user.email_confirmed_at}`);

// 2) read the profile row
const { data: prof, error: pErr } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
if (pErr) {
  console.log("❌ Profile read error:", pErr.message);
  process.exit(1);
}
if (!prof) {
  console.log("❌ PROFILE ROW MISSING → yehi login loop ka sabab hai (dashboard/ layout profile nahi milne par /sign-in redirect karta hai).");
  process.exit(1);
}
console.log(`✅ profile exists: username=${prof.username} role=${prof.role} banned=${prof.banned}`);
