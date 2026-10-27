"use client";

import { useMemo } from "react";
import { PLATFORMS } from "@/lib/constants";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  platform: string;
  category: string;
  provider_rate: number;
  markup_percent: number;
  min: number;
  max: number;
}

interface Props {
  services: Service[];
  loading: boolean;
  platform: string;
  onPlatform: (p: string) => void;
  category: string;
  onCategory: (c: string) => void;
  q: string;
  onQ: (q: string) => void;
  selected: Service | null;
  onSelect: (s: Service) => void;
}

export function ServicePicker({ services, loading, platform, onPlatform, category, onCategory, q, onQ, selected, onSelect }: Props) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => { if (s.platform === platform) set.add(s.category); });
    return ["all", ...Array.from(set)];
  }, [services, platform]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (s.platform !== platform) return false;
      if (category !== "all" && s.category !== category) return false;
      if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [services, platform, category, q]);

  return (
    <div className="space-y-4">
      <Tabs tabs={PLATFORMS.map((p) => ({ id: p.id, label: p.label }))} value={platform} onChange={onPlatform} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button key={c} onClick={() => onCategory(c)}
            className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200",
              category === c ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]")}>
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      <Input placeholder="Search services…" value={q} onChange={(e) => onQ(e.target.value)} />

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((s) => {
            const active = selected?.id === s.id;
            return (
              <button key={s.id} onClick={() => onSelect(s)}
                className={cn("glass rounded-2xl p-3 text-left transition-[transform,box-shadow,border-color] duration-200",
                  active ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]" : "hover:-translate-y-0.5")}>
                <p className="text-sm font-medium leading-snug">{s.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Min {s.min} · Max {s.max}</span>
                  <Badge tone="accent">{formatMoney(s.provider_rate * (1 + s.markup_percent / 100))}/unit</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
