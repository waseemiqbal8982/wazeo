import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { providerGetServices, isMockMode } from "@/lib/provider";
import { heuristicServiceScore } from "@/lib/ai";

export const dynamic = "force-dynamic";

function detectPlatform(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("instagram") || n.includes("ig ")) return "instagram";
  if (n.includes("tiktok") || n.includes("tiktok") || n.includes("likee")) return "tiktok";
  if (n.includes("youtube") || n.includes("yt ") || n.includes("subscribers")) return "youtube";
  return "instagram";
}

const CATEGORY_KEYWORDS: [string, string][] = [
  ["followers", "Followers"],
  ["subscribers", "Subscribers"],
  ["likes", "Likes"],
  ["views", "Views"],
  ["comments", "Comments"],
  ["shares", "Shares"],
  ["reactions", "Reactions"],
  ["watch", "Watch Time"],
  ["visits", "Visits"],
];

function detectCategory(name: string): string {
  const n = name.toLowerCase();
  for (const [kw, cat] of CATEGORY_KEYWORDS) {
    if (n.includes(kw)) return cat;
  }
  return "Other";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const admin = createAdminClient();

  // global markup
  const { data: settings } = await admin.from("settings").select("*");
  const markupMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]));
  const globalMarkup = Number(markupMap.markup_percent || 30);

  let services;
  try {
    services = await providerGetServices();
  } catch (e) {
    return NextResponse.json({ error: `Provider error: ${String(e)}` }, { status: 502 });
  }

  const rows = services.map((s) => ({
    provider_service_id: s.provider_service_id,
    name: s.name,
    platform: detectPlatform(s.name),
    category: detectCategory(s.name),
    provider_rate: s.rate,
    markup_percent: globalMarkup,
    min: s.min,
    max: s.max,
    active: true,
    ai_score: heuristicServiceScore(s.rate, s.min, s.max),
  }));

  const { error } = await admin.from("services").upsert(rows, { onConflict: "provider_service_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: rows.length, mock: isMockMode() });
}
