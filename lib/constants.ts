export const PLATFORMS = [
  { id: "instagram", label: "Instagram", hint: "https://instagram.com/username" },
  { id: "tiktok", label: "TikTok", hint: "https://www.tiktok.com/@username" },
  { id: "youtube", label: "YouTube", hint: "https://www.youtube.com/watch?v=VIDEO_ID" },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

export const CATEGORIES = [
  "Followers",
  "Likes",
  "Views",
  "Comments",
  "Subscribers",
  "Shares",
  "Reactions",
  "Visits",
  "Other",
];

export const CURVES = [
  { id: "steady", label: "Steady" },
  { id: "slow_start", label: "Slow start" },
  { id: "bell_peak", label: "Bell peak" },
  { id: "natural_wave", label: "Natural wave" },
] as const;

export const THEMES = [
  { id: "purple", label: "Purple", hex: "#8B5CF6" },
  { id: "cyan", label: "Cyan", hex: "#22D3EE" },
  { id: "emerald", label: "Emerald", hex: "#10B981" },
  { id: "rose", label: "Rose", hex: "#F43F5E" },
  { id: "amber", label: "Amber", hex: "#F59E0B" },
  { id: "ocean", label: "Ocean", hex: "#3B82F6" },
  { id: "crimson", label: "Crimson", hex: "#DC2626" },
  { id: "amoled", label: "AMOLED Black", hex: "#000000" },
] as const;

export const MIN_DRIP_DURATION = 15; // minutes
export const MAX_DRIP_DURATION = 72 * 60; // minutes (72h)
export const MIN_DRIP_QUANTITY = 10;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  in_progress: "In progress",
  completed: "Completed",
  partial: "Partial",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
