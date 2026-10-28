import { getSettingInt, getSettingJson } from "./settings";

export interface MarkupContext {
  // Per-provider default markup (lowest non-global fallback).
  providerMarkup?: number | null;
  // User tier (profiles.tier) — optional.
  tier?: string | null;
  // Service platform, e.g. "instagram".
  platform?: string | null;
  // Per-service override — wins over everything.
  serviceOverride?: number | null;
}

// Effective panel markup precedence (highest wins):
//   service > platform > tier > provider > global
export async function resolveMarkup(ctx: MarkupContext): Promise<number> {
  const { serviceOverride, platform, tier, providerMarkup } = ctx;

  if (serviceOverride != null && Number.isFinite(serviceOverride)) {
    return serviceOverride;
  }

  const platformMap = await getSettingJson<Record<string, number>>(
    "markup_platform_json",
    {}
  );
  if (platform && typeof platformMap[platform] === "number") {
    return platformMap[platform];
  }

  const tierMap = await getSettingJson<Record<string, number>>("markup_tier_json", {});
  if (tier && typeof tierMap[tier] === "number") {
    return tierMap[tier];
  }

  if (providerMarkup != null && Number.isFinite(providerMarkup)) {
    return providerMarkup;
  }

  return getSettingInt("markup_global", 30);
}
