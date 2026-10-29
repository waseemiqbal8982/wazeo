"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CURVE_IDS,
  CURVE_LABELS,
  pointsToPath,
  useMorphCurve,
  type CurveId,
} from "./curve";
import type { HomeReview } from "@/lib/home-data";

/* ---------------- Delivery demo (interactive example) ---------------- */

export function DemoSection() {
  const [curve, setCurve] = useState<CurveId>("steady");
  const [duration, setDuration] = useState(24); // hours
  const pts = useMorphCurve(curve, 400);
  const line = pointsToPath(pts, 320, 120, 8);
  const area = line ? `${line} L312,112 L8,112 Z` : "";

  return (
    <section className="mx-auto max-w-6xl px-4 pt-16" id="demo">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Try the delivery preview</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[var(--text-muted)]">
        This is an example preview — it doesn&apos;t place an order. Drag the duration and pick a curve to see how delivery would look.
      </p>

      <div className="glass mx-auto mt-8 max-w-2xl rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Delivery curve</span>
          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">{CURVE_LABELS[curve]}</span>
        </div>
        <svg viewBox="0 0 320 120" className="mt-3 w-full" role="img" aria-label="Delivery curve preview">
          <defs>
            <linearGradient id="demoArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M8,8 L312,8 L312,112 L8,112 Z" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
          <path d={area} fill="url(#demoArea)" />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Duration</span>
            <span className="font-semibold text-[var(--accent)]">{duration} hours</span>
          </div>
          <input
            type="range"
            min={1}
            max={72}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--accent)]"
            aria-label="Delivery duration in hours"
          />
          <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]"><span>1h</span><span>72h</span></div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {CURVE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setCurve(id)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                curve === id ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              {CURVE_LABELS[id]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Reviews carousel (real only) ---------------- */

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i <= n ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export function ReviewsSection({ reviews, avg }: { reviews: HomeReview[]; avg: number | null }) {
  const [idx, setIdx] = useState(0);
  const count = reviews.length;

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 pt-16" id="reviews">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Reviews</h2>
        <div className="glass mx-auto mt-8 max-w-xl rounded-2xl p-8 text-center">
          <div className="text-4xl">💬</div>
          <h3 className="mt-3 text-lg font-semibold">Be the first to share your experience</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            After completing an order, you can rate it from your dashboard. Your honest review helps others.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" /> We only show real, approved reviews.
          </div>
        </div>
      </section>
    );
  }

  const r = reviews[idx % count];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-16" id="reviews">
      <div className="flex items-center justify-center gap-3">
        <h2 className="text-2xl font-bold sm:text-3xl">Reviews</h2>
        {avg != null && (
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-sm font-semibold">
            <span className="text-amber-400">★</span> {avg.toFixed(1)} · {count} reviews
          </span>
        )}
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={r.id + idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <Stars n={r.rating} />
              <span className="text-xs text-[var(--text-muted)]">{count} total</span>
            </div>
            <p className="mt-4 text-base leading-relaxed">“{r.text}”</p>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] font-bold text-[var(--accent)]">
                {r.display.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium">{r.display}</span>
              {r.link && (
                <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)]">· Verified link</a>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to review ${i + 1}`}
                className={cn("h-2 rounded-full transition-all", i === idx % count ? "w-6 bg-[var(--accent)]" : "w-2 bg-[var(--border-strong)]")}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
