import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const PROVIDER_URL = Deno.env.get("PROVIDER_API_URL") || "";
const PROVIDER_KEY = Deno.env.get("PROVIDER_API_KEY") || "";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

const MOCK_POOL = [
  { provider_service_id: "mig-followers", name: "Instagram Followers | 100% Real (Non Drop)", rate: 0.003, min: 50, max: 50000, platform: "instagram" },
  { provider_service_id: "mig-likes", name: "Instagram Likes | High Quality - No Drop", rate: 0.0022, min: 50, max: 20000, platform: "instagram" },
  { provider_service_id: "mig-views", name: "Instagram Video Views | Instant", rate: 0.0008, min: 100, max: 100000, platform: "instagram" },
  { provider_service_id: "mig-comments", name: "Instagram Comments | Custom", rate: 0.008, min: 10, max: 2000, platform: "instagram" },
  { provider_service_id: "mig-reels", name: "Instagram Reels Views | High Retention", rate: 0.0012, min: 100, max: 50000, platform: "instagram" },
  { provider_service_id: "mtt-followers", name: "TikTok Followers | Real Active", rate: 0.004, min: 30, max: 30000, platform: "tiktok" },
  { provider_service_id: "mtt-likes", name: "TikTok Likes | No Drop", rate: 0.0018, min: 50, max: 20000, platform: "tiktok" },
  { provider_service_id: "mtt-views", name: "TikTok Views | Instant", rate: 0.0006, min: 100, max: 200000, platform: "tiktok" },
  { provider_service_id: "mtt-shares", name: "TikTok Shares | Real", rate: 0.005, min: 20, max: 5000, platform: "tiktok" },
  { provider_service_id: "myt-subscribers", name: "YouTube Subscribers | Slow Start", rate: 0.028, min: 20, max: 10000, platform: "youtube" },
  { provider_service_id: "myt-views", name: "YouTube Views | High Quality", rate: 0.0025, min: 100, max: 100000, platform: "youtube" },
  { provider_service_id: "myt-likes", name: "YouTube Likes | 100% Real", rate: 0.009, min: 20, max: 10000, platform: "youtube" },
  { provider_service_id: "myt-watch", name: "YouTube Watch Hours | Real", rate: 0.015, min: 10, max: 5000, platform: "youtube" },
  { provider_service_id: "myt-comments", name: "YouTube Comments | Custom Text", rate: 0.012, min: 10, max: 3000, platform: "youtube" },
];

function platformForId(id: string): string {
  if (id.startsWith("mtt")) return "tiktok";
  if (id.startsWith("myt")) return "youtube";
  return "instagram";
}

async function fetchServices() {
  if (!PROVIDER_URL || !PROVIDER_KEY) return MOCK_POOL;
  const body = new URLSearchParams({ key: PROVIDER_KEY, action: "services" });
  const res = await fetch(PROVIDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  const list: any[] = Array.isArray(data?.result) ? data.result : Array.isArray(data) ? data : [];
  return list
    .filter((s) => s && s.service != null)
    .map((s) => ({
      provider_service_id: String(s.service),
      name: String(s.name || "Service " + s.service),
      rate: Number(s.rate || 0),
      min: Number(s.min || 1),
      max: Number(s.max || 100000),
      platform: platformForId(String(s.service)),
    }));
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  let services: Awaited<ReturnType<typeof fetchServices>>;
  try {
    services = await fetchServices();
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { "Content-Type": "application/json" } });
  }

  let upserted = 0;
  for (const s of services) {
    const { error } = await sb.from("services").upsert(
      {
        provider_service_id: s.provider_service_id,
        platform: s.platform,
        name: s.name,
        provider_rate: s.rate,
        markup_percent: 30,
        min: s.min,
        max: s.max,
        active: true,
        ai_score: 0,
      },
      { onConflict: "provider_service_id" }
    );
    if (!error) upserted++;
  }

  return new Response(JSON.stringify({ ok: true, fetched: services.length, upserted }), { headers: { "Content-Type": "application/json" } });
});
