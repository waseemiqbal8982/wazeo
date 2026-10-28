"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { formatLocalized } from "@/lib/currencies";

export const CURRENCY_COOKIE = "wazeo-currency";

interface CurrencyCtx {
  currency: string;
  rates: Record<string, number>;
  setCurrency: (c: string) => void;
  fmt: (usd: number) => string;
}

const Ctx = createContext<CurrencyCtx>({
  currency: "USD",
  rates: { USD: 1 },
  setCurrency: () => {},
  fmt: (n) => String(n),
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState("USD");
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });

  useEffect(() => {
    try {
      const c = document.cookie
        .split("; ")
        .find((r) => r.startsWith(CURRENCY_COOKIE + "="));
      if (c) setCurrencyState(decodeURIComponent(c.split("=")[1]) || "USD");
    } catch {}
    fetch("/api/meta/currencies")
      .then((r) => r.json())
      .then((d) => {
        if (d?.rates) setRates(d.rates);
        if (d?.default) setCurrencyState((cur) => cur === "USD" ? d.default : cur);
      })
      .catch(() => {});
  }, []);

  const setCurrency = useCallback(async (c: string) => {
    const code = c.toUpperCase();
    setCurrencyState(code);
    document.cookie = `${CURRENCY_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${60 * 60 * 24 * 365}`;
    try {
      await fetch("/api/user/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: code }),
      });
    } catch {}
  }, []);

  const fmt = useCallback((usd: number) => formatLocalized(usd, currency, rates), [currency, rates]);

  return <Ctx.Provider value={{ currency, rates, setCurrency, fmt }}>{children}</Ctx.Provider>;
}

export const useCurrency = () => useContext(Ctx);
