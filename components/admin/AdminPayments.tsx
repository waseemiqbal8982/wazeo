"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatMoney, formatDateTime } from "@/lib/currency";

export function AdminPayments() {
  const supabase = createClient();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("payments")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(50);
    setPayments(data || []);
    // signed URLs for pending proofs
    const pending = (data || []).filter((p) => p.status === "pending" && p.proof_url);
    const map: Record<string, string> = {};
    for (const p of pending) {
      const { data: signed } = await supabase.storage.from("payments").createSignedUrl(p.proof_url, 300);
      if (signed?.signedUrl) map[p.id] = signed.signedUrl;
    }
    setImages(map);
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, approve: boolean) {
    setBusyId(id);
    const { error } = await supabase.rpc("approve_payment", { p_payment_id: id, p_approve: approve });
    setBusyId(null);
    if (error) return toast({ title: error.message, variant: "danger" });
    toast({ title: approve ? "Payment approved" : "Payment rejected", variant: approve ? "success" : "danger" });
    load();
  }

  if (payments.length === 0) return <EmptyState title="No payments" description="New deposit requests will appear here." />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payments</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {payments.map((p) => (
          <div key={p.id} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold">{formatMoney(p.amount)}</p>
              <Badge tone={p.status === "approved" ? "success" : p.status === "rejected" ? "danger" : "warning"}>{p.status}</Badge>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {p.profiles?.username || "User"} · {p.method} · {formatDateTime(p.created_at)}
            </p>
            {images[p.id] ? (
              <a href={images[p.id]} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl border border-[var(--border)]">
                <img src={images[p.id]} alt="Proof" className="h-32 w-full object-cover" />
              </a>
            ) : (
              p.status === "pending" && <div className="mt-3 h-32 rounded-xl bg-white/[0.03]" />
            )}
            {p.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" full loading={busyId === p.id} onClick={() => decide(p.id, true)}>Approve</Button>
                <Button size="sm" variant="danger" full loading={busyId === p.id} onClick={() => decide(p.id, false)}>Reject</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
