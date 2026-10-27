"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function AdminTickets() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");

  async function load() {
    const { data } = await supabase
      .from("tickets")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false });
    setTickets(data || []);
  }
  useEffect(() => { load(); }, []);

  async function open(id: string) {
    setActive(id);
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", id).order("created_at", { ascending: true });
    setMessages(data || []);
    setReply("");
  }

  async function send() {
    if (!active || !reply.trim()) return;
    await supabase.from("ticket_messages").insert({ ticket_id: active, sender: "admin", message: reply.trim() });
    setReply("");
    open(active);
  }

  async function closeTicket(id: string) {
    await supabase.from("tickets").update({ status: "closed" }).eq("id", id);
    setActive(null);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tickets</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {tickets.length === 0 ? (
            <EmptyState title="No tickets" />
          ) : (
            tickets.map((t) => (
              <button key={t.id} onClick={() => open(t.id)}
                className={cn("glass w-full rounded-2xl p-4 text-left transition-colors", active === t.id && "border-[var(--accent)]")}>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-medium">{t.subject}</p>
                  <Badge tone={t.status === "open" ? "warning" : "muted"}>{t.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t.profiles?.username || "User"} · {formatDateTime(t.created_at)}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="glass flex flex-col rounded-2xl p-4">
          {!active ? (
            <EmptyState title="Select a ticket" description="Choose a ticket on the left to read and reply." />
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: "50vh" }}>
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.sender === "admin" || m.sender === "ai" ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", m.sender === "user" ? "bg-[var(--accent)] text-white" : "bg-white/[0.05]")}>
                      <p>{m.message}</p>
                      <p className={cn("mt-1 text-[10px]", m.sender === "user" ? "text-white/70" : "text-[var(--text-muted)]")}>{m.sender} · {formatDateTime(m.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Reply as admin…"
                  className="h-10 flex-1 rounded-xl border border-[var(--border)] bg-white/[0.03] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none" />
                <Button onClick={send}>Reply</Button>
              </div>
              <Button variant="ghost" size="sm" className="mt-2 self-end" onClick={() => closeTicket(active)}>Close ticket</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
