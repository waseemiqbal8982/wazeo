"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/currency";
import { isMockMode } from "@/lib/provider";

interface Service {
  id: string;
  name: string;
  platform: string;
  category: string;
  provider_rate: number;
  markup_percent: number;
  active: boolean;
  min: number;
  max: number;
}

export function AdminServices() {
  const supabase = createClient();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const { data } = await supabase.from("services").select("*").order("name");
    setServices(data || []);
  }
  useEffect(() => { load(); }, []);

  async function sync() {
    setSyncing(true);
    const res = await fetch("/api/provider/sync", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) return toast({ title: data.error || "Sync failed", variant: "danger" });
    toast({ title: `Synced ${data.count} services`, variant: "success" });
    load();
  }

  async function setMarkup(id: string, value: number) {
    await supabase.from("services").update({ markup_percent: value }).eq("id", id);
    load();
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from("services").update({ active }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-sm text-[var(--text-muted)]">{services.length} services</p>
        </div>
        <div className="flex items-center gap-2">
          {isMockMode() && <Badge tone="warning">Mock mode</Badge>}
          <Button loading={syncing} onClick={sync}>Sync services</Button>
        </div>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--text-muted)]">
              <th className="px-4 py-2 font-medium">Service</th>
              <th className="px-4 py-2 font-medium">Platform</th>
              <th className="px-4 py-2 font-medium">Provider rate</th>
              <th className="px-4 py-2 font-medium">Markup %</th>
              <th className="px-4 py-2 font-medium">Selling</th>
              <th className="px-4 py-2 font-medium">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {services.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2.5">
                  <p className="max-w-[220px] truncate font-medium">{s.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{s.category}</p>
                </td>
                <td className="px-4 py-2.5">{s.platform}</td>
                <td className="px-4 py-2.5">{Number(s.provider_rate).toFixed(4)}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    defaultValue={s.markup_percent}
                    onBlur={(e) => setMarkup(s.id, Number(e.target.value) || 0)}
                    className="w-16 rounded-lg border border-[var(--border)] bg-white/[0.03] px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-2.5">{formatMoney(s.provider_rate * (1 + s.markup_percent / 100))}</td>
                <td className="px-4 py-2.5">
                  <Button size="sm" variant={s.active ? "soft" : "outline"} onClick={() => toggle(s.id, !s.active)}>
                    {s.active ? "Active" : "Inactive"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
