"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import { THEMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useShell, User } from "./shell-context";

export function TopBar({ user }: { user: User }) {
  const router = useRouter();
  const { balance } = useShell();
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user.role === "admin";

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[#0b0b14]/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <div className="lg:hidden"><Logo size={28} /></div>
        <Link href="/dashboard" className="hidden text-sm font-semibold text-[var(--text-muted)] lg:block">
          Good to see you, {user.username ?? "guest"} 👋
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.03] px-3 py-1 text-sm font-semibold">
          <span className="text-[var(--accent)]">$</span>
          {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>

        <div className="relative">
          <button
            onClick={() => { setThemeOpen((v) => !v); setMenuOpen(false); }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white/[0.03] transition-colors hover:bg-white/[0.06]"
            aria-label="Theme"
          >
            <span className="h-4 w-4 rounded-full" style={{ background: "var(--accent)" }} />
          </button>
          {themeOpen && (
            <div className="absolute right-0 top-11 w-40 rounded-xl border border-[var(--border)] bg-[#12121f] p-2 shadow-xl">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                    theme === t.id ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-white/[0.05]"
                  )}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: t.hex }} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative lg:hidden">
          <button
            onClick={() => { setMenuOpen((v) => !v); setThemeOpen(false); }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white"
          >
            {(user.username || "U").slice(0, 1).toUpperCase()}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 w-52 rounded-xl border border-[var(--border)] bg-[#12121f] p-2 shadow-xl">
              {isAdmin && (
                <Link href="/admin" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-white/[0.05]">Admin</Link>
              )}
              <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-white/[0.05]">Settings</Link>
              <button onClick={signOut} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
