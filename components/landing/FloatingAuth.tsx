"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Mobile-only floating Sign in / Dashboard button. Placed bottom-left so it
 *  never overlaps the support ContactFab (bottom-right). */
export function FloatingAuth() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session))
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-40",
        "md:hidden" // desktop already has header buttons
      )}
    >
      <Link
        href={signedIn ? "/dashboard" : "/sign-in"}
        className="flex h-12 items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_var(--glow)] active:scale-[0.97]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {signedIn ? (
            <path d="M4 6h16M4 12h16M4 18h10" />
          ) : (
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
          )}
        </svg>
        {signedIn ? "Dashboard" : "Sign in"}
      </Link>
    </div>
  );
}
