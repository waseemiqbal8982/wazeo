"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/lib/i18n";

export function Sections() {
  const { t } = useI18n();
  return (
    <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16">
      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          { title: t("features.drip.title"), desc: t("features.drip.desc") },
          { title: t("features.fast.title"), desc: t("features.fast.desc") },
          { title: t("features.support.title"), desc: t("features.support.desc") },
        ].map((f) => (
          <Card key={f.title} glow interactive className="p-6">
            <h3 className="text-base font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{f.desc}</p>
          </Card>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-bold">{t("landing.hero.title").split(" ")[0]} · 3 steps</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", tt: t("how.step1.t"), d: t("how.step1.d") },
            { n: "2", tt: t("how.step2.t"), d: t("how.step2.d") },
            { n: "3", tt: t("how.step3.t"), d: t("how.step3.d") },
          ].map((s) => (
            <div key={s.n} className="glass rounded-2xl p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-3 text-sm font-semibold">{s.tt}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-bold">FAQ</h2>
        <div className="mx-auto mt-6 max-w-2xl space-y-3">
          {[1, 2, 3].map((i) => (
            <details key={i} className="glass rounded-xl px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">{t(`faq.q${i}`)}</summary>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{t(`faq.a${i}`)}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mt-16 border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-sm text-[var(--text-muted)]">© {new Date().getFullYear()} {t("app.name")}</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/terms" className="text-[var(--text-muted)] hover:text-[var(--accent)]">{t("footer.terms")}</Link>
            <Link href="/refund-policy" className="text-[var(--text-muted)] hover:text-[var(--accent)]">{t("footer.refund")}</Link>
            <Link href="/sign-in" className="text-[var(--text-muted)] hover:text-[var(--accent)]">{t("footer.signin")}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
