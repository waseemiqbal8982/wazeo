"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { THEMES } from "@/lib/constants";

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
    { key: "oauth_google_client_id", label: "Google OAuth client ID" },
    { key: "oauth_google_client_secret", label: "Google OAuth client secret" },
    { key: "oauth_twitter_client_id", label: "Twitter/X OAuth client ID" },
    { key: "oauth_twitter_client_secret", label: "Twitter/X OAuth client secret" },
    { key: "oauth_github_client_id", label: "GitHub OAuth client ID" },
    { key: "oauth_github_client_secret", label: "GitHub OAuth client secret" },
    { key: "site_logo_url", label: "Site logo URL" },
    { key: "site_favicon_url", label: "Favicon URL" },
    { key: "seo_title", label: "SEO title" },
    { key: "seo_description", label: "SEO description" },
    { key: "smtp_host", label: "SMTP host" },
    { key: "smtp_port", label: "SMTP port" },
    { key: "smtp_user", label: "SMTP username" },
    { key: "smtp_pass", label: "SMTP password" },
    { key: "smtp_from", label: "SMTP from address" },
    { key: "maintenance_mode", label: "Maintenance mode (true/false)" },
    { key: "maintenance_message", label: "Maintenance message" },
    { key: "owner_name", label: "Owner name (portfolio page)" },
    { key: "owner_bio", label: "Owner bio" },
    { key: "owner_contact", label: "Owner contact details" },
    { key: "owner_email", label: "Owner email" },
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Default color theme</label>
            <Select
              value={values.default_theme ?? "purple"}
              onChange={(e) => setValues((v) => ({ ...v, default_theme: e.target.value }))}
              options={THEMES.map((t) => ({ value: t.id, label: t.label }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Default mode</label>
            <Select
              value={values.default_theme_mode ?? "dark"}
              onChange={(e) => setValues((v) => ({ ...v, default_theme_mode: e.target.value }))}
              options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}
              className="w-full"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Owner skills (JSON array)</label>
          <textarea
            value={values.owner_skills ?? "[]"}
            onChange={(e) => setValues((v) => ({ ...v, owner_skills: e.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Owner projects (JSON array)</label>
          <textarea
            value={values.owner_projects ?? "[]"}
            onChange={(e) => setValues((v) => ({ ...v, owner_projects: e.target.value }))}
            rows={4}
            className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
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
