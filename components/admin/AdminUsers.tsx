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
import { cn } from "@/lib/utils";

const LANG_LABEL: Record<string, string> = {
  en: "English", ur: "اردو", hi: "हिन्दी", fr: "Français", zh: "中文",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

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
  full_name?: string;
  notes?: string;
}

export function AdminUsers() {
  const supabase = createClient();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [viewUser, setViewUser] = useState<UserRow | null>(null);
  const [adjustUser, setAdjustUser] = useState<UserRow | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) =>
    !q ||
    u.username.toLowerCase().includes(q.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(q.toLowerCase())
  );

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Users</h1>
        <Input placeholder="Search by username" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs text-[var(--text-muted)]">
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Country</th>
              <th className="px-4 py-2 font-medium">Language</th>
              <th className="px-4 py-2 font-medium">Currency</th>
              <th className="px-4 py-2 font-medium">Balance</th>
              <th className="px-4 py-2 font-medium">Signup</th>
              <th className="px-4 py-2 font-medium">Last login</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs text-[var(--text-muted)]">{u.email || u.id.slice(0, 8)}</p>
                </td>
                <td className="px-4 py-2.5">
                  {u.country ? <span className="inline-flex items-center gap-1.5">{countryFlag(u.country)} {u.country}</span> : "—"}
                </td>
                <td className="px-4 py-2.5">{u.language ? LANG_LABEL[u.language] || u.language : "—"}</td>
                <td className="px-4 py-2.5">{u.currency ? `${currencyInfo(u.currency).symbol} ${u.currency}` : "USD"}</td>
                <td className="px-4 py-2.5">{formatMoney(u.balance)}</td>
                <td className="px-4 py-2.5 text-xs">{formatDateTime(u.created_at)}</td>
                <td className="px-4 py-2.5 text-xs">{u.last_login_at ? formatDateTime(u.last_login_at) : "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={u.banned ? "danger" : "success"}>{u.banned ? "Banned" : "Active"}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setViewUser(u)}>View</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAdjustUser(u); setAmount(""); }}>Adjust</Button>
                    <Button size="sm" variant={u.banned ? "outline" : "danger"} onClick={() => toggleBan(u)}>{u.banned ? "Unban" : "Ban"}</Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title={`Profile — ${viewUser?.username ?? ""}`}>
        {viewUser && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Username">{viewUser.username}</Field>
            <Field label="Role"><Badge tone={viewUser.role === "admin" ? "accent" : "muted"}>{viewUser.role}</Badge></Field>
            <Field label="Email">{viewUser.email || "—"}</Field>
            <Field label="Phone">{viewUser.phone || "—"}</Field>
            <Field label="Country">
              {viewUser.country ? <span className="inline-flex items-center gap-1.5">{countryFlag(viewUser.country)} {countryName(viewUser.country)} ({viewUser.country})</span> : "—"}
            </Field>
            <Field label="Language">{viewUser.language ? LANG_LABEL[viewUser.language] || viewUser.language : "—"}</Field>
            <Field label="Currency">{viewUser.currency ? `${currencyInfo(viewUser.currency).symbol} ${viewUser.currency}` : "USD"}</Field>
            <Field label="Balance">{formatMoney(viewUser.balance)}</Field>
            <Field label="Signup date">{formatDateTime(viewUser.created_at)}</Field>
            <Field label="Last login">{viewUser.last_login_at ? formatDateTime(viewUser.last_login_at) : "—"}</Field>
            <Field label="Referral code">{viewUser.referral_code || "—"}</Field>
            <Field label="Referral used">{viewUser.referral_used || "—"}</Field>
            <div className="col-span-2">
              <Field label="Notes">{viewUser.notes || "—"}</Field>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!adjustUser} onClose={() => setAdjustUser(null)} title={`Adjust balance — ${adjustUser?.username ?? ""}`}>
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-muted)]">Current: {formatMoney(adjustUser?.balance ?? 0)}</p>
          <Input label="Amount (+/-)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100 or -50" />
          <Button full loading={busy} onClick={applyAdjust} className={cn(Number(amount) < 0 && "bg-[var(--danger)]")}>Apply</Button>
        </div>
      </Modal>
    </div>
  );
}
