"use client";

import { cn } from "@/lib/utils";
import { riskBand, type RiskBand } from "@/lib/organic";

export interface RiskMeterProps {
  score: number;
  organicScore?: number;
  size?: "sm" | "md";
  className?: string;
}

const MAX = 40;

const BAND_COLOR: Record<RiskBand, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
  safe: "#22d3ee",
};

const BAND_LABEL: Record<RiskBand, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  safe: "Safe",
};

export function RiskMeter({ score, organicScore, size = "md", className }: RiskMeterProps) {
  const pct = Math.max(0, Math.min(100, (score / MAX) * 100));
  const band = riskBand(score);
  const color = BAND_COLOR[band];
  const isSm = size === "sm";

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("flex items-center justify-between", isSm ? "mb-1" : "mb-2")}>
        <span className={cn("font-medium text-[var(--text)]", isSm ? "text-xs" : "text-sm")}>
          Risk score
        </span>
        <span className="flex items-center gap-2">
          {organicScore != null && (
            <span className={cn("text-[var(--text-muted)]", isSm ? "text-[10px]" : "text-xs")}>
              Organic {organicScore}
            </span>
          )}
          <span
            className={cn("rounded-full px-2 py-0.5 font-semibold text-white", isSm ? "text-[10px]" : "text-xs")}
            style={{ background: color }}
          >
            {score} · {BAND_LABEL[band]}
          </span>
        </span>
      </div>

      {/* gauge track with bands */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: color, transition: "width .3s ease" }}
        />
        {/* band boundary markers: High≤15 / Medium≤25 / Low≤35, target ≤22 */}
        <div className="absolute inset-y-0" style={{ left: `${(15 / MAX) * 100}%`, width: 2, background: "rgba(255,255,255,0.25)" }} />
        <div className="absolute inset-y-0" style={{ left: `${(22 / MAX) * 100}%`, width: 2, background: "var(--accent)" }} />
        <div className="absolute inset-y-0" style={{ left: `${(25 / MAX) * 100}%`, width: 2, background: "rgba(255,255,255,0.25)" }} />
        <div className="absolute inset-y-0" style={{ left: `${(35 / MAX) * 100}%`, width: 2, background: "rgba(255,255,255,0.25)" }} />
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
        <span>High ≤15</span>
        <span>Target ≤22</span>
        <span>Medium ≤25</span>
        <span>Low ≤35</span>
        <span>Safe &gt;35</span>
      </div>
    </div>
  );
}
