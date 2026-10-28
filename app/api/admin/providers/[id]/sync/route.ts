import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { adapterForProvider } from "@/lib/providerRegistry";
import { heuristicServiceScore } from "@/lib/ai";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function detectPlatform(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("instagram") || n.includes("ig ")) return "instagram";
  if (n.includes("tiktok") || n.includes("likee")) return "tiktok";
  if (n.includes("youtube") || n.includes("yt ") || n.includes("subscribers")) return "youtube";
  return "other";
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

export async function POST(_req: Request, ctx: Ctx) {
  const adminOk = await isAdminUser();
  if (adminOk !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { id } = await ctx.params;
  const admin = createAdminClient();
  const { data: p } = await admin.from("providers").select("*").eq("id", id).single();
  if (!p) return NextResponse.json({ error: "Provider not found." }, { status: 404 });

  const adapter = adapterForProvider(p);

  let services;
  try {
    services = await adapter.getServices();
  } catch (e) {
    return NextResponse.json({ error: `Provider error: ${String(e)}` }, { status: 502 });
  }

  // Detect changes relative to what we already have.
  const { data: existingRows } = await admin
    .from("provider_services")
    .select("provider_service_id, rate, name")
    .eq("provider_id", id);
  const existingMap = new Map((existingRows || []).map((r) => [r.provider_service_id, r]));

  const providerMarkup = Number(p.markup_pct) != null ? Number(p.markup_pct) : 30;

  const rows = services.map((s) => ({
    provider_id: id,
    provider_service_id: s.provider_service_id,
    name: s.name,
    platform: detectPlatform(s.name),
    type: detectCategory(s.name),
    rate: s.rate,
    min: s.min,
    max: s.max,
    refill: Boolean(s.refill),
    cancel: Boolean(s.cancel),
    quality_score: heuristicServiceScore(s.rate, s.min, s.max),
    enabled: true,
    raw_json: JSON.stringify(s),
  }));

  const upserted = await admin
    .from("provider_services")
    .upsert(rows, { onConflict: "provider_id,provider_service_id" });

  if (upserted.error) {
    return NextResponse.json({ error: upserted.error.message }, { status: 500 });
  }

  // Mark removed services as disabled (soft, non-destructive).
  const seen = new Set(rows.map((r) => r.provider_service_id));
  const removed = (existingRows || []).filter((r) => !seen.has(r.provider_service_id));
  for (const r of removed) {
    await admin.from("provider_services").update({ enabled: false }).eq("provider_id", id).eq("provider_service_id", r.provider_service_id);
  }

  const changes = {
    added: rows.filter((r) => !existingMap.has(r.provider_service_id)).length,
    removed: removed.length,
    rateChanged: rows.filter((r) => {
      const e = existingMap.get(r.provider_service_id);
      return e && Number(e.rate) !== Number(r.rate);
    }).length,
  };

  return NextResponse.json({
    ok: true,
    providerId: id,
    count: rows.length,
    changes,
    mock: adapter.config.format === "mock",
  });
}
