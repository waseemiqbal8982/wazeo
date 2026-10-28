"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface WazeoOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  group?: string;
}

interface WazeoSelectProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value: string;
  options: WazeoOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  search?: boolean;
}

export function WazeoSelect({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled,
  error,
  className,
  search,
}: WazeoSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const t = q.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(t));
  }, [options, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, WazeoOption[]>();
    for (const o of filtered) {
      const g = o.group || "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(o);
    }
    return [...map.entries()];
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setQ("");
      setHi(0);
    }
  }, [open]);

  useEffect(() => setHi(0), [q]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[hi];
      if (o) pick(o.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full appearance-none rounded-xl border bg-white/[0.03] pl-3.5 pr-9 text-left text-sm text-[var(--text)]",
            "border-[var(--border)] transition-[border-color,box-shadow] duration-200",
            "focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]",
            error && "border-[var(--danger)]",
            disabled && "opacity-50",
            !selected && "text-[var(--text-muted)]"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected?.icon}
            {selected ? selected.label : placeholder || "Select…"}
            {selected?.badge && (
              <span className="ml-auto shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                {selected.badge}
              </span>
            )}
          </span>
        </button>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
        </span>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 z-20 sm:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                role="listbox"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="fixed inset-x-3 bottom-3 z-30 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[#151526] shadow-2xl sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-full sm:max-h-64 sm:rounded-xl"
              >
                {search !== false && options.length > 7 && (
                  <div className="border-b border-[var(--border)] p-2">
                    <input
                      autoFocus
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search…"
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-white/[0.03] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>
                )}
                <div className="max-h-[55vh] overflow-y-auto p-1.5 sm:max-h-60">
                  {grouped.length === 0 && (
                    <p className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">No options</p>
                  )}
                  {grouped.map(([g, items]) => (
                    <div key={g}>
                      {g && (
                        <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{g}</p>
                      )}
                      {items.map((o) => {
                        const gi = filtered.indexOf(o);
                        return (
                          <button
                            key={o.value}
                            type="button"
                            role="option"
                            aria-selected={o.value === value}
                            onMouseEnter={() => setHi(gi)}
                            onClick={() => pick(o.value)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                              gi === hi ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text)] hover:bg-white/[0.05]"
                            )}
                          >
                            {o.icon}
                            <span className="truncate">{o.label}</span>
                            {o.badge && (
                              <span className="ml-auto shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                                {o.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
