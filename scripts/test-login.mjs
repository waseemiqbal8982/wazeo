import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = (process.argv[2] || "").trim().toLowerCase();
const password = process.argv[3] || "";

if (!url || !anon) {
  console.error("❌ Supabase URL / anon key missing in .env.local");
  process.exit(1);
}
if (!email || !password) {
  console.error("Usage: npm run test:login -- <email> <password>");
  process.exit(1);
}

// 1) sign in with credentials (like the browser does)
const sb = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await sb.auth.signInWithPassword({ email, password });
if (error) {
  console.log(`❌ Login fail: ${error.message}`);
  process.exit(1);
}
console.log("✅ Login OK (session obtained)");

// 2) read the profile using the user's own session (like layouts do)
const profSb = createClient(url, anon);
await profSb.auth.setSession(data.session);
const { data: prof, error: pErr } = await profSb.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
if (pErr) {
  console.log(`❌ Profile read error: ${pErr.message}`);
  process.exit(1);
}
if (!prof) {
  console.log("❌ PROFILE ROW MISSING -> dashboard/admin layout /sign-in redirect karega (loop).");
  process.exit(1);
}
console.log(`✅ profile exists: username=${prof.username} role=${prof.role} banned=${prof.banned}`);
console.log("🎉 test:login PASS — sign-in flow ready.");
