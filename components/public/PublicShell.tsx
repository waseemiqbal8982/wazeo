"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";

export function PublicShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Mobile back button (44px tap target) + home link */}
      <div className="fixed left-4 top-4 z-40 md:hidden">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] glass-strong text-[var(--text)] active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>

      <header className="sticky top-0 z-30 border-b border-[var(--border)] glass-strong">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Wazeo home" className="flex items-center">
            <Logo size={32} showText />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="hidden sm:block"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/sign-up" className="hidden sm:block"><Button size="sm">Get started</Button></Link>
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <CurrencySwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <nav className="text-sm text-[var(--text-muted)]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--accent)]">Home</Link>{" "}
          <span className="mx-1">/</span>
          <span className="text-[var(--text)]">{title}</span>
        </nav>
        <h1 className="mt-3 text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
