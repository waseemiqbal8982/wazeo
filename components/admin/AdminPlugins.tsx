"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface ModuleDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Built-in modules only — no code upload or execution from the admin panel.
const MODULES: ModuleDef[] = [
  { id: "combo", name: "Combo planner", description: "Bundle multiple services into a single combo order.", icon: "🔗" },
  { id: "bulk", name: "Bulk planner", description: "Place many orders in one go.", icon: "📦" },
  { id: "growth", name: "Growth planner", description: "Plan a growth campaign over time.", icon: "📈" },
  { id: "likes", name: "Likes planner", description: "Schedule likes across a campaign.", icon: "❤️" },
  { id: "scheduler", name: "Scheduler", description: "Schedule orders at a future time.", icon: "⏰" },
  { id: "referral", name: "Referral", description: "Referral program & rewards.", icon: "🎁" },
  { id: "daily_reward", name: "Daily reward", description: "Daily check-in rewards.", icon: "🗓️" },
  { id: "coupons", name: "Coupons", description: "Coupon & promo-code engine.", icon: "🏷️" },
  { id: "ai", name: "AI assistant", description: "AI-powered support assistant.", icon: "🤖" },
  { id: "live_chat", name: "Live chat", description: "Real-time chat support.", icon: "💬" },
  { id: "blog", name: "Blog", description: "Content / blog module.", icon: "📝" },
  { id: "api", name: "API access", description: "Public API access for customers.", icon: "🔌" },
  { id: "reviews", name: "Reviews", description: "Customer reviews & testimonials.", icon: "⭐" },
];

export function AdminPlugins() {
  const supabase = createClient();
  const { toast } = useToast();
  const [modules, setModules] = useState<Record<string, { enabled: boolean; settings: Record<string, unknown> }>>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", "modules").maybeSingle();
      if (data?.value) {
        try {
          const obj = JSON.parse(data.value);
          if (obj && typeof obj === "object") setModules(obj);
        } catch {}
      }
      setLoaded(true);
    })();
  }, [supabase]);

  async function persist(next: Record<string, { enabled: boolean; settings: Record<string, unknown> }>) {
    setBusy(true);
    const { error } = await supabase.from("settings").upsert({ key: "modules", value: JSON.stringify(next) });
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "danger" });
    setModules(next);
    toast({ title: "Modules saved", variant: "success" });
  }

  function toggle(id: string) {
    const current = modules[id] || { enabled: false, settings: {} };
    persist({ ...modules, [id]: { ...current, enabled: !current.enabled } });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Modules</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Toggle built-in modules. Features are hidden when their module is off. No custom code or uploads are supported.
          </p>
        </div>
      </div>

      {!loaded ? (
        <div className="animate-pulse space-y-2">
          <div className="h-24 w-full rounded-xl bg-white/[0.04]" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const state = modules[m.id] || { enabled: false, settings: {} };
            return (
              <div key={m.id} className={cn("glass rounded-2xl p-4 transition-opacity", !state.enabled && "opacity-60")}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-lg">{m.icon}</div>
                    <div>
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{m.description}</p>
                    </div>
                  </div>
                  <Badge tone={state.enabled ? "success" : "muted"}>{state.enabled ? "On" : "Off"}</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  disabled={busy}
                  className="mt-4 w-full rounded-xl border border-[var(--border-strong)] py-2 text-sm font-medium text-[var(--accent)] hover:border-[var(--accent)] disabled:opacity-60"
                >
                  {state.enabled ? "Disable module" : "Enable module"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
