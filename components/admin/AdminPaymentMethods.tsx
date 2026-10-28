"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  id: string;
  slug: string | null;
  name: string;
  country: string;
  enabled: boolean;
  logo_url: string | null;
  account_name: string | null;
  account_number: string | null;
  min_deposit: number;
  max_deposit: number;
  fee_percent: number;
  instructions: string | null;
  sort: number;
}

const EMPTY: Omit<PaymentMethod, "id"> = {
  slug: "",
  name: "",
  country: "IN",
  enabled: true,
  logo_url: "",
  account_name: "Wazeo (Demo)",
  account_number: "",
  min_deposit: 1,
  max_deposit: 10000,
  fee_percent: 0,
  instructions: "",
  sort: 0,
};

export function AdminPaymentMethods() {
  const supabase = createClient();
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [draft, setDraft] = useState<Omit<PaymentMethod, "id">>(EMPTY);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("payment_methods")
      .select("*")
      .order("sort", { ascending: true });
    setMethods(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setDraft({ ...EMPTY, sort: methods.length + 1 });
    setEditing(null);
  }
  function openEdit(m: PaymentMethod) {
    setDraft({ ...m });
    setEditing(m);
  }

  async function save() {
    if (!draft.name.trim()) return toast({ title: "Name is required", variant: "danger" });
    setBusy(true);
    const payload = {
      ...draft,
      name: draft.name.trim(),
      slug: draft.slug?.trim() || draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      account_name: draft.account_name?.trim() || null,
      account_number: draft.account_number?.trim() || null,
      instructions: draft.instructions?.trim() || null,
      logo_url: draft.logo_url?.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("payment_methods").update(payload).eq("id", editing.id)
      : await supabase.from("payment_methods").insert(payload);
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "danger" });
    toast({ title: editing ? "Method updated" : "Method added", variant: "success" });
    setEditing(null);
    setDraft(EMPTY);
    load();
  }

  async function toggleEnabled(m: PaymentMethod) {
    const { error } = await supabase.from("payment_methods").update({ enabled: !m.enabled }).eq("id", m.id);
    if (error) return toast({ title: error.message, variant: "danger" });
    load();
  }

  async function remove(m: PaymentMethod) {
    const { error } = await supabase.from("payment_methods").delete().eq("id", m.id);
    if (error) return toast({ title: error.message, variant: "danger" });
    toast({ title: "Method deleted", variant: "success" });
    load();
  }

  const countries: Record<string, string> = { IN: "🇮🇳 India", PK: "🇵🇰 Pakistan", GLOBAL: "🌍 Global" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payment Methods</h1>
          <p className="text-sm text-[var(--text-muted)]">Enable/disable deposit methods and edit their details.</p>
        </div>
        <Button onClick={openNew}>+ Add method</Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/[0.04]" />)}
        </div>
      ) : methods.length === 0 ? (
        <EmptyState title="No payment methods" description="Add your first deposit method." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((m) => (
            <div key={m.id} className={cn("glass rounded-2xl p-4 transition-opacity", !m.enabled && "opacity-55")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {m.logo_url ? (
                    <img src={m.logo_url} alt={m.name} className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-lg font-bold text-[var(--accent)]">
                      {m.name.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{countries[m.country] || m.country}</p>
                  </div>
                </div>
                <Badge tone={m.enabled ? "success" : "muted"}>{m.enabled ? "Active" : "Disabled"}</Badge>
              </div>

              <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
                <p><span className="font-medium text-[var(--text)]">Account:</span> {m.account_number || "—"}</p>
                <p><span className="font-medium text-[var(--text)]">Range:</span> {m.min_deposit} – {m.max_deposit} · Fee {m.fee_percent}%</p>
                {m.instructions && <p className="line-clamp-2">{m.instructions}</p>}
              </div>

              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" full onClick={() => openEdit(m)}>Edit</Button>
                <Button size="sm" variant="outline" full onClick={() => toggleEnabled(m)}>{m.enabled ? "Disable" : "Enable"}</Button>
                <Button size="sm" variant="danger" onClick={() => remove(m)}>✕</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing || (draft.name !== "" && editing === null)}
        onClose={() => { setEditing(null); setDraft(EMPTY); }}
        title={editing ? "Edit method" : "Add method"}
        maxWidth="max-w-lg"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input label="Slug (optional)" value={draft.slug || ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Country</label>
              <select
                value={draft.country}
                onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white/[0.03] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="IN">India</option>
                <option value="PK">Pakistan</option>
                <option value="GLOBAL">Global</option>
              </select>
            </div>
            <Input label="Logo URL (optional)" value={draft.logo_url || ""} onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Account name" value={draft.account_name || ""} onChange={(e) => setDraft({ ...draft, account_name: e.target.value })} />
            <Input label="Account number / details" value={draft.account_number || ""} onChange={(e) => setDraft({ ...draft, account_number: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Min deposit" type="number" value={String(draft.min_deposit)} onChange={(e) => setDraft({ ...draft, min_deposit: Number(e.target.value) })} />
            <Input label="Max deposit" type="number" value={String(draft.max_deposit)} onChange={(e) => setDraft({ ...draft, max_deposit: Number(e.target.value) })} />
            <Input label="Fee %" type="number" step="0.1" value={String(draft.fee_percent)} onChange={(e) => setDraft({ ...draft, fee_percent: Number(e.target.value) })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Instructions</label>
            <textarea
              value={draft.instructions || ""}
              onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="h-4 w-4" />
            Enabled
          </label>
          <div className="flex gap-2 pt-2">
            <Button full loading={busy} onClick={save}>{editing ? "Save changes" : "Add method"}</Button>
            <Button variant="outline" onClick={() => { setEditing(null); setDraft(EMPTY); }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );

}
