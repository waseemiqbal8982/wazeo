"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { THEMES } from "@/lib/constants";

const THEME_KEY = "wazeo-theme";
const REDUCE_KEY = "wazeo-reduce";

interface ThemeCtx {
  theme: string;
  reduceMotion: boolean;
  setTheme: (t: string) => void;
  setReduceMotion: (b: boolean) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: "purple",
  reduceMotion: false,
  setTheme: () => {},
  setReduceMotion: () => {},
});

export function useTheme() {
  return useContext(Ctx);
}

function applyDocument(theme: string, reduce: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = THEMES.some((t) => t.id === theme) ? theme : "purple";
  document.documentElement.dataset.reduceMotion = reduce ? "true" : "false";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, _setTheme] = useState("purple");
  const [reduceMotion, _setReduceMotion] = useState(false);

  useEffect(() => {
    let t = "purple";
    let r = false;
    try {
      t = localStorage.getItem(THEME_KEY) || "";
      if (!t) {
        const m = document.cookie.match(/(?:^|; )wazeo-theme=([^;]*)/);
        t = m ? decodeURIComponent(m[1]) : "purple";
      }
      r = localStorage.getItem(REDUCE_KEY) === "true";
    } catch {}
    if (!THEMES.some((x) => x.id === t)) t = "purple";
    _setTheme(t);
    _setReduceMotion(r);
    applyDocument(t, r);
  }, []);

  const setTheme = useCallback((t: string) => {
    _setTheme(t);
    applyDocument(t, false);
    try {
      localStorage.setItem(THEME_KEY, t);
      document.cookie = `wazeo-theme=${encodeURIComponent(t)}; path=/; max-age=31536000`;
    } catch {}
    // best-effort persist to profile
    void (async () => {
      try {
        await createClient().rpc("update_profile", { p_theme: t });
      } catch {}
    })();
  }, []);

  const setReduceMotion = useCallback((b: boolean) => {
    _setReduceMotion(b);
    const t = typeof document !== "undefined" ? document.documentElement.dataset.theme || "purple" : "purple";
    applyDocument(t, b);
    try {
      localStorage.setItem(REDUCE_KEY, b ? "true" : "false");
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ theme, reduceMotion, setTheme, setReduceMotion }),
    [theme, reduceMotion, setTheme, setReduceMotion]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
