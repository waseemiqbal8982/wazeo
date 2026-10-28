"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatMoney, formatDateTime } from "@/lib/currency";
import { countryFlag, countryName } from "@/lib/countries";
import { currencyInfo } from "@/lib/currencies";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

const LANG_LABEL: Record<string, string> = {
  en: "English", ur: "اردو", hi: "हिन्दी", fr: "Français", zh: "中文",
};
const ROLES = ["user", "admin", "support"];

interface UserRow {
  id: string;
  username: string;
  email?: string;
  role: string;
  balance: number;
  banned: boolean;
  created_at: string;
  last_login_at?: string | null;
  phone?: string;
  country?: string;
  language?: string;
  currency?: string;
  referral_code?: string;
  referral_used?: string;
  notes?: string;
  access_key_id?: string | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export function AdminUsers() {
  const supabase = createClient();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [viewUser, setViewUser] = useState<UserRow | null>(null);
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({});
  const [keyLabels, setKeyLabels] = useState<Record<string, string>>({});
  const [vFilter, setVFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adjustUser, setAdjustUser] = useState<UserRow | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [bulkRole, setBulkRole] = useState<string | null>(null);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [globalLogins, setGlobalLogins] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    const ids = (data || []).map((u) => u.access_key_id).filter(Boolean) as string[];
    if (ids.length) {
      const { data: keys } = await supabase.from("access_codes").select("id,label,email").in("id", ids);
      const map: Record<string, string> = {};
      (keys || []).forEach((k) => { map[k.id] = k.label || k.email || "Access key"; });
      setKeyLabels(map);
    }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    fetch("/api/admin/users/verified").then((r) => r.json()).then((d) => { if (d?.verified) setVerifiedMap(d.verified); }).catch(() => {});
    fetch("/api/admin/users/login-history").then((r) => r.json()).then((d) => { if (d?.rows) setGlobalLogins(d.rows.slice(0, 20)); }).catch(() => {});
  }, []);

  const filtered = users.filter((u) => {
    if (q && !u.username.toLowerCase().includes(q.toLowerCase()) && !(u.email || "").toLowerCase().includes(q.toLowerCase())) return false;
    const v = !!verifiedMap[u.id];
    if (vFilter === "verified" && !v) return false;
    if (vFilter === "unverified" && v) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    return true;
  });

  async function fetchHistory(userId: string) {
    const res = await fetch(`/api/admin/users/login-history?userId=${encodeURIComponent(userId)}`);
    const d = await res.json().catch(() => ({}));
    setLoginHistory(d.rows || []);
  }

  function openView(u: UserRow) {
    setViewUser(u);
    setLoginHistory([]);
    fetchHistory(u.id);
  }

  async function runVerify(id: string, action: string) {
    const res = await fetch("/api/admin/users/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, action }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast({ title: d.error || "Failed", variant: "danger" });
    toast({ title: action === "mark_verified" ? "Marked verified" : "Resend sent", variant: "success" });
    const r = await fetch("/api/admin/users/verified");
    const x = await r.json().catch(() => ({}));
    if (x?.verified) setVerifiedMap(x.verified);
  }

  async function toggleBan(u: UserRow) {
    await supabase.from("profiles").update({ banned: !u.banned }).eq("id", u.id);
    toast({ title: u.banned ? "Unbanned" : "Banned", variant: "success" });
    load();
  }

  async function applyAdjust() {
    if (!adjustUser) return;
    const amt = Number(amount);
    if (!amt || amt === 0) return toast({ title: "Enter a non-zero amount", variant: "danger" });
    setBusy(true);
    const { error } = await supabase.rpc("admin_adjust_balance", { p_user_id: adjustUser.id, p_amount: amt, p_note: "Admin adjustment" });
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "danger" });
    toast({ title: "Balance updated", variant: "success" });
    setAdjustUser(null);
    setAmount("");
    load();
  }

  async function resetPassword(u: UserRow) {
    setBusy(true);
    const res = await fetch("/api/admin/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast({ title: d.error || "Failed", variant: "danger" });
    toast({ title: "Reset email sent", variant: "success" });
  }

  async function impersonate(u: UserRow) {
    setBusy(true);
    const res = await fetch("/api/admin/users/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.url) return toast({ title: d.error || "Failed", variant: "danger" });
    window.location.href = d.url;
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectVisible() {
    const visible = new Set(filtered.map((u) => u.id));
    const allSelected = visible.size > 0 && [...visible].every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : visible);
  }

  async function bulk(action: string, value?: string | number) {
    if (!selected.size) return toast({ title: "No users selected", variant: "danger" });
    setBusy(true);
    const res = await fetch("/api/admin/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userIds: [...selected], value }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast({ title: d.error || "Failed", variant: "danger" });
    const failed = (d.results || []).filter((r: { ok?: boolean }) => !r.ok);
    if (failed.length) toast({ title: `${failed.length} failed`, variant: "danger" });
    else toast({ title: "Done", variant: "success" });
    setSelected(new Set());
    load();
  }

  function exportCsv() {
    if (!filtered.length) return toast({ title: "Nothing to export", variant: "danger" });
    const cols = ["id", "username", "email", "role", "balance", "banned", "created_at", "last_login_at", "country", "language", "currency", "verified"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      cols.join(","),
      ...filtered.map((u) => cols.map((c) => {
        if (c === "verified") return esc(!!verifiedMap[u.id]);
        return esc((u as any)[c]);
      }).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wazeo-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search by username or email" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
          <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-8 rounded-full border border-[var(--border)] bg-white/[0.03] px-3 text-xs text-[var(--text)] focus:outline-none">
            <option value="all">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/[0.03] p-0.5 text-xs">
            {[["all", "All"], ["verified", "Verified"], ["unverified", "Unverified"]].map(([val, label]) => (
              <button key={val} onClick={() => setVFilter(val)} className={cn("rounded-full px-3 py-1 font-medium transition-colors", vFilter === val ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]")}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-3 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulk("ban")}>Ban</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("unban")}>Unban</Button>
          <Button size="sm" variant="outline" onClick={() => setAdjustUser({ id: "", username: `bulk (${selected.size})` } as UserRow)}>+ / − balance</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("mark_verified")}>Mark verified</Button>
          <Select value={bulkRole || ""} onChange={(e) => { setBulkRole(e.target.value); if (e.target.value) bulk("set_role", e.target.value); }} options={[{ value: "", label: "Set role…" }, ...ROLES.map((r) => ({ value: r, label: r }))]} className="w-36" />
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-xs text-[var(--text-muted)]">
              <th className="w-10 px-2 py-2">
                <input type="checkbox" checked={filtered.length > 0 && [...filtered].every((u) => selected.has(u.id))} onChange={selectVisible} className="h-4 w-4" />
              </th>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Country</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Balance</th>
              <th className="px-4 py-2 font-medium">Last login</th>
              <th className="px-4 py-2 font-medium">Verified</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.03]">
                <td className="px-2 py-2.5">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="h-4 w-4" />
                </td>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs text-[var(--text-muted)]">{u.email || u.id.slice(0, 8)}</p>
                  {u.access_key_id && <span className="mt-0.5 inline-flex"><Badge tone="accent">🔑 Key</Badge></span>}
                </td>
                <td className="px-4 py-2.5">{u.country ? <span className="inline-flex items-center gap-1.5">{countryFlag(u.country)} {u.country}</span> : "—"}</td>
                <td className="px-4 py-2.5">
                  <Select value={u.role} onChange={(e) => { void bulk("set_role", e.target.value).then(() => load()); }} disabled={busy} options={ROLES.map((r) => ({ value: r, label: r }))} className="w-28" />
                </td>
                <td className="px-4 py-2.5">{formatMoney(u.balance)}</td>
                <td className="px-4 py-2.5 text-xs">{u.last_login_at ? formatDateTime(u.last_login_at) : "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={verifiedMap[u.id] ? "success" : "warning"}>{verifiedMap[u.id] ? "Verified" : "Not verified"}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={u.banned ? "danger" : "success"}>{u.banned ? "Banned" : "Active"}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openView(u)}>View</Button>
                    {!verifiedMap[u.id] && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => runVerify(u.id, "mark_verified")}>Verify</Button>
                        <Button size="sm" variant="ghost" onClick={() => runVerify(u.id, "resend")}>Resend</Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setAdjustUser(u); setAmount(""); }}>Balance</Button>
                    <Button size="sm" variant="outline" onClick={() => impersonate(u)} loading={busy}>Login as</Button>
                    <Button size="sm" variant={u.banned ? "outline" : "danger"} onClick={() => toggleBan(u)}>{u.banned ? "Unban" : "Ban"}</Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title={`Profile — ${viewUser?.username ?? ""}`}>
        {viewUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Username">{viewUser.username}</Field>
              <Field label="Role"><Badge tone={viewUser.role === "admin" ? "accent" : viewUser.role === "support" ? "warning" : "muted"}>{viewUser.role}</Badge></Field>
              <Field label="Email">{viewUser.email || "—"}</Field>
              <Field label="Phone">{viewUser.phone || "—"}</Field>
              <Field label="Country">{viewUser.country ? `${countryName(viewUser.country)} (${viewUser.country})` : "—"}</Field>
              <Field label="Language">{viewUser.language ? LANG_LABEL[viewUser.language] || viewUser.language : "—"}</Field>
              <Field label="Currency">{viewUser.currency ? `${currencyInfo(viewUser.currency).symbol} ${viewUser.currency}` : "USD"}</Field>
              <Field label="Balance">{formatMoney(viewUser.balance)}</Field>
              <Field label="Signup date">{formatDateTime(viewUser.created_at)}</Field>
              <Field label="Last login">{viewUser.last_login_at ? formatDateTime(viewUser.last_login_at) : "—"}</Field>
              <Field label="Referral code">{viewUser.referral_code || "—"}</Field>
              <Field label="Signed up with key">{viewUser.access_key_id ? (keyLabels[viewUser.access_key_id] || "Yes") : "No"}</Field>
            </div>
            {viewUser.notes && <Field label="Notes">{viewUser.notes}</Field>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => resetPassword(viewUser)} loading={busy}>Send reset email</Button>
              <Button size="sm" variant="outline" onClick={() => impersonate(viewUser)} loading={busy}>Login as user</Button>
              <Button size="sm" variant="outline" onClick={() => { setAdjustUser(viewUser); setAmount(""); }}>Adjust balance</Button>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Login history</p>
              {loginHistory.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No logins recorded yet.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#12121f]">
                      <tr className="text-left text-[var(--text-muted)]">
                        <th className="px-3 py-1.5 font-medium">When</th>
                        <th className="px-3 py-1.5 font-medium">Method</th>
                        <th className="px-3 py-1.5 font-medium">IP hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {loginHistory.map((l) => (
                        <tr key={l.id}>
                          <td className="px-3 py-1.5">{formatDateTime(l.created_at)}</td>
                          <td className="px-3 py-1.5"><Badge tone="muted">{l.method}</Badge></td>
                          <td className="px-3 py-1.5 font-mono">{l.ip_hash || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!adjustUser} onClose={() => setAdjustUser(null)} title={adjustUser?.id ? `Adjust balance — ${adjustUser.username}` : `Adjust balance — ${selected.size} users`}>
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-muted)]">Amount (+ adds, − deducts).</p>
          <Input label="Amount (+/-)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100 or -50" />
          <div className="flex gap-2">
            <Button full loading={busy} onClick={() => {
              if (adjustUser?.id) applyAdjust();
              else if (selected.size) { bulk(Number(amount) < 0 ? "deduct_balance" : "add_balance", Math.abs(Number(amount))); setAdjustUser(null); }
            }}>Apply</Button>
            <Button variant="outline" onClick={() => setAdjustUser(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <div className="glass rounded-2xl p-4">
        <p className="mb-2 text-sm font-semibold">Recent logins (global)</p>
        {globalLogins.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No logins recorded yet.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-[var(--border)]">
                {globalLogins.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5 pr-3 font-medium">{l.username}</td>
                    <td className="py-1.5 pr-3"><Badge tone="muted">{l.method}</Badge></td>
                    <td className="py-1.5 pr-3 text-[var(--text-muted)]">{formatDateTime(l.created_at)}</td>
                    <td className="py-1.5 font-mono text-[var(--text-muted)]">{l.ip_hash || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}




