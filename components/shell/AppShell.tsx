"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { User, ShellCtx } from "@/components/dashboard/shell-context";
import { useCurrency } from "@/lib/currency-store";
import { CURRENCIES, currencyInfo, formatLocalized } from "@/lib/currencies";
import { useTheme } from "@/components/ThemeProvider";
import { THEMES } from "@/lib/constants";
import { useI18n, LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { Select } from "@/components/ui/Select";

/* ------------------------------------------------------------------ */
/* Icons (inline SVG path `d` strings — one per menu item)             */
/* ------------------------------------------------------------------ */
const P = {
  home: "M3 12l9-9 9 9M5 10v10h14V10",
  wall: "M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5",
  order: "M12 5v14M5 12h14",
  overview: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  users: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  orders: "M4 6h16M4 12h16M4 18h10",
  tickets: "M4 6h16v10H8l-4 4V6z",
  services: "M4 7h16M4 12h16M4 17h16",
  providers: "M12 8a4 4 0 100 8 4 4 0 000-8zM2 12h4M18 12h4M12 2v4M12 18v4",
  payments: "M3 6h18v12H3zM3 10h18M7 15h4",
  coupons: "M12 3l2.33 4.24 4.67.9-3.2 3.5.7 4.86L12 14.5l-4.5 2 .7-4.86L5 8.14l4.67-.9L12 3z",
  announcements: "M12 3a9 9 0 00-9 9v6h18v-6a9 9 0 00-9-9zM9 22h6",
  cms: "M4 5h16v14H4zM8 9h8M8 13h5",
  keys: "M7 3h10v8H7zM12 11v3M10 14h4M12 14v5",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  translations: "M5 8h14M5 12h14M5 16h9M12 4l-2 16",
  system: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41",
  support: "M4 6h16v10H8l-4 4V6z",
  more: "",
  wza: "M10 2h4a8 8 0 018 8v4a8 8 0 01-8 8h-4a8 8 0 01-8-8v-4a8 8 0 018-8z",
};

export interface NavLink {
  href: string;
  label: string;
  icon: string;
}
export interface NavGroup {
  title: string;
  items: NavLink[];
}

/* ------------------------------------------------------------------ */
/* Navigation configs                                                   */
/* ------------------------------------------------------------------ */
export const CUSTOMER_NAV: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: P.home },
  { href: "/dashboard/new-order", label: "New Order", icon: P.order },
  { href: "/dashboard/orders", label: "Orders", icon: P.orders },
  { href: "/dashboard/add-funds", label: "Add Funds", icon: P.wall },
  { href: "/dashboard/services", label: "Services", icon: P.services },
  { href: "/dashboard/tickets", label: "Tickets", icon: P.tickets },
  { href: "/dashboard/settings", label: "Settings", icon: P.settings },
  { href: "/support", label: "Support", icon: P.support },
];

export const CUSTOMER_BOTTOM = [
  { href: "/dashboard", label: "Home", icon: P.home },
  { href: "/dashboard/new-order", label: "New Order", icon: P.order },
  { href: "/dashboard/orders", label: "Orders", icon: P.orders },
  { href: "/dashboard/add-funds", label: "Wallet", icon: P.wall },
];

export const ADMIN_GROUPS: NavGroup[] = [
  { title: "Main", items: [
    { href: "/admin", label: "Overview", icon: P.overview },
    { href: "/admin/users", label: "Users", icon: P.users },
    { href: "/admin/orders", label: "Orders", icon: P.orders },
    { href: "/admin/tickets", label: "Tickets", icon: P.tickets },
  ] },
  { title: "Catalog", items: [
    { href: "/admin/services", label: "Services & Categories", icon: P.services },
    { href: "/admin/providers", label: "Providers", icon: P.providers },
  ] },
  { title: "Finance", items: [
    { href: "/admin/payments", label: "Payments", icon: P.payments },
    { href: "/admin/coupons", label: "Coupons & Loyalty", icon: P.coupons },
  ] },
  { title: "Content", items: [
    { href: "/admin/announcements", label: "Announcements", icon: P.announcements },
    { href: "/admin/cms", label: "Pages & FAQ", icon: P.cms },
  ] },
  { title: "Manage", items: [
    { href: "/admin/keys", label: "Access Keys", icon: P.keys },
    { href: "/admin/settings", label: "Settings", icon: P.settings },
    { href: "/admin/translations", label: "Translations", icon: P.translations },
    { href: "/admin/system", label: "System", icon: P.system },
    { href: "/admin/plugins", label: "Plugins", icon: P.system },
  ] },
];

export const ADMIN_BOTTOM = [
  { href: "/admin", label: "Overview", icon: P.overview },
  { href: "/admin/orders", label: "Orders", icon: P.orders },
  { href: "/admin/users", label: "Users", icon: P.users },
  { href: "/admin/payments", label: "Payments", icon: P.payments },
];

export const ADMIN_LINKS = ADMIN_GROUPS.flatMap((g) => g.items);

function DIcon({ d, className }: { d: string; className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}


export function AppShell({
  user,
  mode = "customer",
  children,
}: {
  user: User;
  mode?: "customer" | "admin";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [balance, setBalance] = useState(user.balance);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [walletOpen, setWalletOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme, setTheme, mode: themeMode, setMode } = useTheme();
  const { currency, rates, setCurrency, fmt } = useCurrency();
  const { lang, setLang } = useI18n();

  useEffect(() => {
    if (mode === "admin") return;
    fetch("/api/meta/admin-access")
      .then((r) => r.json())
      .then((d) => setHasAdmin(!!d?.admin))
      .catch(() => {});
  }, [mode]);

  // every route change closes open menus
  useEffect(() => {
    setSheetOpen(false);
    setRailOpen(false);
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  const isAdmin = mode === "admin" || user.role === "admin";
  const bottom = isAdmin ? ADMIN_BOTTOM : CUSTOMER_BOTTOM;
  const groups: NavGroup[] = isAdmin ? ADMIN_GROUPS : [{ title: "Menu", items: CUSTOMER_NAV }];

  const allLinks = isAdmin ? ADMIN_LINKS : CUSTOMER_NAV;
  const crumb = allLinks.find((l) => isActive(pathname, l.href))?.label || (isAdmin ? "Admin" : "Dashboard");

  const searchResults = q.trim()
    ? allLinks.filter((l) => l.label.toLowerCase().includes(q.trim().toLowerCase()))
    : [];

  const langSwitcher = (
    <Select
      aria-label="Language"
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      options={(Object.keys(LANGS) as Lang[]).map((code) => ({ value: code, label: LANGS[code].label }))}
      className="w-full"
    />
  );


  return (
    <ShellCtx.Provider value={{ balance, setBalance }}>
      <div className="flex min-h-screen">

        {/* ---------- DESKTOP SIDEBAR (lg+) ---------- */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-[#0d0d18]/80 p-3 backdrop-blur-xl lg:flex">
          <Link href={isAdmin ? "/admin" : "/dashboard"} className="mb-5 flex items-center gap-2 px-2">
            <Logo size={28} />
            <span className="text-lg font-bold">Wazeo</span>
          </Link>
          <nav className="flex-1 space-y-3 overflow-y-auto">
            {groups.map((g) => (
              <div key={g.title}>
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{g.title}</p>
                <div className="space-y-0.5">
                  {g.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                        isActive(pathname, item.href)
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text)]"
                      )}
                    >
                      <DIcon d={item.icon} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                  {!isAdmin && hasAdmin && (
                    <Link
                      href="/admin"
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                        pathname.startsWith("/admin")
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text)]"
                      )}
                    >
                      <DIcon d={P.overview} />
                      Admin
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                {(user.username || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.username}</p>
                <p className="text-xs text-[var(--text-muted)]">{fmt(balance)}</p>
              </div>
              <button onClick={signOut} className="text-[var(--text-muted)] hover:text-[var(--text)]" aria-label="Sign out">
                <DIcon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </button>
            </div>
          </div>
        </aside>

        {/* ---------- TABLET ICON RAIL (md..lg) ---------- */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col items-center border-r border-[var(--border)] bg-[#0d0d18]/85 py-3 backdrop-blur-xl md:flex lg:hidden">
          <Link href={isAdmin ? "/admin" : "/dashboard"} className="mb-5">
            <Logo size={28} />
          </Link>
          <div className="flex flex-1 flex-col items-center overflow-y-auto">
            {groups.flatMap((g) => g.items).map((item) => (
              <button
                key={item.href}
                onClick={() => setRailOpen(true)}
                title={item.label}
                className={cn(
                  "mb-1 flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                  isActive(pathname, item.href)
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-[var(--text)]"
                )}
              >
                <DIcon d={item.icon} />
              </button>
            ))}
          </div>
          <button onClick={signOut} className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-white/[0.05]" aria-label="Sign out">
            <DIcon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </button>
        </aside>

        {/* tablet expand panel */}
        <AnimatePresence>
          {railOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRailOpen(false)}
              />
              <motion.aside
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
                className="fixed inset-y-0 left-0 z-50 w-64 border-r border-[var(--border)] bg-[#0d0d18] p-3 lg:hidden"
              >
                <div className="mb-4 flex items-center justify-between px-2">
                  <span className="text-base font-bold">Wazeo</span>
                  <button onClick={() => setRailOpen(false)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/[0.05]" aria-label="Close menu">
                    <DIcon d="M18 6L6 18M6 6l12 12" />
                  </button>
                </div>
                <div className="max-h-[calc(100vh-6rem)] flex-1 space-y-3 overflow-y-auto">
                  {groups.map((g) => (
                    <div key={g.title}>
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{g.title}</p>
                      <div className="space-y-0.5">
                        {g.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setRailOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                              isActive(pathname, item.href)
                                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                                : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text)]"
                            )}
                          >
                            <DIcon d={item.icon} />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ---------- MAIN COLUMN (header + content) ---------- */}
        <div className="flex min-h-screen flex-1 flex-col md:pl-16 lg:pl-60">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[var(--border)] bg-[#0b0b14]/85 px-4 backdrop-blur-xl lg:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Link href={isAdmin ? "/admin" : "/dashboard"} className="md:hidden">
                <Logo size={26} />
              </Link>
              <span className="truncate text-sm font-semibold text-[var(--text-muted)]">{crumb}</span>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="hidden items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.03] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:border-[var(--accent)] sm:inline-flex"
                >
                  <DIcon d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35" />
                  <span className="hidden lg:inline">Search</span>
                  <kbd className="rounded bg-white/[0.06] px-1 text-[10px]">Ctrl K</kbd>
                </button>
              )}

              {/* wallet / currency */}
              <div className="relative">
                <button
                  onClick={() => { setWalletOpen((v) => !v); setMenuOpen(false); }}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.03] px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-white/[0.06]"
                  aria-label="Currency / wallet"
                >
                  <span className="text-[var(--accent)]">{currencyInfo(currency).symbol}</span>
                  <span>{fmt(balance)}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                <AnimatePresence>
                  {walletOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-11 z-40 w-56 rounded-xl border border-[var(--border)] bg-[#12121f] p-2 shadow-xl"
                    >
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
                          <span className="text-xs text-[var(--text-muted)]">{formatLocalized(balance, currency, rates)}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* theme (desktop/tablet) */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => { setThemeOpen((v) => !v); setMenuOpen(false); setWalletOpen(false); }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white/[0.03] transition-colors hover:bg-white/[0.06]"
                  aria-label="Theme"
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: "var(--accent)" }} />
                </button>
                <AnimatePresence>
                  {themeOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-11 z-40 w-40 rounded-xl border border-[var(--border)] bg-[#12121f] p-2 shadow-xl"
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* user menu */}
              <div className="relative">
                <button
                  onClick={() => { setMenuOpen((v) => !v); setWalletOpen(false); setThemeOpen(false); }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white"
                  aria-label="Account menu"
                >
                  {(user.username || "U").slice(0, 1).toUpperCase()}
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-[var(--border)] bg-[#12121f] p-2 shadow-xl"
                    >
                      {user.email && <p className="mb-1 truncate border-b border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">{user.email}</p>}
                      <label className="px-1 pt-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Language</label>
                      {langSwitcher}
                      {!isAdmin && hasAdmin && (
                        <Link href="/admin" onClick={() => setMenuOpen(false)} className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-white/[0.05]">Admin</Link>
                      )}
                      <Link href={isAdmin ? "/admin/settings" : "/dashboard/settings"} onClick={() => setMenuOpen(false)} className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-white/[0.05]">Settings</Link>
                      <button onClick={signOut} className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10">Sign out</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28 lg:px-6 lg:pb-10">
            {children}
          </main>
        </div>

        {/* ---------- PHONE BOTTOM BAR (<md) ---------- */}
        <div
          className="fixed inset-x-0 bottom-0 z-30 md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <nav className="flex items-center gap-1 rounded-t-2xl border-t border-[var(--border-strong)] bg-[#12121f]/95 px-2 py-1.5 backdrop-blur-xl">
            {bottom.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex min-w-[52px] flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
                  isActive(pathname, item.href) ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                )}
              >
                <DIcon d={item.icon} />
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => setSheetOpen(true)}
              className={cn(
                "relative flex min-w-[52px] flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
                sheetOpen ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              )}
            >
              <DIcon d="M5 12h.01M12 12h.01M19 12h.01" />
              More
            </button>
          </nav>
        </div>

        {/* ---------- PHONE MORE BOTTOM SHEET (<md) ---------- */}
        <AnimatePresence>
          {sheetOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSheetOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-[var(--border-strong)] bg-[#12121f] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:hidden"
              >
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--text-muted)]">Menu</p>
                  <button onClick={() => setSheetOpen(false)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/[0.05]" aria-label="Close">
                    <DIcon d="M18 6L6 18M6 6l12 12" />
                  </button>
                </div>

                <div className="space-y-3">
                  {groups.map((g) => (
                    <div key={g.title}>
                      <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{g.title}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {g.items.map((item) => (
                          <Link key={item.href} href={item.href} onClick={() => setSheetOpen(false)}>
                            <div className={cn(
                              "flex h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-1 py-2 text-center text-xs font-medium transition-colors",
                              isActive(pathname, item.href)
                                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                                : "border-[var(--border)] bg-white/[0.03] text-[var(--text)] hover:bg-white/[0.06]"
                            )}>
                              <span className="text-[var(--accent)]"><DIcon d={item.icon} /></span>
                              <span className="leading-tight">{item.label}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Preferences</p>
                  <div className="space-y-2">
                    {langSwitcher}
                    <div className="flex flex-wrap gap-1.5">
                      {Object.values(CURRENCIES).map((c) => (
                        <button
                          key={c.code}
                          onClick={() => setCurrency(c.code)}
                          className={cn(
                            "flex h-10 items-center gap-1 rounded-xl border px-3 text-sm transition-colors",
                            currency === c.code ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)]"
                          )}
                        >
                          <span>{c.flag}</span>{c.code}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setMode("dark")}
                        className={cn(
                          "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                          themeMode === "dark" ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)]"
                        )}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
                        Dark
                      </button>
                      <button
                        onClick={() => setMode("light")}
                        className={cn(
                          "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                          themeMode === "light" ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)]"
                        )}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
                        Light
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                            theme === t.id ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)]"
                          )}
                        >
                          <span className="h-3 w-3 rounded-full" style={{ background: t.hex }} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={signOut} className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300">
                    Sign out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* search modal (admin) */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[#12121f] p-4 shadow-xl"
              >
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Type to find a page…"
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white/[0.03] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--accent)] focus:outline-none"
                />
                <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                  {q.trim() === "" ? (
                    <p className="text-sm text-[var(--text-muted)]">Type to search pages.</p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No page found.</p>
                  ) : (
                    searchResults.map((r) => (
                      <Link key={r.href} href={r.href} onClick={() => { setSearchOpen(false); setQ(""); }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/[0.05]">
                        <DIcon d={r.icon} />
                        {r.label}
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ShellCtx.Provider>
  );
}









