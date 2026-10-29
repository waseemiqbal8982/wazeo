"use client";

import { cn } from "@/lib/utils";
import { useTheme, type ThemePref } from "@/components/ThemeProvider";

const OPTS: { id: ThemePref; label: string; icon: React.ReactNode }[] = [
  {
    id: "dark",
    label: "Dark",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    ),
  },
  {
    id: "light",
    label: "Light",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    id: "auto",
    label: "Auto",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
];

export function ThemeModeToggle({ className }: { className?: string }) {
  const { modePref, setMode } = useTheme();
  return (
    <div className={cn("flex gap-1.5", className)} role="group" aria-label="Color scheme">
      {OPTS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setMode(o.id)}
          aria-pressed={modePref === o.id}
          className={cn(
            "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            modePref === o.id
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
