"use client";

import { cn } from "@/lib/utils";

type Tone = "default" | "accent" | "success" | "danger" | "warning" | "muted";

const tones: Record<Tone, string> = {
  default: "bg-white/[0.06] text-[var(--text)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  success: "bg-emerald-500/15 text-emerald-300",
  danger: "bg-red-500/15 text-red-300",
  warning: "bg-amber-500/15 text-amber-300",
  muted: "bg-white/[0.04] text-[var(--text-muted)]",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
