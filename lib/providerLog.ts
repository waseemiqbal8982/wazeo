import { createAdminClient } from "./supabase/admin";

export interface ProviderLogInput {
  provider_id?: string | null;
  action: string;
  ok: boolean;
  http_status?: number | null;
  retries?: number;
  duration_ms?: number;
  error?: string | null;
  response_masked?: string | null;
}

// Server-side, best-effort logger. Never throws.
// `response_masked` is meant to hold a truncated and scrubbed response
// (secrets/keys removed) — never raw API keys.
export async function logProviderCall(input: ProviderLogInput) {
  try {
    const admin = createAdminClient();
    await admin.from("provider_logs").insert({
      provider_id: input.provider_id ?? null,
      action: input.action,
      ok: input.ok,
      http_status: input.http_status ?? null,
      retries: input.retries ?? 0,
      duration_ms: input.duration_ms ?? null,
      error: input.error ?? null,
      response_masked: input.response_masked ?? null,
    });
  } catch {
    // logging must never break the main flow
  }
}

// Scrubs a provider JSON response for safe storage (truncate + drop key fields).
export function maskResponse(data: unknown): string {
  try {
    const str = JSON.stringify(data);
    if (!str) return "";
    const scrubbed = str.replace(/("(?:key|apikey|api_key|token|secret)"\s*:\s*")[^"]*(")/gi, "$1••••••••$2");
    return scrubbed.length > 2000 ? scrubbed.slice(0, 2000) + "…" : scrubbed;
  } catch {
    return "";
  }
}
