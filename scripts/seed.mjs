import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing Supabase URL or service role key in .env.local.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { count } = await sb.from("services").select("id", { count: "exact", head: true });

if ((count || 0) > 0) {
  console.log("ℹ️ Services table is not empty — skipping seed.");
} else {
  const now = new Date().toISOString();
  const demo = [
    { provider_service_id: "seed-ig-followers", platform: "instagram", category: "Followers", name: "Instagram Followers | 100% Real", provider_rate: 0.003, markup_percent: 30, min: 50, max: 50000 },
    { provider_service_id: "seed-ig-likes", platform: "instagram", category: "Likes", name: "Instagram Likes | High Quality", provider_rate: 0.0022, markup_percent: 30, min: 50, max: 20000 },
    { provider_service_id: "seed-ig-views", platform: "instagram", category: "Views", name: "Instagram Video Views | Instant", provider_rate: 0.0008, markup_percent: 30, min: 100, max: 100000 },
    { provider_service_id: "seed-tt-followers", platform: "tiktok", category: "Followers", name: "TikTok Followers | Real Active", provider_rate: 0.004, markup_percent: 30, min: 30, max: 30000 },
    { provider_service_id: "seed-tt-likes", platform: "tiktok", category: "Likes", name: "TikTok Likes | No Drop", provider_rate: 0.0018, markup_percent: 30, min: 50, max: 20000 },
    { provider_service_id: "seed-tt-views", platform: "tiktok", category: "Views", name: "TikTok Views | Instant", provider_rate: 0.0006, markup_percent: 30, min: 100, max: 200000 },
    { provider_service_id: "seed-yt-subscribers", platform: "youtube", category: "Subscribers", name: "YouTube Subscribers | Slow Start", provider_rate: 0.028, markup_percent: 30, min: 20, max: 10000 },
    { provider_service_id: "seed-yt-views", platform: "youtube", category: "Views", name: "YouTube Views | High Quality", provider_rate: 0.0025, markup_percent: 30, min: 100, max: 100000 },
    { provider_service_id: "seed-yt-likes", platform: "youtube", category: "Likes", name: "YouTube Likes | 100% Real", provider_rate: 0.009, markup_percent: 30, min: 20, max: 10000 },
  ].map((s) => ({ ...s, active: true, ai_score: 70, created_at: now }));

  const { error } = await sb.from("services").insert(demo);
  if (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`✅ Inserted ${demo.length} demo services.`);
}

const { data: existingAnn } = await sb.from("announcements").select("id").eq("title", "Welcome to Wazeo").limit(1);
if (!existingAnn || existingAnn.length === 0) {
  const { error: annErr } = await sb.from("announcements").insert({
    title: "Welcome to Wazeo",
    body: "Aapka account ready hai. Service chuno, order place karo aur mock mode me sab test karo!",
    active: true,
  });
  if (annErr) console.warn("⚠️ Could not add welcome announcement:", annErr.message);
  else console.log("✅ Welcome announcement added.");
} else {
  console.log("ℹ️ Welcome announcement already exists.");
}

console.log("🎉 Seed complete.");
