"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useCurrency } from "@/lib/currency-store";
import { PlatformIcon } from "@/lib/platformIcons";
import { cn } from "@/lib/utils";

interface Svc {
  id: string;
  name: string;
  platform: string;
  category: string;
  min: number;
  max: number;
  usd: number;
  demo: boolean;
}

const PLATFORMS = ["instagram", "tiktok", "youtube"];

function ServicesList() {
  const params = useSearchParams();
  const { fmt } = useCurrency();
  const [services, setServices] = useState<Svc[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<string>(params.get("platform") || "");

  useEffect(() => {
    const p = params.get("platform") || "";
    setPlatform(p);
  }, [params]);

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (platform) sp.set("platform", platform);
    fetch(`/api/public/services?${sp.toString()}`)
      .then((r) => r.json())
      .then((d) => setServices(d.services || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [platform]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return services;
    return services.filter(
      (s) => s.name.toLowerCase().includes(search) || s.category.toLowerCase().includes(search)
    );
  }, [services, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-sm text-[var(--text-muted)]" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[var(--accent)]">Home</Link> <span className="mx-1">/</span>
        <span className="text-[var(--text)]">Services & Prices</span>
      </nav>
      <h1 className="mt-3 text-3xl font-bold">Services &amp; Prices</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
        Real prices from our live service list, shown in your chosen currency. Filter by platform or search.
      </p>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlatform("")}
            className={cn("flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors", !platform ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]")}
          >
            All
          </button>
          {PLATFORMS.map((pl) => (
            <button
              key={pl}
              type="button"
              onClick={() => setPlatform(platform === pl ? "" : pl)}
              className={cn("flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors", platform === pl ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]")}
            >
              <span className="text-[var(--accent)]"><PlatformIcon id={pl} size={16} /></span>
              {pl === "instagram" ? "Instagram" : pl === "tiktok" ? "TikTok" : "YouTube"}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search services…"
          className="h-12 w-full rounded-xl border border-[var(--border)] bg-white/[0.03] px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--accent)] focus:outline-none lg:max-w-xs"
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-center text-sm text-[var(--text-muted)]">Loading services…</p>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-3xl">🔍</p>
            <p className="mt-3 font-semibold">No services found</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Try a different search or platform filter.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <div key={s.id} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{s.category}</span>
                    <h3 className="mt-1 text-sm font-semibold leading-snug">{s.name}</h3>
                  </div>
                  <span className="text-[var(--accent)]"><PlatformIcon id={s.platform} size={20} /></span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-[var(--accent)]">{fmt(s.usd)}</span>
                  <span className="text-xs text-[var(--text-muted)]">min {s.min} · max {s.max}</span>
                </div>
                {s.demo && (
                  <span className="mt-2 inline-block rounded-full bg-[var(--warning)]/15 px-2 py-0.5 text-xs text-[var(--warning)]">Demo</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-[var(--text-muted)]">Ready to start? Create a free account.</p>
        <Link href="/sign-up"><Button size="lg">Get started</Button></Link>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 border-b border-[var(--border)] glass-strong">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Wazeo home" className="flex items-center"><Logo size={32} showText /></Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:block" />
            <CurrencySwitcher />
          </div>
        </div>
      </div>
      <Suspense fallback={<div className="py-16 text-center text-sm text-[var(--text-muted)]">Loading…</div>}>
        <ServicesList />
      </Suspense>
    </div>
  );
}
