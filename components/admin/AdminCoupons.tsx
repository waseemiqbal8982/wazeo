"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { audit } from "@/lib/audit";
import { LyaltyLevels } from "./LoyaltyLevels";

const emptyCoupon = { code: "", type: "percent", value: 10, min_order: 0, max_uses: null as number | null, expires_at: "", active: true };

export function AdminCoupons() {
  const sb = createClient();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyCoupon);
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    const { data } = await sb.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data || []);
  }
  useEffect(() => { load(); }, []);

  async function saveCoupon() {
    if (!form.code.trim()) return toast({ title: "Code required", variant: "danger" });
    const payload = { ...form, code: form.code.trim().toUpperCase(), max_uses: form.max_uses ? Number(form.max_uses) : null, expires_at: form.expires_at || null };
    if (editing) await sb.from("coupons").update(payload).eq("id", editing);
    else await sb.from("coupons").insert(payload);
    await audit(editing ? "coupon_update" : "coupon_create", { code: payload.code });
    toast({ title: "Coupon saved", variant: "success" });
    setEditing(null); setForm(emptyCoupon); load();
  }

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Coupons & Loyalty</h1></div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <p className="text-sm font-semibold">Coupon</p>
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SAVE10" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" options={[{ value: "percent", label: "Percent" }, { value: "fixed", label: "Fixed ($)" }]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <Input label="Value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min order ($)" type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} />
            <Input label="Max uses" type="number" value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <Input label="Expires at" type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <Button onClick={saveCoupon}>{editing ? "Update" : "Create"} coupon</Button>
        </Card>

        <LyaltyLevels />
      </div>

      <div className="space-y-2">
        {coupons.map((c) => (
          <div key={c.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3">
            <span className="font-mono text-sm font-bold">{c.code}</span>
            <Badge tone="accent">{c.type === "percent" ? `${c.value}%` : `$${c.value}`}</Badge>
            <span className="text-xs text-[var(--text-muted)]">min ${c.min_order} · uses {c.uses}{c.max_uses ? `/${c.max_uses}` : ""}</span>
            <Badge tone={c.active ? "success" : "muted"}>{c.active ? "active" : "inactive"}</Badge>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing(c.id); setForm({ code: c.code, type: c.type, value: c.value, min_order: c.min_order, max_uses: c.max_uses, expires_at: c.expires_at || "", active: c.active }); }}>Edit</Button>
              <Button size="sm" variant="danger" onClick={async () => { await sb.from("coupons").delete().eq("id", c.id); await audit("coupon_delete", {}); load(); }}>Delete</Button>
            </div>
          </div>
        ))}
        {coupons.length === 0 && <p className="text-sm text-[var(--text-muted)]">Koi coupon nahi — oopar banao.</p>}
      </div>
    </div>
  );
}
