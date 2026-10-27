"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import en from "@/locales/en.json";
import ur from "@/locales/ur.json";
import hi from "@/locales/hi.json";
import fr from "@/locales/fr.json";
import zh from "@/locales/zh.json";

export const LANGS = {
  en: { label: "English", dir: "ltr" },
  ur: { label: "اردو", dir: "rtl" },
  hi: { label: "हिन्दी", dir: "ltr" },
  fr: { label: "Français", dir: "ltr" },
  zh: { label: "中文", dir: "ltr" },
} as const;

export type Lang = keyof typeof LANGS;

const dicts: Record<Lang, Record<string, string>> = { en, ur, hi, fr, zh };

export const LANG_COOKIE = "wazeo-lang";
export const SUPPORTED_LANGS = Object.keys(LANGS) as Lang[];

export function normalizeLang(raw?: string | null): Lang {
  if (raw && raw in LANGS) return raw as Lang;
  return "en";
}

export function detectLang(): Lang {
  if (typeof document !== "undefined") {
    const c = document.cookie
      .split("; ")
      .find((r) => r.startsWith(LANG_COOKIE + "="));
    if (c) return normalizeLang(decodeURIComponent(c.split("=")[1]));
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("ur")) return "ur";
    if (nav.startsWith("hi")) return "hi";
    if (nav.startsWith("fr")) return "fr";
    if (nav.startsWith("zh")) return "zh";
  }
  return "en";
}

export function translate(lang: Lang, key: string): string {
  const dict = dicts[lang] || dicts.en;
  return dict[key] ?? dicts.en[key] ?? key;
}

export function useI18n() {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const l = detectLang();
    setLangState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = LANGS[l].dir;
  }, []);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = LANGS[l].dir;
    document.cookie = `${LANG_COOKIE}=${encodeURIComponent(l)}; path=/; max-age=${60 * 60 * 24 * 365}`;
    // best-effort persist to profile
    try {
      void createClient().rpc("update_profile", { p_language: l });
    } catch {}
  }, []);

  return { lang, t, setLang, dir: LANGS[lang].dir };
}
