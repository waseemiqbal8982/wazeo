"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { NAV, User } from "./shell-context";

export function Sidebar({ user, pathname }: { user: User; pathname: string }) {
  const router = useRouter();
  const isAdmin = user.role === "admin";

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-[#0d0d18]/80 p-4 backdrop-blur-xl lg:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
        <Logo size={30} />
        <span className="text-lg font-bold">Wazeo</span>
      </Link>
      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text)]"
              )}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              pathname.startsWith("/admin")
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text)]"
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z" />
            </svg>
            Admin
          </Link>
        )}
      </nav>
      <div className="border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
            {(user.username || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.username}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(user.balance)}
            </p>
          </div>
          <button onClick={signOut} className="ml-auto text-[var(--text-muted)] hover:text-[var(--text)]" aria-label="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
