"use client";

import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={cn(
            "h-10 w-full appearance-none rounded-xl border bg-white/[0.03] pl-3.5 pr-9 text-sm text-[var(--text)]",
            "border-[var(--border)] transition-[border-color,box-shadow] duration-200",
            "focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]",
            error && "border-[var(--danger)]",
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#12121f] text-[var(--text)]">
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
