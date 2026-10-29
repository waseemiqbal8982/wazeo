import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Public-safe price list: active services only, real provider+markup pricing
// converted to USD (the client converts to the display currency).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform") || "";
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();

  const admin = createAdminClient();
  let query = admin
    .from("services")
    .select("id, name, platform, category, provider_rate, markup_percent, min, max, is_demo")
    .eq("active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (platform && ["instagram", "tiktok", "youtube"].includes(platform)) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []).map((s) => {
    const rate = Number(s.provider_rate || 0);
    const markup = Number(s.markup_percent || 0);
    const price = rate * (1 + markup / 100);
    return {
      id: s.id,
      name: s.name,
      platform: s.platform,
      category: s.category,
      min: Number(s.min || 0),
      max: Number(s.max || 0),
      usd: Math.round(price * 100000) / 100000,
      demo: Boolean(s.is_demo),
    };
  });

  const filtered = q
    ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
    : rows;

  return NextResponse.json({ services: filtered, total: filtered.length });
}
