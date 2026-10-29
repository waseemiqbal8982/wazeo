"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/currency";
import { isMockMode } from "@/lib/provider";
import { isMercuryConfigured } from "@/lib/ai";

export function AdminSystem() {
  const sb = createClient();
  const [audits, setAudits] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState({ db: "check", provider: isMockMode() ? "mock" : "live", ai: isMercuryConfigured() ? "green" : "off" });
  const [pluginExecs, setPluginExecs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count }, { data: a }, { data: e }] = await Promise.all([
        sb.from("profiles").select("id", { count: "exact", head: true }),
        sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
        sb.from("error_logs").select("*").order("created_at", { ascending: false }).limit(30),
      ]);
      setStatus({ db: count !== null ? "green" : "red", provider: isMockMode() ? "mock" : "live", ai: isMercuryConfigured() ? "green" : "off" });
      setAudits(a || []);
      setErrors(e || []);
    })();
  }, []);

  useEffect(() => {
    sb.from("plugin_executions").select("*").order("created_at", { ascending: false }).limit(30).then(({ data }) => setPluginExecs(data || []));
  }, []);

  const filteredAudits = audits.filter((x) => !filter || x.action.includes(filter));

  async function exportJSON(table: string) {
    const { data } = await sb.from(table).select("*").limit(500);
    const blob = new Blob([JSON.stringify(data || [], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = url;
    aEl.download = `${table}-backup.json`;
    aEl.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">System</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatusCard label="Database" val={status.db === "green" ? "Connected" : "Check"} ok={status.db === "green"} />
        <StatusCard label="Provider" val={status.provider === "mock" ? "Mock mode" : "Live"} ok={status.provider !== "mock"} />
        <StatusCard label="Mercury AI" val={status.ai === "green" ? "Configured" : "Off/fallback"} ok={status.ai === "green"} />
        <StatusCard label="Cron" val="GitHub Actions" ok />
      </div>

      <div className="flex flex-wrap gap-2">
        {["profiles", "orders", "payments", "tickets"].map((t) => (
          <Button key={t} size="sm" variant="outline" onClick={() => exportJSON(t)}>Export {t} (JSON)</Button>
        ))}
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 p-4 pb-2">
          <p className="text-sm font-semibold">Activity log (audit_logs)</p>
          <Input placeholder="Filter action" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-44" />
        </div>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#12121f]">
              <tr className="text-left text-xs text-[var(--text-muted)]">
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredAudits.slice(0, 30).map((x) => (
                <tr key={x.id}>
                  <td className="px-4 py-2"><Badge tone="muted">{x.action}</Badge></td>
                  <td className="px-4 py-2 text-[var(--text-muted)]">{formatDateTime(x.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-0">
        <p className="p-4 pb-2 text-sm font-semibold">Error log</p>
        <div className="max-h-48 overflow-y-auto px-4 pb-4">
          {errors.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Koi error logged nahi.</p>
          ) : (
            <ul className="space-y-1 text-xs text-[var(--text-muted)]">
              {errors.map((e) => (
                <li key={e.id}>[{formatDateTime(e.created_at)}] {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold">Admin security</p>
        <p className="text-sm text-[var(--text-muted)]">
          Two-factor (email/TOTP) 2FA default se hidden/disabled hai. Ab Admin PIN use hota hai —
          Admin → Settings → Security me set karo.
        </p>
      </Card>

      <Card className="p-0">
        <p className="p-4 pb-2 text-sm font-semibold">Plugin executions (hook log)</p>
        <div className="max-h-64 overflow-y-auto">
          {pluginExecs.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-[var(--text-muted)]">No plugin executions yet.</p>
          ) : (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-[var(--border)]">
                {pluginExecs.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-1.5 font-medium">{e.plugin_id}</td>
                    <td className="px-2 py-1.5 text-[var(--text-muted)]">{e.hook}</td>
                    <td className="px-2 py-1.5"><Badge tone={e.ok ? "success" : "danger"}>{e.ok ? "ok" : "error"}</Badge></td>
                    <td className="px-2 py-1.5 text-[var(--text-muted)]">{e.error || ""}</td>
                    <td className="px-4 py-1.5 text-[var(--text-muted)]">{formatDateTime(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

function StatusCard({ label, val, ok }: { label: string; val: string; ok: boolean }) {
  return (
    <Card>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{val}</p>
      <span className={`mt-1 inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
    </Card>
  );
}
