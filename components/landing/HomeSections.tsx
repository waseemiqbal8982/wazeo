"use client";

import Link from "next/link";
import { CountUp } from "@/components/ui/CountUp";
import { useCurrency } from "@/lib/currency-store";
import { PlatformIcon } from "@/lib/platformIcons";
import type { HomeStats, HomeServiceMin, HomeContent, HomeData } from "@/lib/home-data";

/* ---------------- Live numbers (animated count-up) ---------------- */

export function StatsSection({ stats, thresholds }: { stats: HomeStats; thresholds: HomeData["thresholds"] }) {
  const items = [
    { label: "Orders completed", value: stats.orders, min: thresholds.orders, suffix: "" },
    { label: "Active services", value: stats.services, min: thresholds.services, suffix: "" },
    { label: "Supported platforms", value: stats.platforms, min: thresholds.platforms, suffix: "" },
    { label: "Support", value: stats.supports, min: thresholds.supports, suffix: stats.supports >= 24 ? "/7" : "h" },
  ];

  const visible = items.filter((it) => it.value >= it.min);

  if (visible.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4" aria-label="Live numbers">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {visible.map((it) => (
          <div key={it.label} className="glass rounded-2xl p-5 text-center">
            <div className="text-3xl font-extrabold text-[var(--accent)] sm:text-4xl">
              <CountUp value={it.value} formatter={(n) => Math.round(n).toLocaleString()} />
              <span>{it.suffix}</span>
            </div>
            <div className="mt-1.5 text-xs font-medium text-[var(--text-muted)] sm:text-sm">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */

const STEPS = [
  { t: "1. Choose a service", d: "Pick a platform and the exact service you want — views, likes, followers and more." },
  { t: "2. Set time & curve", d: "Choose how long delivery should take and pick a growth curve, or draw your own." },
  { t: "3. Watch it grow", d: "Sit back while your order is delivered gradually, with a live graph to follow." },
];

export function HowSection({ content }: { content: HomeContent }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16" id="how">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">{content.howTitle}</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.t} className="glass relative rounded-2xl p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">{i + 1}</span>
            <h3 className="mt-4 text-base font-semibold">{s.t}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Why gradual delivery ---------------- */

export function WhyGradualSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16" id="why-gradual">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Why gradual delivery?</h2>
      <div className="mx-auto mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-[var(--text-muted)]">
        <p>
          When an order is delivered in one sudden burst, it looks unusual on a real account.
          Real growth happens over time — in small waves aligned with when people are active.
        </p>
        <p>
          Gradual delivery spreads your order across the duration you choose. It looks natural,
          is easier to spread, and gives you a graph you can watch rather than a single jump.
        </p>
        <p>
          Wazeo lets you pick a curve and even draw your own, so delivery follows the shape you want.
          We don&apos;t promise specific results or claim to be undetectable — we just deliver the
          honest way: slowly, steadily, and under your control.
        </p>
      </div>
    </section>
  );
}

/* ---------------- Services showcase ---------------- */

export function ServicesSection({ services }: { services: HomeServiceMin[] }) {
  const { fmt } = useCurrency();
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16" id="services">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Services</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[var(--text-muted)]">
        Real prices from our service listings. Pick a platform to see everything it offers.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {services.map((s) => (
          <Link
            key={s.platform}
            href={`/services?platform=${s.platform}`}
            className="glass group flex flex-col items-center rounded-2xl p-6 text-center transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_var(--glow)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <PlatformIcon id={s.platform} size={30} />
            </span>
            <h3 className="mt-4 text-lg font-semibold">{s.label}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {s.fromUsd != null ? <>From <span className="font-semibold text-[var(--text)]">{fmt(s.fromUsd)}</span></> : "Prices on request"}
            </p>
            <span className="mt-4 text-sm font-semibold text-[var(--accent)]">Browse →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Feature grid (honest) ---------------- */

const FEATURES = [
  { icon: "📈", t: "Drip-feed delivery", d: "Deliver slowly with a draw-your-own curve — never a suspicious sudden burst." },
  { icon: "🕹️", t: "Draw your own curve", d: "Shape delivery exactly how you want with a visual curve editor." },
  { icon: "📊", t: "Live order tracking graph", d: "Watch your order grow in real time with a chart." },
  { icon: "🌍", t: "Five languages", d: "English, Urdu, Hindi, French and Chinese." },
  { icon: "💱", t: "Multiple currencies", d: "Pay in USD, INR, PKR or CNY." },
  { icon: "🕑", t: "24/7 support", d: "Real support channels, with hours shown on the site." },
  { icon: "🔐", t: "Secure sign-in", d: "Passwords stored encrypted; HTTPS everywhere." },
  { icon: "🧩", t: "API access", d: "Integrate with our /api/v2 endpoint." },
  { icon: "♻️", t: "Refill", d: "Where the service supports it, get refills." },
];

export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16" id="features">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Why Wazeo</h2>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.t} className="glass rounded-2xl p-5">
            <div className="text-2xl">{f.icon}</div>
            <h3 className="mt-3 text-base font-semibold">{f.t}</h3>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
