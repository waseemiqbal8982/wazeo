import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  STAY_SIGNED_IN_COOKIE,
  staySignedInEnabled,
  sessionMaxAge,
} from "@/lib/sessionCookie";

export async function createClient() {
  const cookieStore = await cookies();
  const stay = staySignedInEnabled(
    cookieStore.get(STAY_SIGNED_IN_COOKIE)?.value
  );
  const maxAge = sessionMaxAge(stay);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(maxAge ? { maxAge } : {}),
              })
            );
          } catch {
            // called from a Server Component — safe to ignore
          }
        },
      },
    }
  );
}
