"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/currency";

function tone(status: string) {
  if (status === "open") return "warning";
  if (status === "closed") return "muted";
  return "success";
}

export function TicketsPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    setError("");
    if (!subject.trim() || !message.trim()) return setError("Subject and message are required.");
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setError("Not authenticated.");
      const { data: t, error: tErr } = await supabase.from("tickets").insert({ user_id: user.id, subject: subject.trim() }).select().single();
      if (tErr) return setError(tErr.message);
      const { error: mErr } = await supabase.from("ticket_messages").insert({ ticket_id: t.id, sender: "user", message: message.trim() });
      if (mErr) return setError(mErr.message);
      setOpen(false);
      setSubject("");
      setMessage("");
      load();
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-sm text-[var(--text-muted)]">Get help from our support team.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>+ New ticket</Button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16v10H8l-4 4V6z" /></svg>} title="No tickets" description="Open a ticket and we'll reply." />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} href={`/dashboard/tickets/${t.id}`} className="glass block rounded-2xl p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_var(--glow)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.subject}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatDateTime(t.created_at)}</p>
                </div>
                <Badge tone={tone(t.status)}>{t.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New ticket">
        <div className="space-y-3">
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="How can we help?" />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--accent)] focus:outline-none"
              placeholder="Describe your issue…"
            />
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <Button full loading={busy} onClick={create}>Open ticket</Button>
        </div>
      </Modal>
    </div>
  );
}
