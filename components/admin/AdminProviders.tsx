"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { formatDateTime } from "@/lib/currency";

interface Provider {
  id: string;
  name: string;
  api_url: string | null;
  api_format?: string | null;
  hasApiKey: boolean;
  api_key_masked?: string | null;
  active: boolean;
  status?: string;
  priority: number;
  weight?: number;
  markup_pct?: number;
  currency?: string;
  balance?: number;
  balance_at?: string | null;
  balance_stale?: boolean;
  error_rate?: number;
  low_balance_threshold?: number;
  concurrency_cap?: number;
}

interface LogRow {
  id: string;
  provider_id: string | null;
  action: string;
  ok: boolean;
  http_status?: number;
  retries?: number;
  duration_ms?: number;
  error?: string;
  response_masked?: string;
  created_at: string;
}

const empty = {
  name: "",
  api_url: "",
  api_key: "",
  api_format: "smm_v2",
  currency: "USD",
  priority: 0,
  weight: 1,
  markup_pct: 30,
  active: true,
  low_balance_threshold: 0,
  concurrency_cap: 5,
};

function healthTone(p: Provider): "success" | "warning" | "danger" | "muted" {
  if (p.status === "paused") return "danger";
  if (p.balance_stale) return "warning";
  if (p.active === false) return "muted";
  return "success";
}

export function AdminProviders() {
  const { toast } = useToast();
  const [list, setList] = useState<Provider[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState("");
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logProvider, setLogProvider] = useState("");
  const [logOk, setLogOk] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/admin/providers");
      if (res.ok) {
        const data = await res.json();
        setList(data.providers || []);
      }
    } catch {}
  }

  async function loadLogs() {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    let q = sb.from("provider_logs").select("*").order("created_at", { ascending: false }).limit(80);
    if (logProvider) q = q.eq("provider_id", logProvider);
    if (logOk) q = q.eq("ok", logOk === "ok");
    const { data } = await q;
    setLogs(data || []);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadLogs(); }, [logProvider, logOk]);

  async function save() {
    if (!form.name.trim()) return toast({ title: "Provider name required", variant: "danger" });
    setBusy(editing ?? "new");
    setBusyKind("save");
    try {
      const payload: any = { ...form };
      if (editing) payload.id = editing;
      if (!payload.api_key) delete payload.api_key;
      const res = await fetch("/api/admin/providers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return toast({ title: data.error || "Save failed", variant: "danger" });
      toast({ title: "Provider saved", variant: "success" });
      setEditing(null);
      setForm(empty);
      load();
    } catch {
      toast({ title: "Save failed", variant: "danger" });
    } finally {
      setBusy(null);
    }
  }

  function edit(p: Provider) {
    setEditing(p.id);
    setForm({
      name: p.name,
      api_url: p.api_url || "",
      api_key: "",
      api_format: p.api_format || "smm_v2",
      currency: p.currency || "USD",
      priority: p.priority,
      weight: p.weight ?? 1,
      markup_pct: p.markup_pct ?? 30,
      active: p.active,
      low_balance_threshold: p.low_balance_threshold ?? 0,
      concurrency_cap: p.concurrency_cap ?? 5,
    });
  }

  async function testProvider(id: string) {
    setBusy(id);
    setBusyKind("test");
    try {
      const res = await fetch(`/api/admin/providers/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTestResults((m) => ({ ...m, [id]: `✅ balance ${data.balance} ${data.currency} · ${data.serviceCount} services · ${data.latencyMs}ms` }));
      } else {
        setTestResults((m) => ({ ...m, [id]: `❌ ${data.error || "test failed"}` }));
      }
      load();
    } catch {
      setTestResults((m) => ({ ...m, [id]: "❌ request failed" }));
    } finally {
      setBusy(null);
    }
  }

  async function syncProvider(id: string) {
    setBusy(id);
    setBusyKind("sync");
    try {
      const res = await fetch(`/api/admin/providers/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTestResults((m) => ({ ...m, [id]: `✅ synced ${data.count} services (added ${data.changes.added}, removed ${data.changes.removed}, rate changed ${data.changes.rateChanged})` }));
      } else {
        setTestResults((m) => ({ ...m, [id]: `❌ ${data.error || "sync failed"}` }));
      }
    } catch {
      setTestResults((m) => ({ ...m, [id]: "❌ request failed" }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold">{editing ? "Edit provider" : "Add provider"}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="API URL (https only)" value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} />
          <div className="flex gap-2">
            <Input type="password" placeholder="API key (blank to keep)" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
            <Select value={form.api_format} onChange={(e) => setForm({ ...form, api_format: e.target.value })} options={[{ value: "smm_v2", label: "SMM v2" }, { value: "mock", label: "Mock" }]} className="w-36" />
          </div>
          <Input placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          <Input type="number" placeholder="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          <Input type="number" placeholder="Weight" value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
          <Input type="number" placeholder="Markup %" value={form.markup_pct} onChange={(e) => setForm({ ...form, markup_pct: Number(e.target.value) })} />
          <Input type="number" placeholder="Low-balance threshold" value={form.low_balance_threshold} onChange={(e) => setForm({ ...form, low_balance_threshold: Number(e.target.value) })} />
          <Input type="number" placeholder="Concurrency cap" value={form.concurrency_cap} onChange={(e) => setForm({ ...form, concurrency_cap: Number(e.target.value) })} />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} loading={Boolean(busy && busyKind === "save")}>{editing ? "Update" : "Create"} provider</Button>
          {editing && <Button variant="outline" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</Button>}
        </div>
      </Card>

      <div className="space-y-2">
        {list.length === 0 && <EmptyState title="No providers" description="Add your first provider above." />}
        {list.map((p) => (
          <div key={p.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${healthTone(p) === "success" ? "bg-emerald-400" : healthTone(p) === "warning" ? "bg-amber-400" : healthTone(p) === "danger" ? "bg-rose-500" : "bg-zinc-500"}`} title={`status: ${p.status || "active"}`} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.name} <Badge tone="accent">{p.api_format || "smm_v2"}</Badge>
                {p.status === "paused" && <Badge tone="danger">paused</Badge>}
                {p.balance_stale && <Badge tone="warning">stale</Badge>}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {p.api_url || "no url"} · key {p.hasApiKey ? p.api_key_masked || "set" : "not set"} · error rate {((Number(p.error_rate) || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                balance <span className="font-mono">{Number(p.balance ?? 0).toFixed(2)} {p.currency || "USD"}</span>
                {" · "}updated {p.balance_at ? formatDateTime(p.balance_at) : "never"}
              </p>
              {testResults[p.id] && <p className="text-xs text-[var(--text-muted)]">{testResults[p.id]}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" loading={busy === p.id && busyKind === "test"} onClick={() => testProvider(p.id)}>Test</Button>
              <Button size="sm" variant="outline" loading={busy === p.id && busyKind === "sync"} onClick={() => syncProvider(p.id)}>Sync</Button>
              <Button size="sm" variant="outline" onClick={() => edit(p)}>Edit</Button>
            </div>
          </div>
        ))}
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-2">
          <p className="text-sm font-semibold">Provider call logs</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Select value={logProvider} onChange={(e) => setLogProvider(e.target.value)} options={[{ value: "", label: "All providers" }, ...list.map((p) => ({ value: p.id, label: p.name }))]} className="w-40" />
            <Select value={logOk} onChange={(e) => setLogOk(e.target.value)} options={[{ value: "", label: "All results" }, { value: "ok", label: "ok" }, { value: "err", label: "error" }]} className="w-32" />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#12121f]">
              <tr className="text-left text-[var(--text-muted)]">
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-2 py-2 font-medium">Provider</th>
                <th className="px-2 py-2 font-medium">Action</th>
                <th className="px-2 py-2 font-medium">Result</th>
                <th className="px-2 py-2 font-medium">ms</th>
                <th className="px-4 py-2 font-medium">Error / response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-1.5 text-[var(--text-muted)]">{formatDateTime(l.created_at)}</td>
                  <td className="px-2 py-1.5 text-[var(--text-muted)]">{list.find((p) => p.id === l.provider_id)?.name || "—"}</td>
                  <td className="px-2 py-1.5"><Badge tone="muted">{l.action}</Badge></td>
                  <td className="px-2 py-1.5"><Badge tone={l.ok ? "success" : "danger"}>{l.ok ? "ok" : "error"}</Badge></td>
                  <td className="px-2 py-1.5">{l.duration_ms ?? "—"}</td>
                  <td className="px-4 py-1.5 font-mono text-[var(--text-muted)]">{l.error || l.response_masked || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-[var(--text-muted)]">No provider calls logged yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
