"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ALL_CURVE_PRESETS, generateOrganicPlan, buildCumulativeCurve, type CurvePreset } from "@/lib/organic";
import { CurveChart, type CurveDatum } from "./CurveChart";

export interface GalleryCard {
  preset: CurvePreset;
  stars: number;
  risk: number;
  band: string;
  planned: CurveDatum[];
}

// Precompute a stable preview per preset at module load (pure, fast).
function buildGallery(): GalleryCard[] {
  return ALL_CURVE_PRESETS.map((preset) => {
    const plan = generateOrganicPlan({
      engagement: { views: 500, likes: 60, comments: 25 },
      presetId: preset.id,
      windowId: "24h",
      variancePercent: 8,
    });
    const curve = buildCumulativeCurve(preset, 1440, { startHour: 12 });
    return {
      preset,
      stars: preset.rating,
      risk: plan.risk,
      band: plan.band,
      planned: curve.map((p) => ({ x: p.x, y: p.cumulative * 500 })),
    };
  });
}

const CACHE = buildGallery();

export interface CurveGalleryProps {
  selected: string;
  onSelect: (id: string) => void;
  compact?: boolean;
  className?: string;
}

export function CurveGallery({ selected, onSelect, compact = false, className }: CurveGalleryProps) {
  const cards = useMemo(() => (compact ? CACHE.slice(0, 7) : CACHE), [compact]);

  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto pb-2",
        className
      )}
    >
      {cards.map((c) => {
        const active = c.preset.id === selected;
        return (
          <button
            key={c.preset.id}
            type="button"
            onClick={() => onSelect(c.preset.id)}
            className={cn(
              "group w-40 shrink-0 rounded-2xl border p-3 text-left transition",
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--border)] bg-white/[0.02] hover:border-[var(--border-strong)]"
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="truncate text-xs font-semibold text-[var(--text)]">{c.preset.label}</span>
            </div>
            <div className="text-[10px] text-amber-400">{"★".repeat(c.stars)}<span className="text-white/20">{"★".repeat(5 - c.stars)}</span></div>
            <div className="mt-2">
              <CurveChart planned={c.planned} compact />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-medium",
                  c.risk <= 22 ? "bg-emerald-500/15 text-emerald-400" : c.risk <= 30 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"
                )}
              >
                Risk: {c.band}
              </span>
              {active && <span className="text-[var(--accent)]">✓</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
