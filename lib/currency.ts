export function formatMoney(value: number | string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return "$0.00";
  return num.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatNumber(value: number | string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
