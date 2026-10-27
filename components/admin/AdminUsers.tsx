"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  username: string;
  role: string;
  balance: number;
  banned: boolean;
  created_at: string;
}

export function AdminUsers() {
  const supabase = createClient();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [adjustUser, setAdjustUser] = useState<UserRow | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => !q || u.username.toLowerCase().includes(q.toLowerCase()));

  async function toggleBan(u: UserRow) {
    await supabase.from("profiles").update({ banned: !u.banned }).eq("id", u.id);
    toast({ title: u.banned ? "Unbanned" : "Banned", variant: "success" });
    load();
  }

  async function toggleAdmin(u: UserRow) {
    await supabase.from("profiles").update({ role: u.role === "admin" ? "user" : "admin" }).eq("id", u.id);
    toast({ title: "Role updated", variant: "success" });
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
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--text-muted)]">
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Balance</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs text-[var(--text-muted)]">{u.id.slice(0, 8)}</p>
                </td>
                <td className="px-4 py-2.5"><Badge tone={u.role === "admin" ? "accent" : "muted"}>{u.role}</Badge></td>
                <td className="px-4 py-2.5">{formatMoney(u.balance)}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={u.banned ? "danger" : "success"}>{u.banned ? "Banned" : "Active"}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => { setAdjustUser(u); setAmount(""); }}>Adjust</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleAdmin(u)}>{u.role === "admin" ? "Unmake admin" : "Make admin"}</Button>
                    <Button size="sm" variant={u.banned ? "outline" : "danger"} onClick={() => toggleBan(u)}>{u.banned ? "Unban" : "Ban"}</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
