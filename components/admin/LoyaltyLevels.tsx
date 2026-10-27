"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { audit } from "@/lib/audit";

export function LyaltyLevels() {
  const sb = createClient();
  const [levels, setLevels] = useState<any[]>([]);

  async function load() {
    const { data } = await sb.from("loyalty_levels").select("*").order("sort");
    setLevels(data || []);
  }
  useEffect(() => { load(); }, []);

  async function saveLevel(id: string, patch: any) {
    await sb.from("loyalty_levels").update(patch).eq("id", id);
    await audit("loyalty_update", { id });
    load();
  }

  return (
    <Card>
      <p className="mb-3 text-sm font-semibold">Loyalty levels</p>
      <div className="space-y-3">
        {levels.map((lv) => (
          <div key={lv.id} className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <Input value={lv.name} onChange={(e) => saveLevel(lv.id, { name: e.target.value })} className="flex-1" />
              <Badge tone="accent">{lv.discount_percent}%</Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Input label="Min spent" type="number" value={lv.min_spent} onChange={(e) => saveLevel(lv.id, { min_spent: Number(e.target.value) })} />
              <Input label="Discount %" type="number" value={lv.discount_percent} onChange={(e) => saveLevel(lv.id, { discount_percent: Number(e.target.value) })} />
            </div>
          </div>
        ))}
        {levels.length === 0 && <p className="text-sm text-[var(--text-muted)]">Koi level nahi — seed se add karo.</p>}
      </div>
    </Card>
  );
}
