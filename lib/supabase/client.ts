import { createBrowserClient } from "@supabase/ssr";
import {
  STAY_SIGNED_IN_COOKIE,
  SESSION_MAX_AGE,
  staySignedInEnabled,
} from "@/lib/sessionCookie";

export function createClient() {
  // "Stay signed in" is ON by default -> long-lived auth cookies (~400 days).
  // If the user explicitly opted out (cookie value "0"), fall back to session cookies.
  let stay = true;
  if (typeof document !== "undefined") {
    const m = document.cookie.match(
      new RegExp(`(?:^|; )${STAY_SIGNED_IN_COOKIE}=([^;]*)`)
    );
    stay = staySignedInEnabled(m ? m[1] : null);
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      ...(stay ? { cookieOptions: { maxAge: SESSION_MAX_AGE } } : {}),
    }
  );
}
