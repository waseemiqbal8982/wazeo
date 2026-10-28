"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import { THEMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useShell, User } from "./shell-context";
import { useCurrency } from "@/lib/currency-store";
import { CURRENCIES, currencyInfo, formatLocalized } from "@/lib/currencies";
import { countryFlag, countryName } from "@/lib/countries";

export function TopBar({ user }: { user: User }) {
  const router = useRouter();
  const { balance } = useShell();
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(false);

  const { currency, rates, setCurrency, fmt } = useCurrency();

  useEffect(() => {
    fetch("/api/meta/admin-access")
      .then((r) => r.json())
      .then((d) => setHasAdmin(!!d?.admin))
      .catch(() => {});
  }, []);

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
        <div className="relative">
          <button
            onClick={() => { setWalletOpen((v) => !v); setThemeOpen(false); setMenuOpen(false); }}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.03] px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-white/[0.06]"
            aria-label="Currency / wallet"
          >
            <span className="text-[var(--accent)]">{currencyInfo(currency).symbol}</span>
            <span>{fmt(balance)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {walletOpen && (
            <div className="absolute right-0 top-11 w-56 rounded-xl border border-[var(--border)] bg-[#12121f] p-2 shadow-xl">
              {Object.values(CURRENCIES).map((c) => (
                <button
                  key={c.code}
                  onClick={() => { setCurrency(c.code); setWalletOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors",
                    currency === c.code ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-white/[0.05]"
                  )}
                >
                  <span className="flex items-center gap-2"><span>{c.flag}</span>{c.code}</span>
                  <span className="text-xs text-[var(--text-muted)]">{formatLocalized(balance, c.code, rates)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.03] py-1 pl-1 pr-3 lg:flex">
          {user.country ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-base">{countryFlag(user.country)}</span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">{(user.username || "U").slice(0, 1).toUpperCase()}</span>
          )}
          <div className="leading-tight">
            <p className="text-xs font-medium">{user.country ? `${countryName(user.country)} · ${user.username}` : user.username}</p>
            <p className="max-w-[140px] truncate text-[11px] text-[var(--text-muted)]">{user.email || ""}</p>
          </div>
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
              {user.email && (
                <p className="mb-1 truncate border-b border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">{user.email}</p>
              )}
              {hasAdmin && (
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
