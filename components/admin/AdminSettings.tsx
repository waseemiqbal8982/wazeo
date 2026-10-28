"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function AdminSettings() {
  const supabase = createClient();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*");
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      setValues(map);
    })();
  }, []);

  const fields = [
    { key: "site_name", label: "Site name" },
    { key: "markup_percent", label: "Default markup %" },
    { key: "referral_percent", label: "Referral bonus %" },
    { key: "support_whatsapp", label: "Support WhatsApp number (e.g. 923001234567)" },
    { key: "support_telegram", label: "Support Telegram (username or full link)" },
    { key: "support_email", label: "Support email" },
    { key: "working_hours", label: "Working hours (format HH:MM-HH:MM, e.g. 09:00-18:00)" },
    { key: "working_tz", label: "Working timezone (e.g. Asia/Karachi, UTC)" },
    { key: "support_welcome", label: "Support welcome message" },
  ];

  async function save() {
    setBusy(true);
    const rows = Object.entries(values).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("settings").upsert(rows);
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "danger" });
    toast({ title: "Settings saved", variant: "success" });
  }

  async function refreshRates() {
    setRefreshBusy(true);
    try {
      const res = await fetch("/api/admin/currencies/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) return toast({ title: data.error || "Refresh failed", variant: "danger" });
      toast({ title: "Rates refreshed", variant: "success" });
      const { data: rows } = await supabase.from("settings").select("*");
      const map: Record<string, string> = {};
      (rows || []).forEach((s) => { map[s.key] = s.value; });
      setValues((v) => ({ ...v, ...map }));
    } catch {
      toast({ title: "Network error", variant: "danger" });
    } finally {
      setRefreshBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="max-w-xl space-y-4">
        {fields.map((f) => (
          <Input
            key={f.key}
            label={f.label}
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        ))}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
            Payment methods (JSON array)
          </label>
          <textarea
            value={values.payment_methods ?? "[]"}
            onChange={(e) => setValues((v) => ({ ...v, payment_methods: e.target.value }))}
            rows={6}
            className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {"Example: [{\"name\":\"JazzCash\",\"account\":\"0300-0000000\",\"instructions\":\"Send payment and upload proof\"}]"}
          </p>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
            Currencies — rate per 1 USD (editable manually, optional auto-refresh)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {["INR", "PKR", "CNY"].map((c) => (
              <Input
                key={c}
                label={`${c} rate`}
                type="number"
                step="0.0001"
                min="0.0001"
                value={values[`rate_${c}`] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [`rate_${c}`]: e.target.value }))}
              />
            ))}
          </div>
          <Button variant="outline" size="sm" loading={refreshBusy} className="mt-2" onClick={refreshRates}>
            Refresh rates (auto)
          </Button>
        </div>
        <Button loading={busy} onClick={save}>Save settings</Button>
      </Card>
    </div>
  );
}
