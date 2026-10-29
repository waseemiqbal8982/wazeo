import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  let config: Record<string, boolean> = { google: false, twitter: false, github: false };
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("settings").select("key, value").in("key", [
      "oauth_google_client_id",
      "oauth_twitter_client_id",
      "oauth_github_client_id",
    ]);
    const map: Record<string, string> = {};
    (data || []).forEach((s) => { map[s.key] = s.value || ""; });
    config = {
      google: Boolean(map.oauth_google_client_id),
      twitter: Boolean(map.oauth_twitter_client_id),
      github: Boolean(map.oauth_github_client_id),
    };
  } catch {
    // fall through with defaults
  }
  return NextResponse.json(config);
}
