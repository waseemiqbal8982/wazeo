export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function truncate(text: string, n: number): string {
  return text.length > n ? text.slice(0, n) + "…" : text;
}
