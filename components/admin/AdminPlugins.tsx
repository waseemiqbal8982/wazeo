"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
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
  const [installOpen, setInstallOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", version: "1.0.0", description: "", hooks: "" });

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

  function installPlugin() {
    const name = draft.name.trim();
    if (!name) return toast({ title: "Plugin name is required", variant: "danger" });
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (plugins.some((p) => p.id === id)) return toast({ title: "A plugin with that name already exists", variant: "danger" });
    const hooks = draft.hooks.split(",").map((h) => h.trim()).filter(Boolean);
    const next = [
      ...plugins,
      { id, name, version: draft.version.trim() || "1.0.0", description: draft.description.trim() || undefined, hooks, enabled: true },
    ];
    persist(next);
    setInstallOpen(false);
    setDraft({ name: "", version: "1.0.0", description: "", hooks: "" });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Plugins</h1>
          <p className="text-sm text-[var(--text-muted)]">Enable/disable optional features. Hooks define where each plugin integrates.</p>
        </div>
        <Button variant="outline" onClick={() => setInstallOpen(true)}>+ Install plugin</Button>
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

      <Modal open={installOpen} onClose={() => setInstallOpen(false)} title="Install a custom plugin">
        <div className="space-y-3">
          <Input label="Plugin name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Mass Order" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Version" value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} />
            <Input label="Hooks (comma separated)" value={draft.hooks} onChange={(e) => setDraft({ ...draft, hooks: e.target.value })} placeholder="order.create.before" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button full onClick={installPlugin}>Install plugin</Button>
            <Button variant="outline" onClick={() => setInstallOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
