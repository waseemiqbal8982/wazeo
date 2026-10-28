"use client";

import { cn } from "@/lib/utils";

type Tone = "default" | "accent" | "success" | "warning" | "danger" | "neutral";

const tones: Record<Tone, string> = {
  default: "bg-white/[0.06] text-[var(--text)] border-[var(--border)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-transparent",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
  neutral: "bg-white/[0.04] text-[var(--text-muted)] border-[var(--border)]",
};

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: "sm" | "md";
}

export function Chip({ tone = "default", size = "sm", className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
