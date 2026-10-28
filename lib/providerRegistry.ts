import { createAdminClient } from "./supabase/admin";
import { decryptSecret } from "./crypto";
import { createAdapter } from "./providerAdapter";
import type { ProviderAdapter, ProviderConfig } from "./providerAdapter";

export interface DbProvider {
  id: string;
  name: string;
  api_url: string | null;
  api_key: string | null;
  api_key_enc: string | null;
  api_format?: string | null;
  currency?: string;
  balance?: number;
  balance_at?: string | null;
  balance_stale?: boolean;
  status?: string;
  active?: boolean;
  concurrency_cap?: number;
  [key: string]: unknown;
}

export async function listProviders(opts: { onlyActive?: boolean } = {}): Promise<DbProvider[]> {
  const admin = createAdminClient();
  let q = admin.from("providers").select("*");
  if (opts.onlyActive) {
    q = q.eq("active", true).eq("status", "active");
  }
  const { data } = await q.order("priority", { ascending: true });
  return (data || []) as DbProvider[];
}

// Build an adapter for a stored provider row (decrypts its API key server-side).
export function adapterForProvider(p: DbProvider): ProviderAdapter {
  const apiKey = p.api_key_enc ? decryptSecret(p.api_key_enc) : p.api_key || "";
  const fmt = p.api_format || (apiKey ? "smm_v2" : "mock");
  const cfg: ProviderConfig = {
    id: p.id,
    name: p.name,
    baseUrl: p.api_url || "",
    apiKey,
    format: fmt === "smm_v2" || fmt === "mock" ? fmt : "smm_v2",
    concurrencyCap: Number(p.concurrency_cap) || 5,
  };
  return createAdapter(cfg);
}

export async function getAdapters(opts: { onlyActive?: boolean } = {}) {
  const rows = await listProviders(opts);
  return rows.map((provider) => ({ provider, adapter: adapterForProvider(provider) }));
}
