"use client";

import { cn } from "@/lib/utils";

type Tone = "default" | "accent" | "success" | "warning" | "danger" | "neutral";

const tones: Record<Tone, string> = {
  default: "bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-transparent",
  success: "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]",
  neutral: "bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border)]",
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
