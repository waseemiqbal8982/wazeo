/**
 * Shared types + constants for plain delivery scheduling.
 * Keeps only simple curve-based scheduling plus a natural-variation slider.
 */

// ---------- Engagement types ----------
export type EngagementType = "views" | "likes" | "comments" | "saves" | "shares";

export const ENGAGEMENT_TYPES: EngagementType[] = [
  "views",
  "likes",
  "comments",
  "saves",
  "shares",
];

// ---------- Timing jitter per engagement type ----------
export const ENGAGEMENT_TIMING: Record<
  EngagementType,
  { min: number; max: number; jitter: number; chaos: number }
> = {
  views: { min: 15, max: 120, jitter: 40, chaos: 2.2 },
  likes: { min: 25, max: 180, jitter: 50, chaos: 2.5 },
  comments: { min: 60, max: 360, jitter: 80, chaos: 3.0 },
  saves: { min: 90, max: 480, jitter: 100, chaos: 3.2 },
  shares: { min: 50, max: 240, jitter: 60, chaos: 2.8 },
};

// ---------- Variance / spike caps ----------
export const ENGAGEMENT_VARIANCE: Record<
  EngagementType,
  { min: number; max: number; variance: number; spikeMax: number; hardCap: number }
> = {
  views: { min: 100, max: 250, variance: 0.65, spikeMax: 350, hardCap: 400 },
  likes: { min: 10, max: 45, variance: 0.7, spikeMax: 80, hardCap: 100 },
  comments: { min: 10, max: 20, variance: 0.6, spikeMax: 35, hardCap: 50 },
  saves: { min: 10, max: 25, variance: 0.65, spikeMax: 45, hardCap: 60 },
  shares: { min: 10, max: 30, variance: 0.68, spikeMax: 55, hardCap: 70 },
};

// ---------- Hard caps (operational limits only) ----------
export const HARD_CAPS = {
  maxMicroStepsPerRun: 220,
  maxEvents: 6000,
  maxChartPoints: 1500,
};

// ---------- Curve presets ----------
export interface CurvePreset {
  id: string;
  label: string;
  shape: string;
  params: {
    bumps: { w: number; mu: number; sigma: number; gamma: number }[];
    jitter?: number;
  };
}

export const CURVE_PRESETS: CurvePreset[] = [
  {
    id: "steady",
    label: "Steady",
    shape: "near-uniform",
    params: { bumps: [{ w: 1.0, mu: 0.5, sigma: 0.6, gamma: 1.0 }] },
  },
  {
    id: "slow_start",
    label: "Slow start",
    shape: "gradual rise, slow decay",
    params: { bumps: [{ w: 1.0, mu: 0.8, sigma: 0.22, gamma: 0.8 }] },
  },
  {
    id: "bell_peak",
    label: "Bell peak",
    shape: "peak in the middle",
    params: { bumps: [{ w: 1.0, mu: 0.5, sigma: 0.16, gamma: 1.0 }] },
  },
  {
    id: "natural_wave",
    label: "Natural wave",
    shape: "gentle waves",
    params: {
      bumps: [
        { w: 0.6, mu: 0.3, sigma: 0.12, gamma: 1.0 },
        { w: 0.9, mu: 0.72, sigma: 0.12, gamma: 1.0 },
      ],
    },
  },
];

// ---------- Hour-of-day multipliers (default audience) ----------
export const DEFAULT_HOUR_MULTIPLIERS: number[] = [
  0.06, 0.05, 0.04, 0.05, 0.07, 0.12, 0.18, 0.25,
  0.32, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  1.12, 1.24, 1.38, 1.55, 1.72, 1.6, 1.3, 0.9,
];

export const DEFAULT_WEEKDAY_MULTIPLIERS: number[] = [
  0.9, 0.9, 0.9, 0.9, 0.9, 1.0, 1.0, 1.0,
  1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05,
  1.05, 1.05, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95,
];

// ---------- Window presets ----------
export interface WindowPreset {
  id: string;
  label: string;
  minutes: number;
  multiDay?: boolean;
}

export const WINDOW_PRESETS: WindowPreset[] = [
  { id: "2h", label: "2h", minutes: 120 },
  { id: "6h", label: "6h", minutes: 360 },
  { id: "12h", label: "12h", minutes: 720 },
  { id: "24h", label: "24h", minutes: 1440 },
  { id: "3d", label: "3d", minutes: 4320 },
  { id: "7d", label: "7d", minutes: 10080 },
];
