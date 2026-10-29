import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  STAY_SIGNED_IN_COOKIE,
  staySignedInEnabled,
  sessionMaxAge,
} from "@/lib/sessionCookie";

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/:path*"],
};

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Enforce read-only impersonation: when an admin is impersonating a user
  // (wazeo-impersonating cookie set), every non-safe HTTP method on /api is
  // blocked except the explicit exit route. Impersonation is view-only.
  if (request.nextUrl.pathname.startsWith("/api")) {
    const method = request.method;
    const impersonating = request.cookies.get("wazeo-impersonating")?.value;
    const isSafe = method === "GET" || method === "HEAD" || method === "OPTIONS";
    const isExit = request.nextUrl.pathname === "/api/admin/users/impersonate/exit";
    if (impersonating && !isSafe && !isExit) {
      return NextResponse.json(
        { error: "Impersonation is read-only. Write actions are disabled." },
        { status: 403 }
      );
    }
  }

  // Only authenticated pages run the session/auth checks below; API routes pass
  // through after the impersonation guard.
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/dashboard") && !path.startsWith("/admin")) {
    return response;
  }

  const stay = staySignedInEnabled(
    request.cookies.get(STAY_SIGNED_IN_COOKIE)?.value
  );
  const maxAge = sessionMaxAge(stay);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              ...(maxAge ? { maxAge } : {}),
            })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // ENFORCE email verification: unconfirmed users cannot open any protected page.
  if (!user.email_confirmed_at) {
    const url = request.nextUrl.clone();
    url.pathname = "/verify-email";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Admin 2FA enforcement (server-side). Only applies once an admin has opted in.
  if (path.startsWith("/admin") && !path.startsWith("/admin/2fa")) {
    try {
      const { data: tf } = await supabase
        .from("admin_2fa")
        .select("enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (tf?.enabled) {
        const ok2fa = request.cookies.get(`wazeo-2fa-ok-${user.id}`)?.value === "1";
        if (!ok2fa) {
          const url = request.nextUrl.clone();
          url.pathname = "/admin/2fa";
          url.searchParams.set("next", path);
          return NextResponse.redirect(url);
        }
      }
    } catch {
      // never block access on a 2FA lookup error
    }
  }

  if (path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, banned")
      .eq("id", user.id)
      .single();

    if (profile?.banned) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("error", "banned");
      return NextResponse.redirect(url);
    }
    void profile;
  }

  return response;
}
