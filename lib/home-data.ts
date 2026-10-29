import { createAdminClient } from "./supabase/admin";
import { getSettingJson } from "./settings";

/**
 * Server-only data loader for the public home page.
 * Uses the service-role client so RLS never blocks public reads,
 * but only ever returns aggregated / anonymized / approved data.
 */

export interface HomeStats {
  orders: number;
  services: number;
  platforms: number;
  supports: number; // support hours (24 if unset)
}

export interface HomeServiceMin {
  platform: string;
  label: string;
  fromUsd: number | null; // lowest active price (USD)
}

export interface HomeReview {
  id: string;
  display: string;
  rating: number;
  text: string;
  link?: string | null;
}

export interface HomeTickerItem {
  platform: string;
  label: string;
  minutesAgo: number;
}

export interface HomeContent {
  heroTitle: string;
  heroSubtitle: string;
  ctaStart: string;
  ctaPrices: string;
  howTitle: string;
  featuresTitle: string;
  showHero: boolean;
  showStats: boolean;
  showHow: boolean;
  showServices: boolean;
  showFeatures: boolean;
  showDemo: boolean;
  showReviews: boolean;
  showTrust: boolean;
  showFaq: boolean;
  showTicker: boolean;
}

export interface HomeData {
  stats: HomeStats;
  thresholds: { orders: number; services: number; platforms: number; supports: number };
  services: HomeServiceMin[];
  reviews: HomeReview[];
  reviewsAvg: number | null; // only set when >=5 approved
  ticker: HomeTickerItem[];
  content: HomeContent;
  support: {
    whatsapp: string;
    telegram: string;
    email: string;
    workingHours: string;
    workingTz: string;
    welcome: string;
  };
  faqs: { id: string; q: string; a: string }[];
}

const DEFAULT_CONTENT: HomeContent = {
  heroTitle: "Grow on Instagram, TikTok & YouTube with gradual delivery.",
  heroSubtitle:
    "Wazeo delivers your orders slowly and naturally over time. Draw your own curve, watch the graph live, and keep your growth looking organic.",
  ctaStart: "Get started",
  ctaPrices: "View prices",
  howTitle: "How it works",
  featuresTitle: "Why Wazeo",
  showHero: true,
  showStats: true,
  showHow: true,
  showServices: true,
  showFeatures: true,
  showDemo: true,
  showReviews: true,
  showTrust: true,
  showFaq: true,
  showTicker: true,
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export async function getHomeData(): Promise<HomeData> {
  const admin = createAdminClient();
  const content = await getSettingJson<Partial<HomeContent>>("home_content", {});
  const thresholds = await getSettingJson<{ orders: number; services: number; platforms: number; supports: number }>(
    "counter_thresholds",
    { orders: 100, services: 3, platforms: 0, supports: 0 }
  );

  // Counts (real, from DB)
  const [{ count: orders }, { count: services }] = await Promise.all([
    admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("services").select("id", { count: "exact", head: true }).eq("active", true),
  ]);

  // Lowest active price per platform (from real service data, USD)
  const { data: svc } = await admin
    .from("services")
    .select("platform, provider_rate, markup_percent, run_min")
    .eq("active", true);

  const priceMap: Record<string, { price: number } | null> = {
    instagram: null,
    tiktok: null,
    youtube: null,
  };
  if (svc) {
    for (const s of svc) {
      if (!s.platform || !(s.platform in priceMap)) continue;
      const rate = Number(s.provider_rate || 0);
      const markup = Number(s.markup_percent || 0);
      const price = rate * (1 + markup / 100);
      const cur = priceMap[s.platform];
      if (!cur || price < cur.price) priceMap[s.platform] = { price };
    }
  }
  const servicesMin = Object.entries(PLATFORM_LABEL).map(([platform, label]) => ({
    platform,
    label,
    fromUsd: priceMap[platform]?.price ?? null,
  }));

  // Approved reviews (real only)
  const { data: reviews } = await admin
    .from("reviews")
    .select("id, rating, text, author_display, link")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(24);

  const approved: HomeReview[] = (reviews || []).map((r) => ({
    id: r.id,
    rating: Number(r.rating || 0),
    text: r.text || "",
    link: r.link || null,
    display:
      r.author_display ||
      (r.author_display ? r.author_display : "Verified customer"),
  }));

  let reviewsAvg: number | null = null;
  if (approved.length >= 5) {
    reviewsAvg = Math.round((approved.reduce((s, r) => s + r.rating, 0) / approved.length) * 10) / 10;
  }

  // Real-activity ticker: completed orders in the last 7 days (anonymized)
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const { data: recent } = await admin
    .from("orders")
    .select("created_at, service_id, services(platform)")
    .eq("status", "completed")
    .gte("created_at", weekAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(30);

  let ticker: HomeTickerItem[] = [];
  if (recent && recent.length >= 10) {
    ticker = recent.map((o) => {
      const platform = (o.services as unknown as { platform?: string } | null)?.platform || "instagram";
      return {
        platform,
        label: PLATFORM_LABEL[platform] || platform,
        minutesAgo: Math.max(1, Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000)),
      };
    });
  }

  // FAQ (active, from admin-editable faqs table)
  const { data: faqs } = await admin
    .from("faqs")
    .select("id, question, answer")
    .eq("active", true)
    .order("sort", { ascending: true })
    .limit(20);

  // Support settings
  const support = {
    whatsapp: (await getSettingJson("support_whatsapp", "")) || "",
    telegram: (await getSettingJson("support_telegram", "")) || "",
    email: (await getSettingJson("support_email", "")) || "",
    workingHours: (await getSettingJson("working_hours", "")) || "",
    workingTz: (await getSettingJson("working_tz", "UTC")) || "UTC",
    welcome: (await getSettingJson("support_welcome", "")) || "",
  };

  return {
    stats: {
      orders: orders || 0,
      services: services || 0,
      platforms: 3,
      supports: support.workingHours ? 0 : 24,
    },
    thresholds: { ...thresholds },
    services: servicesMin,
    reviews: approved,
    reviewsAvg,
    ticker,
    content: { ...DEFAULT_CONTENT, ...content },
    support,
    faqs: (faqs || []).map((f) => ({ id: f.id, q: f.question, a: f.answer })),
  };
}
