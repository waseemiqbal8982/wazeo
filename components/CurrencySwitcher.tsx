"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrency } from "@/lib/currency-store";
import { CURRENCIES, currencyInfo } from "@/lib/currencies";
import { cn } from "@/lib/utils";

export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = currencyInfo(currency);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Currency"
        className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.03] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/[0.06] active:scale-[0.97]"
      >
        <span aria-hidden>{cur.flag}</span>
        <span>{cur.code}</span>
        <svg
          className={cn("transition-transform duration-200", open && "rotate-180")}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-[var(--border)] glass-strong p-1.5 shadow-pop"
        >
          {Object.values(CURRENCIES).map((c) => (
            <button
              key={c.code}
              role="option"
              aria-selected={currency === c.code}
              onClick={() => { setCurrency(c.code); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                currency === c.code ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-white/[0.05]"
              )}
            >
              <span aria-hidden>{c.flag}</span>
              {c.code}
              {currency === c.code && <span className="ml-auto text-[var(--accent)]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
