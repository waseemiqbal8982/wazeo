import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Returns login-method availability for the sign-in screen.
//  - configured: the provider's OAuth client keys are filled in.
//  - enabled:    the admin turned the method ON in Settings → Login methods
//    (all social providers default OFF; "Email and password" defaults ON).
export async function GET() {
  let config: Record<string, { configured: boolean; enabled: boolean }> = {
    google: { configured: false, enabled: false },
    twitter: { configured: false, enabled: false },
    github: { configured: false, enabled: false },
  };
  let emailPassword = true;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("settings").select("key, value").in("key", [
      "oauth_google_client_id",
      "oauth_twitter_client_id",
      "oauth_github_client_id",
      "login_google_enabled",
      "login_twitter_enabled",
      "login_github_enabled",
      "login_email_password_enabled",
    ]);
    const map: Record<string, string> = {};
    (data || []).forEach((s) => { map[s.key] = s.value || ""; });
    config = {
      google: {
        configured: Boolean(map.oauth_google_client_id),
        enabled: map.login_google_enabled === "true",
      },
      twitter: {
        configured: Boolean(map.oauth_twitter_client_id),
        enabled: map.login_twitter_enabled === "true",
      },
      github: {
        configured: Boolean(map.oauth_github_client_id),
        enabled: map.login_github_enabled === "true",
      },
    };
    emailPassword = map.login_email_password_enabled !== "false";
  } catch {
    // fall through with defaults
  }
  return NextResponse.json({ ...config, emailPassword });
}
