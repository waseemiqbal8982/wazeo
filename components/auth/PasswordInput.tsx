"use client";

import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const Eye = ({ off }: { off?: boolean }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
    {off ? <path d="m9.9 4.2 4.2 15.6" /> : <circle cx="12" cy="12" r="3" />}
  </svg>
);

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, error, className, id, ...props }, ref) {
    const { t } = useI18n();
    const [show, setShow] = useState(false);
    const [focused, setFocused] = useState(false);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={show ? "text" : "password"}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              "h-10 w-full rounded-xl border bg-white/[0.03] px-3.5 pr-10 text-sm text-[var(--text)]",
              "border-[var(--border)] placeholder:text-[var(--text-muted)]/60",
              "transition-[border-color,box-shadow] duration-200",
              "focus:outline-none",
              error ? "border-[var(--danger)]" : "border-[var(--border)]",
              focused && !error &&
                "border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-soft)]",
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? t("auth.hide_password") : t("auth.show_password")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            <Eye off={show} />
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }
);
