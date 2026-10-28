import { createAdminClient } from "./supabase/admin";
import { rankProviders } from "./routerLogic.mjs";
import type { RouterProviderInput } from "./routerLogic.d.mts";

export interface RoutingCandidate {
  providerId: string;
  name: string;
}

export interface PickResult {
  ranked: any[];
  candidates: RoutingCandidate[];
  reason: "ok" | "no_provider";
}

// Load eligible providers and rank them for a given required cost.
// Guarantees: an underfunded provider never appears in `candidates`.
export async function pickBestProvider(opts: {
  requiredCost: number;
  providers?: any[];
}): Promise<PickResult> {
  const admin = createAdminClient();
  let providers = opts.providers;

  if (!providers) {
    const { data } = await admin
      .from("providers")
      .select("*")
      .eq("status", "active")
      .eq("active", true);
    providers = data || [];
  }

  const ranked = rankProviders(providers as RouterProviderInput[], opts.requiredCost);

  return {
    ranked,
    candidates: ranked.map((p) => ({
      providerId: String(p.id),
      name: String(p.name || p.id),
    })),
    reason: ranked.length ? "ok" : "no_provider",
  };
}
