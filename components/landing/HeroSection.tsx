"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PlatformIcon } from "@/lib/platformIcons";
import {
  CURVE_IDS,
  CURVE_LABELS,
  pointsToPath,
  useMorphCurve,
  type CurveId,
} from "./curve";
import type { HomeContent } from "@/lib/home-data";

const MORPH_MS = 800;
const CYCLE_MS = 3200;

function PlatformChip({ id, label }: { id: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.03] px-4 py-2.5">
      <span className="text-[var(--accent)]">
        <PlatformIcon id={id} size={20} />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function HeroSection({ content }: { content: HomeContent }) {
  const [phase, setPhase] = useState(0);
  const target: CurveId = CURVE_IDS[phase % CURVE_IDS.length];
  const pts = useMorphCurve(target, MORPH_MS);
  const line = pointsToPath(pts, 320, 120, 8);
  const area = line ? `${line} L312,112 L8,112 Z` : "";

  useEffect(() => {
    const id = setInterval(() => setPhase((p) => p + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* decorative glow / floating shapes */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[24rem] w-[34rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }} />
      <div className="pointer-events-none absolute top-32 -left-10 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, var(--accent-2), transparent 70%)" }} />
      <div className="pointer-events-none absolute top-64 -right-16 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, var(--accent-2), transparent 70%)" }} />

      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-14 text-center sm:pt-20">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          {content.heroTitle}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--text-muted)] sm:text-lg">
          {content.heroSubtitle}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/sign-up" className="w-full sm:w-auto">
            <Button size="lg" full>{content.ctaStart}</Button>
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" full>{content.ctaPrices}</Button>
          </Link>
        </div>

        {/* Animated example delivery curve */}
        <div className="relative mx-auto mt-12 max-w-md">
          <div className="glass rounded-2xl p-4 text-left shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Example delivery curve
              </span>
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
                {CURVE_LABELS[target]}
              </span>
            </div>
            <svg viewBox="0 0 320 120" className="w-full" role="img" aria-label={`Delivery curve shape: ${CURVE_LABELS[target]}`}>
              <defs>
                <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M8,8 L312,8 L312,112 L8,112 Z" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
              <path d={area} fill="url(#heroArea)" />
              <path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8" cy="112" r="2.5" fill="var(--accent)" />
              <circle cx="312" cy="8" r="2.5" fill="var(--accent)" />
            </svg>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          <PlatformChip id="instagram" label="Instagram" />
          <PlatformChip id="tiktok" label="TikTok" />
          <PlatformChip id="youtube" label="YouTube" />
        </div>
      </div>
    </section>
  );
}
