"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export function Hero() {
  const { t } = useI18n();
  return (
    <>
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-5">
        <Link href="/" aria-label="Wazeo home">
          <Logo size={34} showText />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:block" />
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">{t("nav.signin")}</Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">{t("nav.signup")}</Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16">
        <section className="pt-14 text-center sm:pt-20">
          <h1 className="mx-auto max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("landing.hero.title").replace("Wazeo", "")} <span className="text-gradient">Wazeo</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[var(--text-muted)] sm:text-lg">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" full>{t("landing.cta_start")}</Button>
            </Link>
            <Link href="/sign-in" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" full>{t("landing.cta_login")}</Button>
            </Link>
          </div>

          <div className="mx-auto mt-12 flex max-w-md items-center justify-center gap-4">
            {[
              { label: t("platform.instagram"), icon: "IG" },
              { label: t("platform.tiktok"), icon: "TT" },
              { label: t("platform.youtube"), icon: "YT" },
            ].map((p) => (
              <div key={p.label} className="glass flex items-center gap-2 rounded-xl px-3.5 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                  {p.icon}
                </span>
                <span className="text-xs font-medium sm:text-sm">{p.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
