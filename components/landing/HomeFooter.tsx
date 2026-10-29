"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/lib/platformIcons";
import type { HomeTickerItem, HomeData } from "@/lib/home-data";

/* ---------------- Trust section (true statements only) ---------------- */

export function TrustSection({ support }: { support: HomeData["support"] }) {
  const tgLink = support.telegram ? (/^https?:\/\//.test(support.telegram) ? support.telegram : `https://t.me/${support.telegram.replace(/^@/, "")}`) : "";
  const waLink = support.whatsapp ? `https://wa.me/${support.whatsapp.replace(/\D/g, "")}` : "";

  return (
    <section className="mx-auto max-w-6xl px-4 pt-16" id="trust">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Trust & safety</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <div className="text-2xl">🔒</div>
          <h3 className="mt-3 text-base font-semibold">Secure & private</h3>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            HTTPS everywhere, passwords stored encrypted, and no public exposure of your personal data.
          </p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-2xl">🛡️</div>
          <h3 className="mt-3 text-base font-semibold">Clear policies</h3>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            <Link href="/refund-policy" className="text-[var(--accent)]">Refund policy</Link> and{" "}
            <Link href="/privacy" className="text-[var(--accent)]">privacy policy</Link> are always available.
          </p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-2xl">📞</div>
          <h3 className="mt-3 text-base font-semibold">Real support channels</h3>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            {support.workingHours ? <>Hours: {support.workingHours} ({support.workingTz || "local"})</> : "Available 24/7"}.
          </p>
          {(waLink || tgLink || support.email) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent)]">
                  <span className="text-emerald-400"><PlatformIcon id="instagram" size={14} /></span> WhatsApp
                </a>
              )}
              {tgLink && (
                <a href={tgLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent)]">
                  <span className="text-sky-400"><PlatformIcon id="telegram" size={14} /></span> Telegram
                </a>
              )}
              {support.email && (
                <a href={`mailto:${support.email}`} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent)]">
                  ✉️ Email
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ accordion (editable from Admin > Content) ---------------- */

export function FaqSection({ faqs }: { faqs: HomeData["faqs"] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-3xl px-4 pt-16" id="faq">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">FAQ</h2>
      <div className="mt-8 space-y-3">
        {faqs.length === 0 && (
          <p className="text-center text-sm text-[var(--text-muted)]">No FAQ entries yet — the admin can add some.</p>
        )}
        {faqs.map((f, i) => (
          <div key={f.id} className="glass overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={open === i}
            >
              <span className="text-sm font-semibold sm:text-base">{f.q}</span>
              <span className={cn("shrink-0 text-[var(--accent)] transition-transform duration-200", open === i ? "rotate-45" : "")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="px-5 pb-5 text-sm text-[var(--text-muted)]">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Real-activity ticker ---------------- */

export function TickerBar({ items }: { items: HomeTickerItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-16 overflow-hidden border-y border-[var(--border)] bg-white/[0.02]">
      <div className="animate-marquee flex w-max items-center gap-4 whitespace-nowrap" aria-hidden="true">
        {[...items, ...items].map((it, i) => (
          <span key={i} className="flex items-center gap-2 py-3 text-sm text-[var(--text-muted)]">
            <span className="text-[var(--accent)]"><PlatformIcon id={it.platform} size={16} /></span>
            Order completed: {it.label} · {it.minutesAgo} min ago
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Footer ---------------- */

export function HomeFooter() {
  const cols = [
    { title: "Product", links: [{ l: "Services", h: "/services" }, { l: "Pricing", h: "/pricing" }, { l: "How it works", h: "/how-it-works" }, { l: "Order Tracker", h: "/tracker" }, { l: "API Documentation", h: "/api-docs" }] },
    { title: "Company", links: [{ l: "About", h: "/about" }, { l: "FAQ", h: "/faq" }, { l: "Support", h: "/support" }, { l: "Owner", h: "/owner" }] },
    { title: "Legal", links: [{ l: "Terms", h: "/terms" }, { l: "Privacy", h: "/privacy" }, { l: "Refund Policy", h: "/refund-policy" }] },
  ];
  return (
    <footer className="mt-16 border-t border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center"><Logo size={34} showText /></Link>
            <p className="mt-3 max-w-xs text-sm text-[var(--text-muted)]">
              Gradual delivery for Instagram, TikTok and YouTube. Draw your own curve and grow naturally.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <LanguageSwitcher />
              <CurrencySwitcher />
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h3 className="text-sm font-semibold">{c.title}</h3>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.h}>
                    <Link href={l.h} className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">{l.l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] pt-6 sm:flex-row">
          <p className="text-sm text-[var(--text-muted)]">© {new Date().getFullYear()} Wazeo. All rights reserved.</p>
          <p className="text-xs text-[var(--text-muted)]">Gradual delivery · Not affiliated with Instagram, TikTok or YouTube.</p>
        </div>
      </div>
    </footer>
  );
}
