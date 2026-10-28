"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { audit } from "@/lib/audit";

interface Provider {
  id: string;
  name: string;
  api_url: string | null;
  api_key: string | null;
  active: boolean;
  priority: number;
  mode: string;
}

const empty = { name: "", api_url: "", api_key: "", active: true, priority: 0, mode: "mock" };

export function AdminProviders() {
  const sb = createClient();
  const { toast } = useToast();
  const [list, setList] = useState<Provider[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>("");

  async function load() {
    const { data } = await sb.from("providers").select("*").order("priority");
    setList(data || []);
  }
  useEffect(() => { load(); }, []);

  function mask(k?: string | null) {
    if (!k) return "—";
    return "••••••••" + k.slice(-4);
  }

  async function save() {
    if (!form.name.trim()) return toast({ title: "Provider name required", variant: "danger" });
    if (editing) await sb.from("providers").update(form).eq("id", editing);
    else await sb.from("providers").insert(form);
    await audit(editing ? "provider_update" : "provider_create", { name: form.name });
    toast({ title: "Provider saved", variant: "success" });
    setEditing(null);
    setForm(empty);
    load();
  }

  function edit(p: Provider) {
    setEditing(p.id);
    setForm({ name: p.name, api_url: p.api_url || "", api_key: "", active: p.active, priority: p.priority, mode: p.mode });
  }

  async function remove(id: string) {
    await sb.from("providers").delete().eq("id", id);
    await audit("provider_delete", {});
    load();
  }

  async function syncServices() {
    setSyncing(true);
    setTestResult("");
    try {
      const res = await fetch("/api/provider/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setTestResult(`❌ ${data.error || "Sync failed"}`);
      } else {
        setTestResult(`✅ Synced ${data.count} services (${data.mock ? "mock" : "live"} mode).`);
      }
    } catch {
      setTestResult("❌ Sync request failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch("/api/admin/providers/test", { method: "POST" });
      const data = await res.json();
      setTestResult(data.ok ? `✅ ${data.message} Balance: ${data.balance}` : `❌ ${data.error}`);
    } catch {
      setTestResult("❌ Test request failed.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Providers</h1>
          <p className="text-sm text-[var(--text-muted)]">SMM API providers. API key sirf server-side store hota hai.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" loading={syncing} onClick={syncServices}>Sync services</Button>
          <Button size="sm" variant="outline" loading={testing} onClick={testConnection}>Test connection</Button>
          <Button size="sm" onClick={() => { setEditing(null); setForm(empty); }}>+ Add provider</Button>
        </div>
      </div>

      {testResult && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
          {testResult}
        </div>
      )}

      {list.length === 0 && !editing && (
        <EmptyState title="Provider baad mein add karna hai"
          description={`Panel abhi MOCK mode mein chal raha hai. Admin koi bhi provider yahan add kar sakta hai.`} />
      )}

      <Card className="space-y-3">
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="API URL (server-side)" value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://api.smm.com/api/v2" />
        <Input label="API Key (server-side, masked)" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder={editing ? mask(list.find((p) => p.id === editing)?.api_key) : ""} />
        <div className="grid grid-cols-3 gap-3">
          <Select label="Mode" options={[{ value: "mock", label: "Mock" }, { value: "live", label: "Live" }]} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} />
          <Input label="Priority" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
        </div>
        <Button onClick={save}>{editing ? "Update" : "Create"} provider</Button>
      </Card>

      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.name} <Badge tone={p.mode === "live" ? "success" : "warning"}>{p.mode}</Badge></p>
              <p className="truncate text-xs text-[var(--text-muted)]">{p.api_url || "no url"} · key {mask(p.api_key)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => edit(p)}>Edit</Button>
            <Button size="sm" variant="outline" loading={testing} onClick={testConnection}>Test</Button>
            <Button size="sm" variant="danger" onClick={() => remove(p.id)}>Delete</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
