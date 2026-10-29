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
  const [markAllBusy, setMarkAllBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*");
      const map: Record<string, string> = {};
      (data || []).forEach((s) => {
        // The disposable-domain setting is stored as a JSON array; show it as
        // a comma-separated list for easy editing.
        if (s.key === "disposable_email_domains" && s.value) {
          try {
            const arr = JSON.parse(s.value);
            if (Array.isArray(arr)) map[s.key] = arr.join(", ");
            else map[s.key] = s.value;
            return;
          } catch {}
        }
        map[s.key] = s.value;
      });
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
    const rows = Object.entries(values).map(([key, value]) => {
      // Convert the editable comma-separated domain list back into a JSON array.
      if (key === "disposable_email_domains") {
        const domains = String(value || "")
          .split(",")
          .map((d) => d.trim().toLowerCase().replace(/^\./, ""))
          .filter(Boolean);
        return { key, value: JSON.stringify(domains) };
      }
      return { key, value };
    });
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

  async function markAllVerified() {
    setMarkAllBusy(true);
    try {
      const res = await fetch("/api/admin/users/mark-all-verified", { method: "POST" });
      const data = await res.json();
      if (!res.ok) return toast({ title: data.error || "Failed", variant: "danger" });
      toast({ title: `Marked ${data.updated ?? 0} user(s) verified`, variant: "success" });
    } catch {
      toast({ title: "Failed", variant: "danger" });
    } finally {
      setMarkAllBusy(false);
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
        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Require email verification code for key accounts</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                When ON, every access-key account must verify with an OTP code before entering.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={values.require_key_email_verify === "true"}
              onClick={() =>
                setValues((v) => ({
                  ...v,
                  require_key_email_verify: v.require_key_email_verify === "true" ? "false" : "true",
                }))
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                values.require_key_email_verify === "true" ? "bg-[var(--accent)]" : "bg-white/[0.1]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
                  values.require_key_email_verify === "true" ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <p className="mb-3 text-sm font-semibold">Security</p>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Require email verification at sign-up</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                When ON, sign-up must confirm their email (OTP/link) before entering.
                When OFF (default), sign-up creates a confirmed user — no verification email.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={values.require_email_verify_at_signup === "true"}
              onClick={() =>
                setValues((v) => ({
                  ...v,
                  require_email_verify_at_signup: v.require_email_verify_at_signup === "true" ? "false" : "true",
                }))
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                values.require_email_verify_at_signup === "true" ? "bg-[var(--accent)]" : "bg-white/[0.1]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
                  values.require_email_verify_at_signup === "true" ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium">Disposable email domains to reject at sign-up</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Comma-separated list. Sign-ups using these domains are blocked.
            </p>
            <textarea
              value={values.disposable_email_domains ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, disposable_email_domains: e.target.value }))}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="mailinator.com, 10minutemail.com, guerrillamail.com"
            />
          </div>

          <div className="mt-4">
            <Button variant="outline" size="sm" loading={markAllBusy} onClick={markAllVerified}>
              Mark all existing users as verified
            </Button>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Bulk action, audit-logged. Safe when verification is off — it only confirms emails.
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <p className="mb-1 text-sm font-semibold">Login methods</p>
          <p className="mb-3 text-xs text-[var(--text-muted)]">
            A provider&apos;s button shows on the sign-in screen only when it is both
            enabled here AND its OAuth keys are configured below.
          </p>
          {[
            { key: "login_google_enabled", label: "Google", configuredKey: "oauth_google_client_id" },
            { key: "login_twitter_enabled", label: "X (Twitter)", configuredKey: "oauth_twitter_client_id" },
            { key: "login_github_enabled", label: "GitHub", configuredKey: "oauth_github_client_id" },
          ].map((item) => {
            const on = values[item.key] === "true";
            const configured = Boolean(values[item.configuredKey]);
            return (
              <div key={item.key} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {configured ? "Keys configured" : "Keys not configured"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() =>
                    setValues((v) => ({ ...v, [item.key]: on ? "false" : "true" }))
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                    on ? "bg-[var(--accent)]" : "bg-white/[0.1]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
                      on ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            );
          })}
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <p className="text-sm font-medium">Email and password</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Allow email + password sign-in / sign-up.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={values.login_email_password_enabled !== "false"}
              onClick={() =>
                setValues((v) => ({
                  ...v,
                  login_email_password_enabled:
                    v.login_email_password_enabled === "false" ? "true" : "false",
                }))
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                values.login_email_password_enabled !== "false" ? "bg-[var(--accent)]" : "bg-white/[0.1]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
                  values.login_email_password_enabled !== "false" ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <Button loading={busy} onClick={save}>Save settings</Button>
      </Card>
    </div>
  );
}
