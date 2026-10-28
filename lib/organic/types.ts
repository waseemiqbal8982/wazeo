/**
 * Shared types + constants for the organic engagement engine.
 * All tunables live here (config, not hard-coded) so the risk/scoring weights
 * can be moved to a DB config table later.
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

// ---------- Session model (verified from reference) ----------
// type: [probability, intervalMultiplier, quantityMultiplier]
export const SESSION_TYPES: Record<string, { prob: number; intervalMult: number; qtyMult: number }> = {
  megaBurst: { prob: 0.06, intervalMult: 0.2, qtyMult: 3 },
  burst: { prob: 0.18, intervalMult: 0.35, qtyMult: 2 },
  normal: { prob: 0.48, intervalMult: 1, qtyMult: 1 },
  slow: { prob: 0.18, intervalMult: 2.2, qtyMult: 0.6 },
  pause: { prob: 0.07, intervalMult: 4, qtyMult: 0.35 },
  deadZone: { prob: 0.03, intervalMult: 8, qtyMult: 0.2 },
};

// ---------- Timing jitter (verified from reference) ----------
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

// ---------- Variance / spike caps (verified from reference) ----------
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

// ---------- Hard caps ----------
export const HARD_CAPS = {
  maxMicroStepsPerRun: 220,
  maxEvents: 6000,
  maxChartPoints: 1500,
  maxGapMinutes: 45,
  maxJumpPercentPerMinute: 2,
  endDumpWindowPercent: 10, // final 10% of the window...
  endDumpLastPercent: 25, // ...must hold at most 25% of total (no end dump)
  slowStartMinutes: 60,
  slowStartMinPercent: 3,
  slowStartMaxPercent: 8,
  roundJitterPercent: 5,
  placementMinScore: 30, // estimated score must be <= this
};

// ---------- Risk scoring weights (tunable, mirror of reference) ----------
export interface RiskWeights {
  maxSliceFractionCap: number; // 200 * maxSliceFraction capped at this
  flatGapPenalty: number;
  endDumpPenalty: number;
  engagementDeviation: number;
  firstHourPenalty: number;
  offHoursPenalty: number;
  roundNumberPenalty: number;
  serviceQualityPenalty: number;
  organicBase: number;
  dipChanceWeight: number;
  burstChanceWeight: number;
  pauseChanceWeight: number;
  microStepsWeight: number; // min(microSteps/2, this)
  minOrganicScore: number;
  maxOrganicScore: number;
}

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  maxSliceFractionCap: 22,
  flatGapPenalty: 3,
  endDumpPenalty: 4,
  engagementDeviation: 3,
  firstHourPenalty: 5,
  offHoursPenalty: 3,
  roundNumberPenalty: 2,
  serviceQualityPenalty: 2,
  organicBase: 55,
  dipChanceWeight: 20,
  burstChanceWeight: 15,
  pauseChanceWeight: 15,
  microStepsWeight: 15,
  minOrganicScore: 55,
  maxOrganicScore: 99,
};

export type RiskBand = "high" | "medium" | "low" | "safe";

export function riskBand(score: number): RiskBand {
  if (score <= 15) return "high";
  if (score <= 25) return "medium";
  if (score <= 35) return "low";
  return "safe";
}

// ---------- Hour-of-day multipliers (IST audience default) ----------
// Index 0 = 00:00 ... 23 = 23:00. Peak 19-21h, dead 2-4h.
export const DEFAULT_HOUR_MULTIPLIERS: number[] = [
  0.06, 0.05, 0.04, 0.05, 0.07, 0.12, 0.18, 0.25, // 0-7
  0.32, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, // 8-15
  1.12, 1.24, 1.38, 1.55, 1.72, 1.6, 1.3, 0.9, // 16-23
];

// Weekday multiplier (applied on top for Mon-Fri). Slight bump during day.
export const DEFAULT_WEEKDAY_MULTIPLIERS: number[] = [
  0.9, 0.9, 0.9, 0.9, 0.9, 1.0, 1.0, 1.0,
  1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05,
  1.05, 1.05, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95,
];

// ---------- Curve presets ----------
export interface CurvePreset {
  id: string;
  label: string;
  shape: string;
  rating: number; // stars 1-5
  params: {
    bumps: { w: number; mu: number; sigma: number; gamma: number }[];
    jitter?: number;
    dipChance?: number;
    burstChance?: number;
    pauseChance?: number;
  };
}

export const CURVE_PRESETS: CurvePreset[] = [
  {
    id: "natural_viral",
    label: "Natural Viral",
    shape: "fast burst, sharp decay",
    rating: 5,
    params: {
      bumps: [
        { w: 1.0, mu: 0.08, sigma: 0.04, gamma: 0.9 },
        { w: 0.35, mu: 0.3, sigma: 0.08, gamma: 1.4 },
      ],
      dipChance: 0.2,
      burstChance: 0.4,
    },
  },
  {
    id: "slow_burn",
    label: "Slow Burn",
    shape: "gradual rise, slow decay",
    rating: 5,
    params: {
      bumps: [{ w: 1.0, mu: 0.75, sigma: 0.28, gamma: 0.7 }],
      dipChance: 0.1,
      burstChance: 0.1,
      pauseChance: 0.2,
    },
  },
  {
    id: "steady_organic",
    label: "Steady Organic",
    shape: "near-uniform",
    rating: 4,
    params: {
      bumps: [{ w: 1.0, mu: 0.5, sigma: 0.6, gamma: 1.0 }],
      dipChance: 0.1,
      pauseChance: 0.25,
    },
  },
  {
    id: "two_wave",
    label: "Two Wave",
    shape: "burst, dip, second burst",
    rating: 4,
    params: {
      bumps: [
        { w: 0.8, mu: 0.18, sigma: 0.06, gamma: 1.0 },
        { w: 1.0, mu: 0.72, sigma: 0.07, gamma: 1.2 },
      ],
      burstChance: 0.35,
    },
  },
  {
    id: "long_tail",
    label: "Long Tail",
    shape: "burst + long thin tail",
    rating: 5,
    params: {
      bumps: [
        { w: 1.0, mu: 0.07, sigma: 0.035, gamma: 0.85 },
        { w: 0.4, mu: 0.55, sigma: 0.4, gamma: 2.5 },
      ],
      burstChance: 0.45,
    },
  },
  {
    id: "multi_day",
    label: "Multi Day",
    shape: "daily rhythm",
    rating: 5,
    params: {
      bumps: [
        { w: 1.0, mu: 0.2, sigma: 0.12, gamma: 1.0 },
        { w: 0.9, mu: 0.5, sigma: 0.12, gamma: 1.0 },
        { w: 0.9, mu: 0.8, sigma: 0.12, gamma: 1.0 },
      ],
      pauseChance: 0.3,
    },
  },
  {
    id: "auto_safe",
    label: "Auto Safe",
    shape: "randomised mix",
    rating: 5,
    params: {
      bumps: [
        { w: 0.6, mu: 0.25, sigma: 0.08, gamma: 1.0 },
        { w: 0.6, mu: 0.6, sigma: 0.1, gamma: 1.2 },
        { w: 0.35, mu: 0.85, sigma: 0.08, gamma: 1.1 },
      ],
      jitter: 0.3,
      dipChance: 0.2,
      burstChance: 0.2,
      pauseChance: 0.15,
    },
  },
];

// Named micro-pattern library (E3). Each entry carries the bump geometry the
// curve engine consumes. Exactly 50 named patterns are exposed.
export interface PatternDef {
  id: string;
  label: string;
  rating: number;
  params: CurvePreset["params"];
}

export const PATTERN_DEFS: PatternDef[] = [
  // --- core 7 (preserved behaviour) ---
  { id: "smooth-s-curve", label: "Smooth S-Curve", rating: 4, params: { bumps: [{ w: 1, mu: 0.5, sigma: 0.4, gamma: 1 }] } },
  { id: "exponential-burst", label: "Exponential Burst", rating: 4, params: { bumps: [{ w: 1, mu: 0.05, sigma: 0.05, gamma: 0.7 }], burstChance: 0.5 } },
  { id: "fibonacci-spiral", label: "Fibonacci Spiral", rating: 4, params: { bumps: [
      { w: 0.2, mu: 0.1, sigma: 0.04, gamma: 1 },
      { w: 0.3, mu: 0.3, sigma: 0.06, gamma: 1 },
      { w: 0.5, mu: 0.6, sigma: 0.1, gamma: 1 },
    ] } },
  { id: "staircase", label: "Staircase", rating: 3, params: { bumps: [
      { w: 0.25, mu: 0.12, sigma: 0.08, gamma: 1.2 },
      { w: 0.5, mu: 0.4, sigma: 0.08, gamma: 1.2 },
      { w: 1, mu: 0.75, sigma: 0.1, gamma: 1.2 },
    ] } },
  { id: "double-peak", label: "Double Peak", rating: 4, params: { bumps: [
      { w: 0.8, mu: 0.3, sigma: 0.08, gamma: 1 },
      { w: 1, mu: 0.75, sigma: 0.09, gamma: 1 },
    ], burstChance: 0.3 } },
  { id: "early-boost", label: "Early Boost", rating: 4, params: { bumps: [{ w: 1, mu: 0.12, sigma: 0.07, gamma: 0.85 }], burstChance: 0.4 } },
  { id: "viral-spike", label: "Viral Spike", rating: 4, params: { bumps: [
      { w: 1, mu: 0.06, sigma: 0.03, gamma: 0.8 },
      { w: 0.3, mu: 0.35, sigma: 0.1, gamma: 1.5 },
    ], burstChance: 0.55 } },
  // --- 43 more named patterns (E3: total 50) ---
  { id: "quiet-grow", label: "Quiet Grow", rating: 3, params: { bumps: [{ w: 1, mu: 0.8, sigma: 0.18, gamma: 0.7 }], pauseChance: 0.2 } },
  { id: "morning-lift", label: "Morning Lift", rating: 3, params: { bumps: [{ w: 1, mu: 0.15, sigma: 0.06, gamma: 1 }], burstChance: 0.25 } },
  { id: "evening-surge", label: "Evening Surge", rating: 3, params: { bumps: [{ w: 1, mu: 0.82, sigma: 0.06, gamma: 1 }], burstChance: 0.25 } },
  { id: "weekend-wave", label: "Weekend Wave", rating: 4, params: { bumps: [
      { w: 0.8, mu: 0.35, sigma: 0.12, gamma: 1 },
      { w: 1, mu: 0.8, sigma: 0.12, gamma: 1 },
    ] } },
  { id: "midday-plateau", label: "Midday Plateau", rating: 4, params: { bumps: [{ w: 1, mu: 0.55, sigma: 0.25, gamma: 1.5 }] } },
  { id: "overnight-slow", label: "Overnight Slow", rating: 3, params: { bumps: [{ w: 1, mu: 0.95, sigma: 0.05, gamma: 0.8 }], pauseChance: 0.3 } },
  { id: "drip-feed", label: "Steady Drip Feed", rating: 4, params: { bumps: [{ w: 1, mu: 0.5, sigma: 0.6, gamma: 1 }], pauseChance: 0.25 } },
  { id: "sawtooth", label: "Sawtooth Ripple", rating: 3, params: { bumps: [
      { w: 0.5, mu: 0.2, sigma: 0.05, gamma: 1.4 },
      { w: 0.7, mu: 0.5, sigma: 0.05, gamma: 1.4 },
      { w: 0.6, mu: 0.8, sigma: 0.05, gamma: 1.4 },
    ] } },
  { id: "heartbeat", label: "Heartbeat Pulses", rating: 4, params: { bumps: [
      { w: 0.4, mu: 0.15, sigma: 0.035, gamma: 1 },
      { w: 0.8, mu: 0.45, sigma: 0.07, gamma: 1.1 },
      { w: 0.4, mu: 0.75, sigma: 0.035, gamma: 1 },
    ], burstChance: 0.2 } },
  { id: "rising-tide", label: "Rising Tide", rating: 4, params: { bumps: [
      { w: 0.4, mu: 0.2, sigma: 0.1, gamma: 1 },
      { w: 0.8, mu: 0.6, sigma: 0.12, gamma: 1.1 },
      { w: 1, mu: 0.9, sigma: 0.08, gamma: 1 },
    ] } },
  { id: "fade-in", label: "Fade-In Start", rating: 3, params: { bumps: [{ w: 1, mu: 0.1, sigma: 0.08, gamma: 0.8 }], burstChance: 0.35 } },
  { id: "burst-peak", label: "Burst Peak", rating: 4, params: { bumps: [{ w: 1, mu: 0.5, sigma: 0.1, gamma: 1 }], burstChance: 0.5 } },
  { id: "compound-s", label: "Compound S-Curve", rating: 5, params: { bumps: [
      { w: 0.6, mu: 0.3, sigma: 0.1, gamma: 1 },
      { w: 1, mu: 0.7, sigma: 0.15, gamma: 1.1 },
    ] } },
  { id: "ss-curve", label: "Steady Slope S-Curve", rating: 4, params: { bumps: [
      { w: 0.7, mu: 0.35, sigma: 0.14, gamma: 1 },
      { w: 1, mu: 0.65, sigma: 0.14, gamma: 1 },
    ] } },
  { id: "ramp-hold", label: "Ramp & Hold", rating: 4, params: { bumps: [
      { w: 0.8, mu: 0.3, sigma: 0.2, gamma: 1.5 },
      { w: 1, mu: 0.75, sigma: 0.2, gamma: 1.5 },
    ] } },
  { id: "sinusoid", label: "Smooth Sinusoid", rating: 4, params: { bumps: [
      { w: 0.6, mu: 0.2, sigma: 0.08, gamma: 1.2 },
      { w: 0.6, mu: 0.8, sigma: 0.08, gamma: 1.2 },
    ] } },
  { id: "twin-peak", label: "Twin Peak", rating: 4, params: { bumps: [
      { w: 1, mu: 0.3, sigma: 0.08, gamma: 1 },
      { w: 1, mu: 0.7, sigma: 0.08, gamma: 1 },
    ] } },
  { id: "triple-peak", label: "Triple Peak", rating: 4, params: { bumps: [
      { w: 0.8, mu: 0.2, sigma: 0.06, gamma: 1 },
      { w: 1, mu: 0.5, sigma: 0.06, gamma: 1 },
      { w: 0.8, mu: 0.8, sigma: 0.06, gamma: 1 },
    ] } },
  { id: "surge-tail", label: "Surge + Long Tail", rating: 4, params: { bumps: [
      { w: 1, mu: 0.08, sigma: 0.04, gamma: 0.85 },
      { w: 0.4, mu: 0.6, sigma: 0.35, gamma: 2.5 },
    ], burstChance: 0.5 } },
  { id: "cliff-decay", label: "Cliff Decay", rating: 3, params: { bumps: [{ w: 1, mu: 0.12, sigma: 0.05, gamma: 0.9 }], burstChance: 0.5 } },
  { id: "plateau-plateau", label: "Double Plateau", rating: 4, params: { bumps: [
      { w: 1, mu: 0.35, sigma: 0.18, gamma: 1.5 },
      { w: 0.9, mu: 0.75, sigma: 0.18, gamma: 1.5 },
    ] } },
  { id: "gentle-wave", label: "Gentle Wave", rating: 3, params: { bumps: [
      { w: 0.5, mu: 0.25, sigma: 0.12, gamma: 1 },
      { w: 0.5, mu: 0.75, sigma: 0.12, gamma: 1 },
    ], pauseChance: 0.15 } },
  { id: "steep-rise", label: "Steep Rise", rating: 3, params: { bumps: [{ w: 1, mu: 0.9, sigma: 0.08, gamma: 0.9 }], burstChance: 0.4 } },
  { id: "slow-tail", label: "Slow Tail", rating: 3, params: { bumps: [{ w: 1, mu: 0.6, sigma: 0.4, gamma: 1.2 }], pauseChance: 0.2 } },
  { id: "pulse-train", label: "Pulse Train", rating: 4, params: { bumps: [
      { w: 0.4, mu: 0.15, sigma: 0.04, gamma: 1.2 },
      { w: 0.4, mu: 0.4, sigma: 0.04, gamma: 1.2 },
      { w: 0.4, mu: 0.65, sigma: 0.04, gamma: 1.2 },
      { w: 0.4, mu: 0.9, sigma: 0.04, gamma: 1.2 },
    ] } },
  { id: "meander", label: "Meandering", rating: 3, params: { bumps: [
      { w: 0.5, mu: 0.3, sigma: 0.14, gamma: 1.3 },
      { w: 0.5, mu: 0.7, sigma: 0.14, gamma: 1.3 },
    ], pauseChance: 0.25 } },
  { id: "iceberg", label: "Iceberg (heavy front)", rating: 4, params: { bumps: [
      { w: 1, mu: 0.1, sigma: 0.05, gamma: 0.8 },
      { w: 0.6, mu: 0.5, sigma: 0.3, gamma: 1.5 },
    ], burstChance: 0.45 } },
  { id: "bell-flat", label: "Bell → Flat", rating: 4, params: { bumps: [
      { w: 1, mu: 0.35, sigma: 0.12, gamma: 1.2 },
      { w: 0.8, mu: 0.7, sigma: 0.2, gamma: 1.5 },
    ] } },
  { id: "flat-bell", label: "Flat → Bell", rating: 4, params: { bumps: [
      { w: 0.8, mu: 0.3, sigma: 0.2, gamma: 1.5 },
      { w: 1, mu: 0.65, sigma: 0.12, gamma: 1.2 },
    ] } },
  { id: "yoyo", label: "Yoyo Up-Down", rating: 3, params: { bumps: [
      { w: 0.6, mu: 0.25, sigma: 0.07, gamma: 1.3 },
      { w: 0.4, mu: 0.5, sigma: 0.07, gamma: 1.3 },
      { w: 0.7, mu: 0.75, sigma: 0.07, gamma: 1.3 },
    ] } },
  { id: "spiral-wait", label: "Spiral & Wait", rating: 3, params: { bumps: [
      { w: 0.3, mu: 0.2, sigma: 0.06, gamma: 1 },
      { w: 0.5, mu: 0.6, sigma: 0.12, gamma: 1 },
      { w: 0.4, mu: 0.92, sigma: 0.04, gamma: 0.9 },
    ], pauseChance: 0.3 } },
  { id: "snowball", label: "Snowball Accelerating", rating: 4, params: { bumps: [
      { w: 0.3, mu: 0.2, sigma: 0.1, gamma: 1 },
      { w: 0.6, mu: 0.6, sigma: 0.1, gamma: 1 },
      { w: 1, mu: 0.95, sigma: 0.05, gamma: 1 },
    ] } },
  { id: "decelerate", label: "Decelerating", rating: 3, params: { bumps: [
      { w: 1, mu: 0.15, sigma: 0.12, gamma: 0.9 },
      { w: 0.5, mu: 0.7, sigma: 0.2, gamma: 1.4 },
    ], burstChance: 0.3 } },
  { id: "ticking", label: "Ticking Clock", rating: 4, params: { bumps: [
      { w: 0.5, mu: 0.25, sigma: 0.04, gamma: 1.4 },
      { w: 0.5, mu: 0.75, sigma: 0.04, gamma: 1.4 },
    ] } },
  { id: "organic-pulse", label: "Organic Pulse", rating: 4, params: { bumps: [
      { w: 0.7, mu: 0.3, sigma: 0.08, gamma: 1.2 },
      { w: 0.9, mu: 0.6, sigma: 0.1, gamma: 1.2 },
    ], dipChance: 0.2, burstChance: 0.2 } },
  { id: "evening-peak", label: "Evening Peak Focus", rating: 4, params: { bumps: [{ w: 1, mu: 0.83, sigma: 0.06, gamma: 1 }], burstChance: 0.3 } },
  { id: "morning-spike", label: "Morning Spike", rating: 3, params: { bumps: [{ w: 1, mu: 0.14, sigma: 0.05, gamma: 0.85 }], burstChance: 0.35 } },
  { id: "quiet-night", label: "Quiet Night", rating: 3, params: { bumps: [{ w: 1, mu: 0.97, sigma: 0.03, gamma: 0.7 }], pauseChance: 0.4 } },
  { id: "linear-attention", label: "Linear Attention", rating: 3, params: { bumps: [{ w: 1, mu: 0.5, sigma: 0.5, gamma: 1.4 }] } },
  { id: "power-up", label: "Power-Up Ramp", rating: 4, params: { bumps: [
      { w: 0.5, mu: 0.3, sigma: 0.12, gamma: 1 },
      { w: 1, mu: 0.85, sigma: 0.08, gamma: 1 },
    ], burstChance: 0.3 } },
  { id: "harmonic", label: "Harmonic Bumps", rating: 4, params: { bumps: [
      { w: 0.6, mu: 0.2, sigma: 0.06, gamma: 1 },
      { w: 0.4, mu: 0.5, sigma: 0.06, gamma: 1 },
      { w: 0.6, mu: 0.8, sigma: 0.06, gamma: 1 },
    ] } },
  { id: "valley-first", label: "Valley First", rating: 3, params: { bumps: [
      { w: 0.4, mu: 0.3, sigma: 0.08, gamma: 1 },
      { w: 1, mu: 0.7, sigma: 0.12, gamma: 1 },
    ], pauseChance: 0.3 } },
  { id: "crescendo", label: "Crescendo", rating: 4, params: { bumps: [
      { w: 0.4, mu: 0.3, sigma: 0.1, gamma: 1 },
      { w: 0.8, mu: 0.7, sigma: 0.1, gamma: 1 },
      { w: 1, mu: 0.95, sigma: 0.04, gamma: 1 },
    ] } },
];
export const PATTERN_LIBRARY: { id: string; label: string; rating: number }[] = PATTERN_DEFS.map((p) => ({
  id: p.id,
  label: p.label,
  rating: p.rating,
}));

export function buildPatternParams(id: string): CurvePreset["params"] {
  const d = PATTERN_DEFS.find((x) => x.id === id);
  return d
    ? d.params
    : { bumps: [{ w: 1, mu: 0.5, sigma: 0.3, gamma: 1 }] };
}

export const ALL_CURVE_PRESETS: CurvePreset[] = [
  ...CURVE_PRESETS,
  ...PATTERN_LIBRARY.map((p) => ({
    id: p.id,
    label: p.label,
    shape: "pattern",
    rating: p.rating,
    params: buildPatternParams(p.id),
  })),
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
