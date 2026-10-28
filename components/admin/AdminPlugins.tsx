"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  hooks: string[];
  description?: string;
}

const DEFAULT_PLUGINS: Plugin[] = [
  { id: "ai-order-assistant", name: "AI Order Assistant", version: "1.0.0", enabled: false, hooks: ["order.create.before"], description: "Adds an AI co-pilot for the new-order flow." },
  { id: "referrals", name: "Referrals & Loyalty", version: "1.0.0", enabled: false, hooks: ["user.created"], description: "Referral tracking and loyalty progress." },
  { id: "coupons", name: "Coupons Engine", version: "1.0.0", enabled: false, hooks: ["checkout.apply"], description: "Coupon & promo-code support at checkout." },
  { id: "webhooks", name: "Webhooks", version: "1.0.0", enabled: false, hooks: ["order.status.changed"], description: "Send order updates to external URLs." },
  { id: "public-tracker", name: "Public Order Tracker", version: "1.0.0", enabled: false, hooks: ["page.route"], description: "Public order tracking page (no login)." },
];

export function AdminPlugins() {
  const supabase = createClient();
  const { toast } = useToast();
  const [plugins, setPlugins] = useState<Plugin[]>(DEFAULT_PLUGINS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", "plugins").maybeSingle();
      if (data?.value) {
        try {
          const arr = JSON.parse(data.value);
          if (Array.isArray(arr) && arr.length) setPlugins(arr);
        } catch {}
      }
    })();
  }, []);

  async function persist(next: Plugin[]) {
    setBusy(true);
    const { error } = await supabase.from("settings").upsert({ key: "plugins", value: JSON.stringify(next) });
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "danger" });
    setPlugins(next);
    toast({ title: "Plugins saved", variant: "success" });
  }

  function toggle(p: Plugin) {
    persist(plugins.map((x) => x.id === p.id ? { ...x, enabled: !x.enabled } : x));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Plugins</h1>
          <p className="text-sm text-[var(--text-muted)]">Enable/disable optional features. Hooks define where each plugin integrates.</p>
        </div>
        <Button variant="outline" onClick={() => toast({ title: "Install plugin", description: "Upload a plugin package or configure from a marketplace (coming soon)." })}>+ Install plugin</Button>
      </div>

      {plugins.length === 0 ? (
        <EmptyState title="No plugins" description="Plugins you install will appear here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plugins.map((p) => (
            <div key={p.id} className={cn("glass rounded-2xl p-4 transition-opacity", !p.enabled && "opacity-60")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-lg">🧩</div>
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">v{p.version}</p>
                  </div>
                </div>
                <Badge tone={p.enabled ? "success" : "muted"}>{p.enabled ? "Enabled" : "Disabled"}</Badge>
              </div>
              {p.description && <p className="mt-3 text-sm text-[var(--text-muted)]">{p.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {p.hooks.map((h) => (
                  <span key={h} className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">{h}</span>
                ))}
              </div>
              <Button size="sm" variant="outline" full className="mt-4" loading={busy} onClick={() => toggle(p)}>
                {p.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
