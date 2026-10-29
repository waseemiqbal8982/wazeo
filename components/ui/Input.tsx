"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          "h-10 w-full rounded-xl border bg-[var(--input-bg)] px-3.5 text-sm text-[var(--text)]",
          "border-[var(--border-input)] placeholder:text-[var(--placeholder)]",
          "transition-[border-color,box-shadow] duration-200",
          "focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]",
          "disabled:bg-[var(--input-disabled-bg)] disabled:text-[var(--text-3)] disabled:cursor-not-allowed",
          error && "border-[var(--danger)]",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
});
