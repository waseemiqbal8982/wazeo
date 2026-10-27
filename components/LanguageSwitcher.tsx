"use client";

import { LANGS, SUPPORTED_LANGS, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={cn("relative", className)}>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as (typeof SUPPORTED_LANGS)[number])}
        aria-label="Language"
        className="h-9 appearance-none rounded-lg border border-[var(--border)] bg-white/[0.03] pl-3 pr-8 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
      >
        {SUPPORTED_LANGS.map((code) => (
          <option key={code} value={code} className="bg-[#12121f]">
            {LANGS[code].label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}
