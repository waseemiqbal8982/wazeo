"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { STATUS_TONE, type KeyStatus } from "@/lib/apiKeys";

interface KeyRow {
  id: string;
  label?: string | null;
  prefix?: string;
  status: KeyStatus;
  created_at?: string;
  expires_at?: string | null;
  last_used_at?: string | null;
  uses?: number;
  usage_cap?: number | null;
  rate_limit?: number | null;
}

function niceDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function CustomerApiKeys() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("30");
  const [newKey, setNewKey] = useState<{ key: string } | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; id: string; body: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/keys");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setKeys(data.keys || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (method: string, body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/user/keys", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.key) setNewKey({ key: data.key });
      await load();
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-lg font-semibold">API Keys</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Use keys to access Wazeo programmatically. The full key is shown only once. Unused keys can be revoked anytime.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Input label="Label" placeholder="My app" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input label="Expiry (days)" placeholder="30" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          <div className="flex items-end">
            <Button full loading={busy} onClick={() => run("POST", { label, expiryDays: expiry === "" ? null : expiry })}>Create key</Button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </Card>

      <Card>
        {loading ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">No API keys yet.</p>
        ) : (
          <>
            {/* Mobile: stacked cards (no horizontal scroll) */}
            <ul className="space-y-3 md:hidden">
              {keys.map((k) => (
                <li key={k.id} className="rounded-xl border border-[var(--border)] bg-black/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{k.label || "API Key"}</div>
                      <div className="truncate font-mono text-xs text-[var(--text-muted)]">{k.prefix}</div>
                    </div>
                    <Badge className={STATUS_TONE[k.status] || ""}>{k.status}</Badge>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div><dt className="inline text-[var(--text-muted)]">Created </dt><dd className="inline">{niceDate(k.created_at)}</dd></div>
                    <div><dt className="inline text-[var(--text-muted)]">Expires </dt><dd className="inline">{niceDate(k.expires_at)}</dd></div>
                    <div><dt className="inline text-[var(--text-muted)]">Last used </dt><dd className="inline">{niceDate(k.last_used_at)}</dd></div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {k.status !== "Revoked" && (
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => setConfirm({ action: "revoke", id: k.id, body: `Revoke ${k.label || "this key"}? It will stop working immediately.` })}>
                        Revoke
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("PATCH", { action: "regenerate", id: k.id })}>Regenerate</Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                    <th className="pb-2 pr-3 font-medium">Key</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">Created</th>
                    <th className="pb-2 pr-3 font-medium">Expires</th>
                    <th className="pb-2 pr-3 font-medium">Last used</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-[var(--border)]/60">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">{k.label || "API Key"}</div>
                        <div className="font-mono text-xs text-[var(--text-muted)]">{k.prefix}</div>
                      </td>
                      <td className="py-2.5 pr-3"><Badge className={STATUS_TONE[k.status] || ""}>{k.status}</Badge></td>
                      <td className="py-2.5 pr-3">{niceDate(k.created_at)}</td>
                      <td className="py-2.5 pr-3">{niceDate(k.expires_at)}</td>
                      <td className="py-2.5 pr-3">{niceDate(k.last_used_at)}</td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {k.status !== "Revoked" && (
                            <Button size="sm" variant="outline" disabled={busy}
                              onClick={() => setConfirm({ action: "revoke", id: k.id, body: `Revoke ${k.label || "this key"}? It will stop working immediately.` })}>
                              Revoke
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("PATCH", { action: "regenerate", id: k.id })}>Regenerate</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal open={!!newKey} onClose={() => setNewKey(null)} title="Key created — copy it now">
        <p className="text-sm text-[var(--text-muted)]">This is shown only once. Copy it now; it is stored only as a cryptographic hash.</p>
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/30 p-4">
          <div className="break-all font-mono text-sm text-emerald-300">{newKey?.key}</div>
        </div>
        <Button className="mt-4" size="md" onClick={() => { navigator.clipboard?.writeText(newKey?.key || ""); setNewKey(null); }}>Copied — close</Button>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Confirm revoke">
        <p className="text-sm text-[var(--text-muted)]">{confirm?.body}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="md" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="danger" size="md" loading={busy} onClick={() => confirm && run("PATCH", { action: confirm.action, id: confirm.id })}>Confirm</Button>
        </div>
      </Modal>
    </div>
  );
}

