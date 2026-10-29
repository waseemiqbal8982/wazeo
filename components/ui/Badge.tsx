"use client";

import { cn } from "@/lib/utils";

type Tone = "default" | "accent" | "success" | "danger" | "warning" | "muted";

const tones: Record<Tone, string> = {
  default: "bg-[var(--surface-2)] text-[var(--text)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  success: "bg-[var(--success-bg)] text-[var(--success-text)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-text)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
  muted: "bg-[var(--surface-2)] text-[var(--text-2)]",
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
