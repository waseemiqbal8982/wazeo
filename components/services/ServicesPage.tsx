"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS, CATEGORIES } from "@/lib/constants";
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
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

export function ServicesPage() {
  const supabase = createClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("instagram");
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [favs, setFavs] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: svc }, { data: fav }] = await Promise.all([
        supabase.from("services").select("*").eq("active", true).order("name"),
        supabase.from("favorites").select("service_id"),
      ]);
      if (!active) return;
      setServices(svc || []);
      setFavs(new Set((fav || []).map((f) => f.service_id)));
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

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

  async function toggleFav(id: string) {
    const { data } = await supabase.rpc("toggle_favorite", { p_service_id: id });
    setFavs((prev) => {
      const next = new Set(prev);
      if (data) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-sm text-[var(--text-muted)]">Browse available services by platform.</p>
      </div>

      <Tabs
        tabs={PLATFORMS.map((p) => ({ id: p.id, label: p.label }))}
        value={platform}
        onChange={setPlatform}
      />

      <Input placeholder="Search services…" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200",
              category === c
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No services found" description="Try a different search or category." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => {
            const sell = s.provider_rate * (1 + s.markup_percent / 100);
            return (
              <Card key={s.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium leading-snug">{s.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Min {s.min} · Max {s.max}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFav(s.id)}
                    className={cn("text-lg transition-colors", favs.has(s.id) ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--accent)]")}
                    aria-label="Favorite"
                  >
                    {favs.has(s.id) ? "★" : "☆"}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)]">Price / unit</p>
                    <p className="font-bold text-[var(--accent)]">{formatMoney(sell)}</p>
                  </div>
                  <Badge tone="accent">{s.category}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
