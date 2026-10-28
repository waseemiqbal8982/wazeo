// Currency configuration for Wazeo. Balances are stored in USD; these are
// display currencies with exchange rates (1 USD -> X this currency).
export interface CurrencyInfo {
  code: string;
  symbol: string;
  label: string;
  flag: string;
  rate: number; // units per 1 USD
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$", label: "US Dollar", flag: "🇺🇸", rate: 1 },
  INR: { code: "INR", symbol: "₹", label: "Indian Rupee", flag: "🇮🇳", rate: 83.5 },
  PKR: { code: "PKR", symbol: "₨", label: "Pakistani Rupee", flag: "🇵🇰", rate: 278 },
  CNY: { code: "CNY", symbol: "¥", label: "Chinese Yuan", flag: "🇨🇳", rate: 7.2 },
};

export const DEFAULT_CURRENCY = "USD";

export function currencyInfo(code?: string | null): CurrencyInfo {
  const c = (code || "").toUpperCase();
  return CURRENCIES[c] || CURRENCIES[DEFAULT_CURRENCY];
}

// Convert a USD amount into the display currency.
export function convertUsd(usd: number, code?: string | null): number {
  return usd * currencyInfo(code).rate;
}

// Load display rates from a settings key->value map (keys: rate_INR, rate_PKR, rate_CNY).
export function parseRates(map: Record<string, string | number>): Record<string, number> {
  const out: Record<string, number> = { USD: 1 };
  for (const code of ["INR", "PKR", "CNY"]) {
    const raw = Number(map[`rate_${code}`]);
    const fallback = CURRENCIES[code]?.rate ?? 1;
    out[code] = Number.isFinite(raw) && raw > 0 ? raw : fallback;
  }
  return out;
}

// Format a USD amount in the chosen display currency using Intl.
// Tiny amounts are never rounded to zero (min 4 decimals for values < 1 cent).
export function formatLocalized(
  usd: number,
  currency?: string | null,
  rates?: Record<string, number> | null
): string {
  const info = currencyInfo(currency);
  const rate = (rates && rates[info.code]) || info.rate;
  const val = (Number(usd) || 0) * rate;
  const abs = Math.abs(val);
  const tiny = abs > 0 && abs < 0.01;
  const frac = tiny ? 4 : 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: info.code,
      minimumFractionDigits: frac,
      maximumFractionDigits: frac,
    }).format(val);
  } catch {
    return `${info.symbol}${val.toFixed(frac)}`;
  }
}
