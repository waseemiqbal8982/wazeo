import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
            response.cookies.set(name, value, options)
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

  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin")) {
    const { data: profile, error } = await supabase
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
    // Access control (email allowlist + role) is enforced in the admin layout,
    // which renders a 404 for anyone not on the ADMIN_EMAILS allowlist.
    void path; void error;
  }

  return response;
}
