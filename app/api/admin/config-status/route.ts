import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/adminAuth";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Admin-only integration health/status report.
 * Reports only *whether* each integration is configured and healthy — never
 * values/secrets. Used to diagnose "API keys not working" at a glance.
 */
export async function GET() {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const en = (name: string) => {
    const v = process.env[name];
    return Boolean(v && String(v).trim().length > 0);
  };

  const supabaseUrl = en("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = en("SUPABASE_SERVICE_ROLE_KEY");
  const dbUrl = en("SUPABASE_DB_URL");

  // Provider: configured via env OR via the providers table.
  let dbProviders = 0;
  let dbProviderKeys = 0;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("providers").select("id, api_key_enc, api_key, active");
    dbProviders = (data || []).length;
    dbProviderKeys = (data || []).filter((p) => p.api_key_enc || p.api_key).length;
  } catch {
    /* db may be unreachable; report provider env only */
  }

  const integrations = {
    supabase: {
      configured: supabaseUrl && serviceRole,
      url: supabaseUrl,
      service_role: serviceRole,
      db: dbUrl,
      note: supabaseUrl && serviceRole && dbUrl ? "Fully configured." : "Missing one or more Supabase env vars.",
    },
    license: {
      configured: serviceRole,
      service_role: serviceRole,
      note: serviceRole
        ? "License validation/binding uses the service-role key (RLS bypass) — operational."
        : "SUPABASE_SERVICE_ROLE_KEY is NOT set → license activation is disabled (keys would appear invalid). Add it in Vercel env.",
    },
    smm_provider: {
      configured: en("PROVIDER_API_URL") && en("PROVIDER_API_KEY"),
      env_url: en("PROVIDER_API_URL"),
      env_key: en("PROVIDER_API_KEY"),
      db_providers: dbProviders,
      db_provider_keys: dbProviderKeys,
      mode: en("PROVIDER_API_URL") && en("PROVIDER_API_KEY") ? "live" : "mock",
      note: "When not configured, the app safely falls back to MOCK mode for order delivery.",
    },
    mercury_ai: {
      configured: en("MERCURY_BASE_URL") && en("MERCURY_API_KEY") && en("MERCURY_MODEL"),
      base_url: en("MERCURY_BASE_URL"),
      api_key: en("MERCURY_API_KEY"),
      model: en("MERCURY_MODEL"),
      note: "When not configured, AI assistant features fall back to heuristics / are disabled.",
    },
    admin: {
      configured: en("ADMIN_EMAILS"),
      note: en("ADMIN_EMAILS") ? "Admin allowlist present." : "No ADMIN_EMAILS — /admin is locked.",
    },
    cron: {
      configured: en("CRON_SECRET"),
      note: en("CRON_SECRET") ? "Cron secret present." : "Missing CRON_SECRET.",
    },
    encryption: {
      configured: en("PROVIDER_ENC_KEY"),
      note: en("PROVIDER_ENC_KEY")
        ? "Provider API keys are encrypted at rest with a real key."
        : "PROVIDER_ENC_KEY not set — dev fallback key in use (set in production).",
    },
  };

  return NextResponse.json({ ok: true, integrations, ts: new Date().toISOString() });
}
