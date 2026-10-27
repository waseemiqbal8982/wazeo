"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function TicketChat({ id }: { id: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const [tRes, mRes] = await Promise.all([
      supabase.from("tickets").select("*").eq("id", id).single(),
      supabase.from("ticket_messages").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
    ]);
    setTicket(tRes.data);
    setMessages(mRes.data || []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const msg = text.trim();
    if (!msg) return;
    setBusy(true);
    await supabase.from("ticket_messages").insert({ ticket_id: id, sender: "user", message: msg });
    setText("");
    setBusy(false);
    load();
    // AI assistant (best effort; shows a transient reply for now)
    try {
      const res = await fetch("/api/ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, orderId: id }),
      });
      const data = await res.json();
      if (data?.reply) {
        setMessages((prev) => [
          ...prev,
          { id: `ai-${Date.now()}`, sender: "ai", message: data.reply, created_at: new Date().toISOString() },
        ]);
      }
    } catch {}
  }

  if (!ticket) return <Skeleton className="h-64" />;

  return (
    <div className="flex h-[70vh] flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <p className="text-sm text-[var(--text-muted)]">Ticket #{id.slice(0, 8)}</p>
        </div>
        <Badge tone={ticket.status === "open" ? "warning" : "muted"}>{ticket.status}</Badge>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-[var(--text-muted)]">No messages yet. Say hello!</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.sender === "user" ? "bg-[var(--accent)] text-white" : "bg-white/[0.05]")}>
                <p>{m.message}</p>
                <p className={cn("mt-1 text-[10px]", m.sender === "user" ? "text-white/70" : "text-[var(--text-muted)]")}>
                  {m.sender} · {formatDateTime(m.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="border-t border-[var(--border)] p-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              className="h-10 flex-1 rounded-xl border border-[var(--border)] bg-white/[0.03] px-3.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--accent)] focus:outline-none"
            />
            <Button loading={busy} onClick={send}>Send</Button>
          </div>
        </div>
      </Card>

      <Button variant="outline" onClick={() => router.push("/dashboard/tickets")}>← Back to tickets</Button>
    </div>
  );
}
