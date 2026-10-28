"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

// Reliable OTP input: a single invisible native input drives keyboard + paste +
// inputmode, while 6 decorative boxes display the typed digits. This gives
// native numeric keypads on phones and allows pasting a full code at once.
export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = false,
}: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filled, setFilled] = useState(0);
  const [focused, setFocused] = useState(false);

  const sanitize = (raw: string) => raw.replace(/\D/g, "").slice(0, length);

  useEffect(() => {
    setFilled(sanitize(value).length);
  }, [value]);

  useEffect(() => {
    if (autoFocus && !disabled) inputRef.current?.focus();
  }, [autoFocus, disabled]);

  const box = (i: number) => {
    const digits = sanitize(value);
    const ch = digits[i] ?? "";
    return (
      <div
        key={i}
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "relative flex h-12 w-10 items-center justify-center rounded-xl border text-lg font-semibold transition-all duration-200 sm:h-14 sm:w-12",
          error ? "border-[var(--danger)] text-[var(--danger)]" : "border-[var(--border-strong)] text-[var(--text)]",
          ch && !error && "border-[var(--accent)] bg-[var(--accent-soft)]",
          !ch && !error && "bg-white/[0.03]",
          focused && i === filled && !error && "ring-2 ring-[var(--accent)]/40"
        )}
      >
        {ch}
        {i === filled && !ch && (
          <span className="absolute h-5 w-0.5 animate-pulse rounded bg-[var(--accent)]" />
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* invisible native input — drives everything */}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(sanitize(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Verification code"
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length }, (_, i) => box(i))}
      </div>
    </div>
  );
}
