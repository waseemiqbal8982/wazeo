import type { HomeData } from "./home-data";

export const EMPTY_HOME: HomeData = {
  stats: { orders: 0, services: 0, platforms: 3, supports: 24 },
  thresholds: { orders: 100, services: 3, platforms: 0, supports: 0 },
  services: [
    { platform: "instagram", label: "Instagram", fromUsd: null },
    { platform: "tiktok", label: "TikTok", fromUsd: null },
    { platform: "youtube", label: "YouTube", fromUsd: null },
  ],
  reviews: [],
  reviewsAvg: null,
  ticker: [],
  content: {
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
  },
  support: { whatsapp: "", telegram: "", email: "", workingHours: "", workingTz: "UTC", welcome: "" },
  faqs: [],
};
