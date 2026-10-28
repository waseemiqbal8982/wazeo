"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { User } from "./shell-context";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  more?: boolean;
}

const I = {
  home: <path d="M3 12l9-9 9 9M5 10v10h14V10" />,
  order: <path d="M12 5v14M5 12h14" />,
  wallet: <path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" />,
  overview: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
  users: <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  payments: <path d="M3 6h18v12H3zM3 10h18M7 15h4" />,
  more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  services: <path d="M4 7h16M4 12h16M4 17h16" />,
  tickets: <path d="M4 6h16v10H8l-4 4V6z" />,
  settings: <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />,
  support: <path d="M4 6h16v10H8l-4 4V6z" />,
};

function icon(path: React.ReactNode) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}

function buildItems(isAdmin: boolean): NavItem[] {
  if (isAdmin) {
    return [
      { href: "/admin", label: "Overview", icon: icon(I.overview) },
      { href: "/admin/orders", label: "Orders", icon: icon(I.order) },
      { href: "/admin/users", label: "Users", icon: icon(I.users) },
      { href: "/admin/payments", label: "Payments", icon: icon(I.payments) },
      { href: "#more", label: "More", icon: icon(I.more), more: true },
    ];
  }
  return [
    { href: "/dashboard", label: "Home", icon: icon(I.home) },
    { href: "/dashboard/new-order", label: "New Order", icon: icon(I.order) },
    { href: "/dashboard/orders", label: "Orders", icon: icon(I.order) },
    { href: "/dashboard/add-funds", label: "Wallet", icon: icon(I.wallet) },
    { href: "#more", label: "More", icon: icon(I.more), more: true },
  ];
}

function moreItems(isAdmin: boolean): { href: string; label: string; icon: React.ReactNode }[] {
  const base = [
    { href: "/dashboard/services", label: "Services", icon: icon(I.services) },
    { href: "/dashboard/tickets", label: "Tickets", icon: icon(I.tickets) },
    { href: "/dashboard/settings", label: "Settings", icon: icon(I.settings) },
    { href: "/support", label: "Support", icon: icon(I.support) },
  ];
  if (isAdmin) {
    return [
      { href: "/admin/services", label: "Services", icon: icon(I.services) },
      { href: "/admin/tickets", label: "Tickets", icon: icon(I.tickets) },
      { href: "/admin/settings", label: "Settings", icon: icon(I.settings) },
      { href: "/support", label: "Support", icon: icon(I.support) },
    ];
  }
  return base;
}

export function MobileNav({ pathname, user }: { pathname: string; user?: User | null }) {
  const isAdmin = user?.role === "admin";
  const items = buildItems(isAdmin);
  const more = moreItems(isAdmin);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        setInputFocused(true);
      }
    };
    const onFocusOut = () => setInputFocused(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-200 lg:hidden",
          inputFocused && "translate-y-full"
        )}
      >
        <nav className="flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[#12121f]/85 px-2 py-1.5 shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {items.map((item) => {
            const active = !item.more && (pathname === item.href || pathname.startsWith(item.href + "/"));
            if (item.more) {
              return (
                <motion.button
                  key="more"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setSheetOpen(true)}
                  className={cn(
                    "relative flex min-w-[52px] flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-medium transition-colors",
                    sheetOpen ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                  )}
                >
                  {item.icon}
                  {item.label}
                </motion.button>
              );
            }
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  className={cn(
                    "relative flex min-w-[52px] flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-medium transition-colors",
                    active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="mob-active"
                      className="absolute -bottom-0.5 h-1 w-6 rounded-full bg-[var(--accent)] shadow-[0_0_12px_2px_var(--glow)]"
                    />
                  )}
                  {item.icon}
                  {item.label}
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              ref={sheetRef}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-[var(--border-strong)] bg-[#12121f] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
              <p className="mb-3 text-sm font-semibold text-[var(--text-muted)]">More</p>
              <div className="grid grid-cols-3 gap-2">
                {more.map((m) => (
                  <Link key={m.href} href={m.href} onClick={() => setSheetOpen(false)}>
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/[0.03] px-2 py-3 text-xs font-medium transition-colors hover:bg-white/[0.06]">
                      <span className="text-[var(--accent)]">{m.icon}</span>
                      {m.label}
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
