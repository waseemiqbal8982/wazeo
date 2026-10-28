"use client";

import { useState } from "react";
import { useCurrency } from "@/lib/currency-store";
import { CURRENCIES, currencyInfo } from "@/lib/currencies";
import { cn } from "@/lib/utils";

export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const cur = currencyInfo(currency);

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.03] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/[0.06]"
        aria-label="Currency"
      >
        <span>{cur.flag}</span>
        <span>{cur.code}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-44 rounded-xl border border-[var(--border)] bg-[#12121f] p-2 shadow-xl">
          {Object.values(CURRENCIES).map((c) => (
            <button
              key={c.code}
              onClick={() => { setCurrency(c.code); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                currency === c.code ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-white/[0.05]"
              )}
            >
              <span>{c.flag}</span>
              {c.code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
