"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
  { href: "/support", label: "Support" },
];

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export function HomeHeader() {
  const [open, setOpen] = useState(false);
  const { modePref, setMode } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  const cycleMode = () =>
    setMode(modePref === "dark" ? "light" : modePref === "light" ? "auto" : "dark");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-colors duration-300",
          scrolled ? "glass-strong border-b border-[var(--border)]" : "bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Wazeo home" className="tap-target flex items-center">
            <Logo size={34} showText />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleMode}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] md:h-10 md:w-10"
              aria-label={`Color scheme: ${modePref}`}
              title={`Color scheme: ${modePref}`}
            >
              {modePref === "dark" ? (
                <SunIcon />
              ) : modePref === "light" ? (
                <MoonIcon />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              )}
            </button>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <div className="hidden sm:block">
              <CurrencySwitcher />
            </div>
            <Link href="/sign-in" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up" className="hidden sm:block">
              <Button size="sm">Get started</Button>
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] md:hidden"
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex h-16 items-center justify-between px-4">
              <Logo size={34} showText />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)]"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {NAV.map((n, i) => (
                  <motion.div
                    key={n.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.25 }}
                  >
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-4 text-lg font-semibold transition-colors hover:bg-white/[0.04]"
                    >
                      {n.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="mt-6 flex items-center gap-3">
                <LanguageSwitcher className="w-full" />
              </div>
              <div className="mt-3">
                <CurrencySwitcher />
              </div>
            </div>
            <div className="border-t border-[var(--border)] p-6">
              <div className="grid grid-cols-2 gap-3">
                <Link href="/sign-in" onClick={() => setOpen(false)}>
                  <Button variant="outline" full size="lg">Sign in</Button>
                </Link>
                <Link href="/sign-up" onClick={() => setOpen(false)}>
                  <Button full size="lg">Get started</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
