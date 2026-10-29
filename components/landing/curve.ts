"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/ui/CountUp";

export type CurveId = "steady" | "slow_start" | "bell_peak" | "natural_wave";

export const CURVE_IDS: CurveId[] = ["steady", "slow_start", "bell_peak", "natural_wave"];

export const CURVE_LABELS: Record<CurveId, string> = {
  steady: "Steady",
  slow_start: "Slow start",
  bell_peak: "Bell peak",
  natural_wave: "Natural wave",
};

/** Generate N normalized points [(x, y), ...] with x,y in [0,1]. */
export function curvePoints(id: CurveId, n = 24): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : i / (n - 1);
    let y: number;
    switch (id) {
      case "steady":
        y = x;
        break;
      case "slow_start":
        y = Math.pow(x, 1.7);
        break;
      case "bell_peak":
        y = 1 / (1 + Math.exp(-11 * (x - 0.5)));
        break;
      case "natural_wave":
        y = x + 0.06 * Math.sin(x * Math.PI * 4) + 0.04 * Math.sin(x * Math.PI * 9);
        break;
    }
    pts.push([x, Math.max(0, Math.min(1, y))]);
  }
  return pts;
}

/** Smoothly morph between point sets over `ms`. Returns current points in state. */
export function useMorphCurve(target: CurveId, ms = 600): [number, number][] {
  const reduced = useReducedMotion();
  const [pts, setPts] = useState<[number, number][]>(() => curvePoints(target));
  const fromRef = useRef<[number, number][]>(curvePoints("steady"));
  const toRef = useRef<[number, number][]>(curvePoints(target));
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = curvePoints(target);
    toRef.current = to;
    if (reduced) {
      setPts(to);
      fromRef.current = to;
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / ms, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur: [number, number][] = from.map(([x, y], i) => [
        x,
        y + (to[i][1] - y) * eased,
      ]);
      setPts(cur);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, ms, reduced]);

  return pts;
}

/** Build an SVG path `d` string from normalized points mapped into a box. */
export function pointsToPath(
  pts: [number, number][],
  w = 300,
  h = 120,
  pad = 8
): string {
  if (pts.length === 0) return "";
  const ix = (x: number) => pad + x * (w - pad * 2);
  const iy = (y: number) => h - pad - y * (h - pad * 2);
  return pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${ix(x).toFixed(1)},${iy(y).toFixed(1)}`)
    .join(" ");
}
