"use client";

import { LANGS, SUPPORTED_LANGS, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/Select";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <Select
      aria-label="Language"
      value={lang}
      onChange={(e) => setLang(e.target.value as (typeof SUPPORTED_LANGS)[number])}
      options={SUPPORTED_LANGS.map((code) => ({ value: code, label: LANGS[code].label }))}
      className={cn("w-36", className)}
    />
  );
}
