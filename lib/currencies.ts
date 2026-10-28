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
