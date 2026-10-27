import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only client. Prefers the service role (secret) key.
// If the secret is not configured, falls back to the anon key so the
// app still works — but cross-user admin features need the real secret.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
