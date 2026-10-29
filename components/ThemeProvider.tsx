"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { THEMES } from "@/lib/constants";

const THEME_KEY = "wazeo-theme";
const MODE_KEY = "wazeo-mode";
const REDUCE_KEY = "wazeo-reduce";

export type ThemeMode = "dark" | "light";
export type ThemePref = "dark" | "light" | "auto";

interface ThemeCtx {
  theme: string;
  mode: ThemeMode;
  modePref: ThemePref;
  reduceMotion: boolean;
  setTheme: (t: string) => void;
  setMode: (m: ThemePref) => void;
  setReduceMotion: (b: boolean) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: "purple",
  mode: "dark",
  modePref: "auto",
  reduceMotion: false,
  setTheme: () => {},
  setMode: () => {},
  setReduceMotion: () => {},
});

export function useTheme() {
  return useContext(Ctx);
}

export function systemMode(): ThemeMode {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

function resolvePref(pref: ThemePref): ThemeMode {
  return pref === "auto" ? systemMode() : pref;
}

function applyDocument(theme: string, mode: ThemeMode, reduce: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = THEMES.some((t) => t.id === theme) ? theme : "purple";
  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.reduceMotion = reduce ? "true" : "false";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, _setTheme] = useState("purple");
  const [modePref, _setModePref] = useState<ThemePref>("auto");
  const [reduceMotion, _setReduceMotion] = useState(false);
  const [mode, _setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    let t = "purple";
    let pref: ThemePref = "auto";
    let r = false;
    try {
      t = localStorage.getItem(THEME_KEY) || "";
      if (!t) {
        const ck = document.cookie.match(/(?:^|; )wazeo-theme=([^;]*)/);
        t = ck ? decodeURIComponent(ck[1]) : "purple";
      }
      const sm = localStorage.getItem(MODE_KEY);
      if (sm === "light" || sm === "dark" || sm === "auto") pref = sm;
      else {
        const cm = document.cookie.match(/(?:^|; )wazeo-mode=([^;]*)/);
        if (cm && (cm[1] === "light" || cm[1] === "dark" || cm[1] === "auto")) pref = cm[1] as ThemePref;
      }
      r = localStorage.getItem(REDUCE_KEY) === "true";
    } catch {}
    if (!THEMES.some((x) => x.id === t)) t = "purple";
    _setTheme(t);
    _setModePref(pref);
    _setReduceMotion(r);
    const resolved = resolvePref(pref);
    _setMode(resolved);
    applyDocument(t, resolved, r);
  }, []);

  useEffect(() => {
    if (modePref !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const resolved = resolvePref("auto");
      _setMode(resolved);
      applyDocument(
        typeof document !== "undefined" ? document.documentElement.dataset.theme || "purple" : "purple",
        resolved,
        localStorage.getItem(REDUCE_KEY) === "true"
      );
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [modePref]);

  const setTheme = useCallback((t: string) => {
    _setTheme(t);
    applyDocument(t, mode, false);
    try {
      localStorage.setItem(THEME_KEY, t);
      document.cookie = `wazeo-theme=${encodeURIComponent(t)}; path=/; max-age=31536000`;
    } catch {}
    void (async () => {
      try {
        await createClient().rpc("update_profile", { p_theme: t });
      } catch {}
    })();
  }, [mode]);

  const setMode = useCallback((pref: ThemePref) => {
    const resolved = resolvePref(pref);
    _setModePref(pref);
    _setMode(resolved);
    applyDocument(theme, resolved, false);
    try {
      localStorage.setItem(MODE_KEY, pref);
      document.cookie = `wazeo-mode=${pref}; path=/; max-age=31536000`;
    } catch {}
  }, [theme]);

  const setReduceMotion = useCallback((b: boolean) => {
    _setReduceMotion(b);
    const t = typeof document !== "undefined" ? document.documentElement.dataset.theme || "purple" : "purple";
    const m = typeof document !== "undefined" ? (document.documentElement.dataset.mode as ThemeMode) || "dark" : "dark";
    applyDocument(t, m, b);
    try {
      localStorage.setItem(REDUCE_KEY, b ? "true" : "false");
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ theme, mode, modePref, reduceMotion, setTheme, setMode, setReduceMotion }),
    [theme, mode, modePref, reduceMotion, setTheme, setMode, setReduceMotion]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
