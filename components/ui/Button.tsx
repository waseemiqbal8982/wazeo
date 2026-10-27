"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-white hover:brightness-110 shadow-[0_8px_24px_-8px_var(--glow)]",
  outline:
    "border border-[var(--border-strong)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
  ghost: "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.04]",
  danger: "bg-[var(--danger)] text-white hover:brightness-110",
  soft: "bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      full = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium select-none",
          "transition-[transform,box-shadow,background-color,color,border-color] duration-200",
          "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          full && "w-full",
          className
        )}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
