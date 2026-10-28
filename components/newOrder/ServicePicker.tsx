"use client";

import { useMemo } from "react";
import { PLATFORMS } from "@/lib/constants";
import { WazeoSelect, WazeoOption } from "@/components/ui/WazeoSelect";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrency } from "@/lib/currency-store";
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
  selected: Service | null;
  onSelect: (s: Service) => void;
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube: "▶️",
};

export function ServicePicker({ services, loading, platform, onPlatform, selected, onSelect }: Props) {
  const { fmt } = useCurrency();

  const platformServices = useMemo(() => services.filter((s) => s.platform === platform), [services, platform]);

  const options: WazeoOption[] = useMemo(
    () =>
      platformServices.map((s) => ({
        value: s.id,
        label: s.name,
        group: s.category || "Services",
        badge: `${fmt((s.provider_rate * (1 + s.markup_percent / 100)) * 1000)}/1000 · ${s.min}-${s.max}`,
      })),
    [platformServices, fmt]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPlatform(p.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-sm font-semibold transition-all duration-200",
              platform === p.id
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]"
                : "border-[var(--border)] bg-white/[0.02] text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            <span className="text-2xl">{PLATFORM_ICONS[p.id] || p.label.slice(0, 1)}</span>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-10" />
      ) : (
        <WazeoSelect
          label="Select service"
          placeholder="Choose a service…"
          search
          value={selected?.id || ""}
          options={options}
          onChange={(id) => {
            const s = platformServices.find((x) => x.id === id);
            if (s) onSelect(s);
          }}
        />
      )}
    </div>
  );
}
