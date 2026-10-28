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

const now = new Date().toISOString();

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

// ---- extras for new tables ----
const { count: lvlCount } = await sb.from("loyalty_levels").select("id", { count: "exact", head: true });
if (!lvlCount) {
  await sb.from("loyalty_levels").insert([
    { name: "Bronze", min_spent: 0, discount_percent: 0, sort: 1 },
    { name: "Silver", min_spent: 100, discount_percent: 3, sort: 2 },
    { name: "Gold", min_spent: 500, discount_percent: 5, sort: 3 },
    { name: "Platinum", min_spent: 2000, discount_percent: 8, sort: 4 },
  ]);
  console.log("✅ Loyalty levels added.");
}

const { count: coupCount } = await sb.from("coupons").select("id", { count: "exact", head: true });
if (!coupCount) {
  await sb.from("coupons").insert({ code: "WELCOME10", type: "percent", value: 10, min_order: 5, active: true });
  console.log("✅ Demo coupon added.");
}

const { data: existingFaq } = await sb.from("faqs").select("id").limit(1);
if (!existingFaq?.length) {
  await sb.from("faqs").insert([
    { lang: "en", question: "How fast are orders delivered?", answer: "Most orders start within minutes.", sort: 1, active: true },
    { lang: "en", question: "What is drip-feed?", answer: "It spreads your order over time using natural curves.", sort: 2, active: true },
  ]);
  console.log("✅ FAQ added.");
}

const { data: existingTesti } = await sb.from("testimonials").select("id").limit(1);
if (!existingTesti?.length) {
  await sb.from("testimonials").insert([{ author: "Ali", rating: 5, text: "Bohot fast delivery!", active: true }]);
  console.log("✅ Testimonial added.");
}

const { count: presetCount } = await sb.from("package_presets").select("id", { count: "exact", head: true });
if (!presetCount) {
  await sb.from("package_presets").insert([
    { name: "Instagram Basics", platform: "instagram", views_qty: 1000, likes_qty: 100, comments_qty: 10, duration_minutes: 120, curve: "steady", discount_percent: 5, active: true },
    { name: "TikTok Viral", platform: "tiktok", views_qty: 5000, likes_qty: 300, comments_qty: 20, duration_minutes: 240, curve: "bell_peak", discount_percent: 8, active: true },
  ]);
  console.log("✅ Package presets added.");
}

// ---- Starter demo services (Item 3): very cheap, drip min 10, is_demo = true ----
const STARTER_SERVICES = [
  { provider_service_id: "ig-st-views-reel", platform: "instagram", category: "Views", name: "Instagram Reel Views | Fast Start", provider_rate: 0.000008, min: 10, max: 100000 },
  { provider_service_id: "ig-st-views-video", platform: "instagram", category: "Views", name: "Instagram Video Views | Boosting", provider_rate: 0.000008, min: 10, max: 100000 },
  { provider_service_id: "ig-st-views-story", platform: "instagram", category: "Views", name: "Instagram Story Views", provider_rate: 0.000008, min: 10, max: 50000 },
  { provider_service_id: "ig-st-views-live", platform: "instagram", category: "Views", name: "Instagram Live Views", provider_rate: 0.000008, min: 10, max: 50000 },
  { provider_service_id: "ig-st-likes-post", platform: "instagram", category: "Likes", name: "Instagram Post Likes | High Quality", provider_rate: 0.000024, min: 10, max: 50000 },
  { provider_service_id: "ig-st-likes-reel", platform: "instagram", category: "Likes", name: "Instagram Reel Likes", provider_rate: 0.000024, min: 10, max: 50000 },
  { provider_service_id: "ig-st-followers", platform: "instagram", category: "Followers", name: "Instagram Followers | Real", provider_rate: 0.00005, min: 10, max: 10000 },
  { provider_service_id: "ig-st-followers-fast", platform: "instagram", category: "Followers", name: "Instagram Followers | Instant", provider_rate: 0.00006, min: 10, max: 10000 },
  { provider_service_id: "ig-st-comments", platform: "instagram", category: "Comments", name: "Instagram Comments | Custom Text", provider_rate: 0.0005, min: 10, max: 1000 },
  { provider_service_id: "ig-st-shares", platform: "instagram", category: "Shares", name: "Instagram Shares | Post", provider_rate: 0.00003, min: 10, max: 5000 },
  { provider_service_id: "ig-st-saves", platform: "instagram", category: "Saves", name: "Instagram Saves | Post", provider_rate: 0.00003, min: 10, max: 5000 },
  { provider_service_id: "ig-st-visits", platform: "instagram", category: "Visits", name: "Instagram Profile Visits", provider_rate: 0.000006, min: 10, max: 20000 },
  { provider_service_id: "ig-st-impressions", platform: "instagram", category: "Other", name: "Instagram Impressions", provider_rate: 0.000004, min: 10, max: 200000 },
  { provider_service_id: "ig-st-likes-comments", platform: "instagram", category: "Other", name: "Instagram Likes & Comments Combo", provider_rate: 0.00004, min: 10, max: 10000 },
  { provider_service_id: "ig-st-views-highlight", platform: "instagram", category: "Views", name: "Instagram Highlight Views", provider_rate: 0.000008, min: 10, max: 50000 },
  { provider_service_id: "ig-st-views-video-slow", platform: "instagram", category: "Views", name: "Instagram Video Views | Slow Start", provider_rate: 0.000007, min: 10, max: 100000 },
  { provider_service_id: "tt-st-views-video", platform: "tiktok", category: "Views", name: "TikTok Video Views", provider_rate: 0.000006, min: 10, max: 200000 },
  { provider_service_id: "tt-st-views-live", platform: "tiktok", category: "Views", name: "TikTok Live Views", provider_rate: 0.000007, min: 10, max: 50000 },
  { provider_service_id: "tt-st-likes", platform: "tiktok", category: "Likes", name: "TikTok Likes", provider_rate: 0.00002, min: 10, max: 50000 },
  { provider_service_id: "tt-st-followers", platform: "tiktok", category: "Followers", name: "TikTok Followers | Real", provider_rate: 0.00005, min: 10, max: 10000 },
  { provider_service_id: "tt-st-comments", platform: "tiktok", category: "Comments", name: "TikTok Comments", provider_rate: 0.00045, min: 10, max: 1000 },
  { provider_service_id: "tt-st-shares", platform: "tiktok", category: "Shares", name: "TikTok Shares", provider_rate: 0.00003, min: 10, max: 5000 },
  { provider_service_id: "tt-st-visits", platform: "tiktok", category: "Visits", name: "TikTok Profile Visits", provider_rate: 0.000006, min: 10, max: 20000 },
  { provider_service_id: "tt-st-impressions", platform: "tiktok", category: "Other", name: "TikTok Impressions", provider_rate: 0.000004, min: 10, max: 200000 },
  { provider_service_id: "yt-st-views-video", platform: "youtube", category: "Views", name: "YouTube Video Views", provider_rate: 0.00001, min: 10, max: 100000 },
  { provider_service_id: "yt-st-views-shorts", platform: "youtube", category: "Views", name: "YouTube Shorts Views", provider_rate: 0.000008, min: 10, max: 150000 },
  { provider_service_id: "yt-st-likes", platform: "youtube", category: "Likes", name: "YouTube Likes", provider_rate: 0.00003, min: 10, max: 20000 },
  { provider_service_id: "yt-st-subscribers", platform: "youtube", category: "Subscribers", name: "YouTube Subscribers", provider_rate: 0.00007, min: 10, max: 5000 },
  { provider_service_id: "yt-st-comments", platform: "youtube", category: "Comments", name: "YouTube Comments", provider_rate: 0.0005, min: 10, max: 1000 },
  { provider_service_id: "yt-st-shares", platform: "youtube", category: "Shares", name: "YouTube Shares", provider_rate: 0.00003, min: 10, max: 5000 },
  { provider_service_id: "yt-st-watchtime", platform: "youtube", category: "Other", name: "YouTube Watch Time (minutes)", provider_rate: 0.000006, min: 10, max: 100000 },
  { provider_service_id: "yt-st-impressions", platform: "youtube", category: "Other", name: "YouTube Impressions", provider_rate: 0.000004, min: 10, max: 200000 },
].map((s) => ({ ...s, active: true, is_demo: true, ai_score: 70, created_at: now }));

let starterAdded = 0;
for (const s of STARTER_SERVICES) {
  const { count } = await sb.from("services").select("id", { count: "exact", head: true }).eq("provider_service_id", s.provider_service_id);
  if (!count) {
    const { error } = await sb.from("services").insert(s);
    if (!error) starterAdded++;
  }
}
console.log(`✅ Starter demo services added: ${starterAdded} (${STARTER_SERVICES.length} in set)`);

console.log("🎉 Seed complete.");
