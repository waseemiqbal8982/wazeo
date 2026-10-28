"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { THEMES } from "@/lib/constants";

const THEME_KEY = "wazeo-theme";
const MODE_KEY = "wazeo-mode";
const REDUCE_KEY = "wazeo-reduce";

export type ThemeMode = "dark" | "light";

interface ThemeCtx {
  theme: string;
  mode: ThemeMode;
  reduceMotion: boolean;
  setTheme: (t: string) => void;
  setMode: (m: ThemeMode) => void;
  setReduceMotion: (b: boolean) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: "purple",
  mode: "dark",
  reduceMotion: false,
  setTheme: () => {},
  setMode: () => {},
  setReduceMotion: () => {},
});

export function useTheme() {
  return useContext(Ctx);
}

function applyDocument(theme: string, mode: ThemeMode, reduce: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = THEMES.some((t) => t.id === theme) ? theme : "purple";
  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.reduceMotion = reduce ? "true" : "false";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, _setTheme] = useState("purple");
  const [mode, _setMode] = useState<ThemeMode>("dark");
  const [reduceMotion, _setReduceMotion] = useState(false);

  useEffect(() => {
    let t = "purple";
    let m: ThemeMode = "dark";
    let r = false;
    try {
      t = localStorage.getItem(THEME_KEY) || "";
      if (!t) {
        const ck = document.cookie.match(/(?:^|; )wazeo-theme=([^;]*)/);
        t = ck ? decodeURIComponent(ck[1]) : "purple";
      }
      const sm = localStorage.getItem(MODE_KEY);
      if (sm === "light" || sm === "dark") m = sm;
      else {
        const cm = document.cookie.match(/(?:^|; )wazeo-mode=([^;]*)/);
        if (cm && (cm[1] === "light" || cm[1] === "dark")) m = cm[1] as ThemeMode;
      }
      r = localStorage.getItem(REDUCE_KEY) === "true";
    } catch {}
    if (!THEMES.some((x) => x.id === t)) t = "purple";
    _setTheme(t);
    _setMode(m);
    _setReduceMotion(r);
    applyDocument(t, m, r);
  }, []);

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

  const setMode = useCallback((m: ThemeMode) => {
    _setMode(m);
    applyDocument(theme, m, false);
    try {
      localStorage.setItem(MODE_KEY, m);
      document.cookie = `wazeo-mode=${m}; path=/; max-age=31536000`;
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
    () => ({ theme, mode, reduceMotion, setTheme, setMode, setReduceMotion }),
    [theme, mode, reduceMotion, setTheme, setMode, setReduceMotion]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
