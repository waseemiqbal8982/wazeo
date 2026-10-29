"use client";

import { cn } from "@/lib/utils";

/**
 * Animated toggle switch (Item 5). Knob slides with transform + opacity only,
 * and the motion is disabled when the user prefers reduced motion.
 */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  className,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200",
        checked ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border-strong)] bg-white/[0.06]",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none",
          checked ? "translate-x-[calc(100%+2px)]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}
