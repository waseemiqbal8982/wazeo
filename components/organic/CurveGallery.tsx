"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CURVE_PRESETS, buildCumulativeCurve, type CurvePreset } from "@/lib/organic";
import { CurveChart, type CurveDatum } from "./CurveChart";

export interface GalleryCard {
  preset: CurvePreset;
  planned: CurveDatum[];
}

function buildGallery(): GalleryCard[] {
  return CURVE_PRESETS.map((preset) => {
    const curve = buildCumulativeCurve(preset, 1440, { startHour: 12 });
    return {
      preset,
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
  const cards = useMemo(() => (compact ? CACHE.slice(0, 4) : CACHE), [compact]);

  return (
    <div className={cn("flex gap-3 overflow-x-auto pb-2", className)}>
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
            <div className="mt-2">
              <CurveChart planned={c.planned} compact />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-muted)]">{c.preset.shape}</span>
              {active && <span className="text-[var(--accent)]">✓</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
