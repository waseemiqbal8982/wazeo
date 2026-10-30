"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { STATUS_TONE, type KeyStatus } from "@/lib/apiKeys";

interface ProfileRef {
  id?: string;
  email?: string | null;
  username?: string | null;
}

interface KeyRow {
  id: string;
  name?: string | null;
  label?: string | null;
  prefix?: string;
  status: KeyStatus;
  created_at?: string;
  last_used_at?: string | null;
  expires_at?: string | null;
  uses?: number;
  usage_cap?: number | null;
  rate_limit?: number | null;
  permissions?: unknown[];
  features?: unknown[];
  revoked_at?: string | null;
  revoked_reason?: string | null;
  suspended_at?: string | null;
  banned_at?: string | null;
  user_id?: string;
  profiles?: ProfileRef | null;
}

const STATUSES = ["All", "Active", "Unused", "Expired", "Revoked", "Suspended", "Banned", "Limit reached"];

function niceDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminApiKeys() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  // generate form
  const [genEmail, setGenEmail] = useState("");
  const [genLabel, setGenLabel] = useState("");
  const [genExpiry, setGenExpiry] = useState("30");
  const [genCap, setGenCap] = useState("");
  const [genRate, setGenRate] = useState("");

  // one-time secret display
  const [newKey, setNewKey] = useState<{ key: string; last4: string } | null>(null);

  // details + guard modals
  const [detail, setDetail] = useState<KeyRow | null>(null);
  const [limitsFor, setLimitsFor] = useState<KeyRow | null>(null);
  const [extendFor, setExtendFor] = useState<KeyRow | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; id: string; title: string; body: string } | null>(null);
  const [limitCap, setLimitCap] = useState("");
  const [limitRate, setLimitRate] = useState("");
  const [extendDays, setExtendDays] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set("q", q);
      if (statusFilter !== "All") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/keys-api?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load keys");
      setKeys(data.keys || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message || "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, [page, q, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const run = useCallback(
    async (action: string, body: Record<string, unknown> = {}) => {
      setBusy(true);
      setError("");
      setFeedback("");
      try {
        const res = await fetch("/api/admin/keys-api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...body }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Action failed");
        if (data.key) setNewKey({ key: data.key, last4: data.last4 });
        setFeedback("Done.");
        await load();
        return data;
      } catch (e: any) {
        setError(e.message || "Action failed");
        return null;
      } finally {
        setBusy(false);
        setConfirm(null);
      }
    },
    [load]
  );

  const doGenerate = async () => {
    await run("generate", {
      email: genEmail,
      label: genLabel,
      expiryDays: genExpiry === "" ? null : genExpiry,
      usageCap: genCap === "" ? null : genCap,
      rateLimit: genRate === "" ? null : genRate,
    });
    setGenEmail("");
    setGenLabel("");
    setGenCap("");
    setGenRate("");
  };

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Customer API Keys</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Machine-to-machine credentials. Full keys are shown once at creation and stored only as a hash.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input label="Customer email" placeholder="user@example.com" value={genEmail} onChange={(e) => setGenEmail(e.target.value)} />
          <Input label="Label / name" placeholder="My app" value={genLabel} onChange={(e) => setGenLabel(e.target.value)} />
          <Input label="Expiry (days)" placeholder="30" value={genExpiry} onChange={(e) => setGenExpiry(e.target.value)} />
          <Input label="Usage cap (optional)" placeholder="unlimited" value={genCap} onChange={(e) => setGenCap(e.target.value)} />
          <Input label="Rate limit (optional)" placeholder="unlimited" value={genRate} onChange={(e) => setGenRate(e.target.value)} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button size="md" loading={busy} onClick={doGenerate}>Generate API Key</Button>
          {feedback && <span className="text-xs text-emerald-300">{feedback}</span>}
          {error && <span className="text-xs text-red-300">{error}</span>}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-[var(--accent)] text-white" : "bg-white/[0.05] text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="ml-auto w-full sm:w-64">
            <Input placeholder="Search name, label, prefix…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">Loading keys…</p>
        ) : keys.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">No keys found.</p>
        ) : (
          <>
            {/* Mobile: stacked cards (no horizontal scroll) */}
            <ul className="space-y-3 md:hidden">
              {keys.map((k) => (
                <li key={k.id} className="rounded-xl border border-[var(--border)] bg-black/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button onClick={() => setDetail(k)} className="block max-w-full truncate text-left font-medium text-[var(--accent)] hover:underline">
                        {k.label || k.name || "API Key"}
                      </button>
                      <div className="truncate font-mono text-xs text-[var(--text-muted)]">{k.prefix}</div>
                    </div>
                    <Badge className={STATUS_TONE[k.status] || ""}>{k.status}</Badge>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div><dt className="inline text-[var(--text-muted)]">Customer </dt><dd className="inline">{k.profiles?.email || "—"}</dd></div>
                    <div><dt className="inline text-[var(--text-muted)]">Created </dt><dd className="inline">{niceDate(k.created_at)}</dd></div>
                    <div><dt className="inline text-[var(--text-muted)]">Expires </dt><dd className="inline">{niceDate(k.expires_at)}</dd></div>
                    <div><dt className="inline text-[var(--text-muted)]">Used </dt><dd className="inline">{Number(k.uses || 0)}{k.usage_cap ? ` / ${k.usage_cap}` : ""}</dd></div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {k.status !== "Revoked" && k.status !== "Banned" && k.status !== "Limit reached" && (
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => setConfirm({ action: k.status === "Suspended" ? "reactivate" : "suspend", id: k.id, title: k.status === "Suspended" ? "Reactivate key" : "Suspend key", body: `Mark ${k.label || k.name} as ${k.status === "Suspended" ? "active" : "suspended"}?` })}>
                        {k.status === "Suspended" ? "Reactivate" : "Suspend"}
                      </Button>
                    )}
                    {k.status !== "Revoked" && k.status !== "Banned" && (
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => setConfirm({ action: "revoke", id: k.id, title: "Revoke key", body: `Revoke ${k.label || k.name}? This immediately invalidates it.` })}>
                        Revoke
                      </Button>
                    )}
                    {k.status === "Banned" && (
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => setConfirm({ action: "unban", id: k.id, title: "Unban key", body: "Restore this key to active?" })}>
                        Unban
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setLimitsFor(k); setLimitCap(String(k.usage_cap ?? "")); setLimitRate(String(k.rate_limit ?? "")); }}>Limits</Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setExtendFor(k); setExtendDays("30"); }}>Extend</Button>
                    <Button size="sm" variant="ghost" disabled={busy}
                      onClick={() => setConfirm({ action: "regenerate", id: k.id, title: "Regenerate key", body: "Generate a new secret for this key? The old secret will be invalidated immediately." })}>
                      Regenerate
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <th className="pb-2 pr-3 font-medium">Key / Label</th>
                  <th className="pb-2 pr-3 font-medium">Customer</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Created</th>
                  <th className="pb-2 pr-3 font-medium">Expires</th>
                  <th className="pb-2 pr-3 font-medium">Used / Cap</th>
                  <th className="pb-2 pr-3 font-medium">Last used</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-[var(--border)]/60">
                    <td className="py-2.5 pr-3">
                      <button onClick={() => setDetail(k)} className="text-left font-medium text-[var(--accent)] hover:underline">
                        {k.label || k.name || "API Key"}
                      </button>
                      <div className="font-mono text-xs text-[var(--text-muted)]">{k.prefix}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium">{k.profiles?.email || "—"}</div>
                      {k.profiles?.username && <div className="text-xs text-[var(--text-muted)]">@{k.profiles.username}</div>}
                    </td>
                    <td className="py-2.5 pr-3"><Badge className={STATUS_TONE[k.status] || ""}>{k.status}</Badge></td>
                    <td className="py-2.5 pr-3">{niceDate(k.created_at)}</td>
                    <td className="py-2.5 pr-3">{niceDate(k.expires_at)}</td>
                    <td className="py-2.5 pr-3">{Number(k.uses || 0)}{k.usage_cap ? ` / ${k.usage_cap}` : ""}</td>
                    <td className="py-2.5 pr-3">{niceDate(k.last_used_at)}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {k.status !== "Revoked" && k.status !== "Banned" && k.status !== "Limit reached" && (
                          <Button size="sm" variant="outline" disabled={busy}
                            onClick={() => setConfirm({ action: k.status === "Suspended" ? "reactivate" : "suspend", id: k.id, title: k.status === "Suspended" ? "Reactivate key" : "Suspend key", body: `Mark ${k.label || k.name} as ${k.status === "Suspended" ? "active" : "suspended"}?` })}>
                            {k.status === "Suspended" ? "Reactivate" : "Suspend"}
                          </Button>
                        )}
                        {k.status !== "Revoked" && k.status !== "Banned" && (
                          <Button size="sm" variant="outline" disabled={busy}
                            onClick={() => setConfirm({ action: "revoke", id: k.id, title: "Revoke key", body: `Revoke ${k.label || k.name}? This immediately invalidates it.` })}>
                            Revoke
                          </Button>
                        )}
                        {k.status === "Banned" && (
                          <Button size="sm" variant="outline" disabled={busy}
                            onClick={() => setConfirm({ action: "unban", id: k.id, title: "Unban key", body: "Restore this key to active?" })}>
                            Unban
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setLimitsFor(k); setLimitCap(String(k.usage_cap ?? "")); setLimitRate(String(k.rate_limit ?? "")); }}>Limits</Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setExtendFor(k); setExtendDays("30"); }}>Extend</Button>
                        <Button size="sm" variant="ghost" disabled={busy}
                          onClick={() => setConfirm({ action: "regenerate", id: k.id, title: "Regenerate key", body: "Generate a new secret for this key? The old secret will be invalidated immediately." })}>
                          Regenerate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}

        {total > 25 && (
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{total} keys · page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* one-time secret display */}
      <Modal open={!!newKey} onClose={() => setNewKey(null)} title="Key generated — copy it now">
        <p className="text-sm text-[var(--text-muted)]">
          This is the only time the full key is shown. Copy it somewhere safe now. It is stored only as a cryptographic hash.
        </p>
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/30 p-4">
          <div className="break-all font-mono text-sm text-emerald-300">{newKey?.key}</div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="md" onClick={() => { navigator.clipboard?.writeText(newKey?.key || ""); setNewKey(null); }}>
            Copied — close
          </Button>
        </div>
      </Modal>

      {/* details */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="API key details" maxWidth="max-w-lg">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Status</span><Badge className={STATUS_TONE[detail.status] || ""}>{detail.status}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Masked key</span><span className="font-mono">{detail.prefix}</span></div>
            <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Customer</span><span>{detail.profiles?.email || "—"} {detail.profiles?.username ? `(@${detail.profiles.username})` : ""}</span></div>
            <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Created</span><span>{niceDate(detail.created_at)}</span></div>
            <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Expires</span><span>{niceDate(detail.expires_at)}</span></div>
            <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Last used</span><span>{niceDate(detail.last_used_at)}</span></div>
            <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Usage</span><span>{Number(detail.uses || 0)} used · cap {detail.usage_cap ?? "∞"} · rate {detail.rate_limit ?? "∞"}</span></div>
            <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Permissions</span><span>{Array.isArray(detail.permissions) && detail.permissions.length ? detail.permissions.join(", ") : "none"}</span></div>
            <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Features</span><span>{Array.isArray(detail.features) && detail.features.length ? detail.features.join(", ") : "none"}</span></div>
            {detail.revoked_at && (
              <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Revoked</span><span className="text-red-300">{niceDate(detail.revoked_at)}{detail.revoked_reason ? ` — ${detail.revoked_reason}` : ""}</span></div>
            )}
            {detail.suspended_at && (
              <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Suspended</span><span className="text-orange-300">{niceDate(detail.suspended_at)}</span></div>
            )}
            {detail.banned_at && (
              <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">Banned</span><span className="text-red-400">{niceDate(detail.banned_at)}</span></div>
            )}
          </div>
        )}
      </Modal>

      {/* set limits */}
      <Modal open={!!limitsFor} onClose={() => setLimitsFor(null)} title="Edit limits">
        <div className="space-y-3">
          <Input label="Usage cap (number of calls, empty = unlimited)" value={limitCap} onChange={(e) => setLimitCap(e.target.value)} />
          <Input label="Rate limit (calls per minute, empty = unlimited)" value={limitRate} onChange={(e) => setLimitRate(e.target.value)} />
          <Button size="md" full loading={busy} onClick={() => run("setLimits", { id: limitsFor?.id, usageCap: limitCap === "" ? null : limitCap, rateLimit: limitRate === "" ? null : limitRate })}>
            Save limits
          </Button>
        </div>
      </Modal>

      {/* extend */}
      <Modal open={!!extendFor} onClose={() => setExtendFor(null)} title="Extend expiry">
        <div className="space-y-3">
          <Select label="Set expiry" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} options={[
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
            { value: "365", label: "1 year" },
            { value: "permanent", label: "Never expires" },
          ]} />
          <Button size="md" full loading={busy} onClick={() => run("extend", { id: extendFor?.id, days: extendDays })}>Save expiry</Button>
        </div>
      </Modal>

      {/* confirm destructive */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title}>
        <p className="text-sm text-[var(--text-muted)]">{confirm?.body}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="md" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="danger" size="md" loading={busy} onClick={() => confirm && run(confirm.action, { id: confirm.id })}>Confirm</Button>
        </div>
      </Modal>
    </div>
  );
}

