"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { isSupportOnline, formatWorkingHours } from "@/lib/support";

interface SupportConfig {
  whatsapp: string;
  telegram: string;
  email: string;
  workingHours: string;
  workingTz: string;
  welcome: string;
}

const FAQS: { q: string; a: string }[] = [
  { q: "How fast are orders delivered?", a: "Most orders start within minutes. Delivery time depends on the service and provider." },
  { q: "How do I add funds?", a: "Go to Add Funds, send the payment, and upload your proof. It is approved quickly." },
  { q: "Can I get a refund?", a: "Yes — see our Refund Policy. Approved refunds are returned to your balance." },
];

export default function SupportPage() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<SupportConfig>({ whatsapp: "", telegram: "", email: "", workingHours: "", workingTz: "", welcome: "" });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/meta/support")
      .then((r) => r.json())
      .then(setCfg)
      .catch(() => {});
  }, []);

  const online = isSupportOnline(cfg.workingHours, cfg.workingTz);
  const hoursLabel = formatWorkingHours(cfg.workingHours);
  const waLink = cfg.whatsapp ? `https://wa.me/${cfg.whatsapp.replace(/\D/g, "")}` : "";
  const tgLink = cfg.telegram ? (/^https?:\/\//.test(cfg.telegram) ? cfg.telegram : `https://t.me/${cfg.telegram.replace(/^@/, "")}`) : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Something went wrong.", variant: "danger" });
        return;
      }
      setSent(true);
      setSubject("");
      setMessage("");
      toast({ title: "Ticket created!", variant: "success" });
    } catch {
      toast({ title: "Network error. Please try again.", variant: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gradient">Support Hub</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--text-muted)]">
          {cfg.welcome || "How can we help you today?"}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-[var(--danger)]"}`} />
          <span className="text-[var(--text-muted)]">
            {online ? "Online now" : "Currently offline"}
            {hoursLabel ? ` · ${hoursLabel} (${cfg.workingTz || "local time"})` : " · 24/7"}
          </span>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {cfg.whatsapp && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="glass rounded-2xl p-4 text-center transition-colors hover:bg-white/[0.06]">
            <div className="text-3xl">💬</div>
            <p className="mt-2 font-semibold">WhatsApp</p>
            <p className="text-xs text-[var(--text-muted)]">Chat with us</p>
          </a>
        )}
        {cfg.telegram && (
          <a href={tgLink} target="_blank" rel="noopener noreferrer" className="glass rounded-2xl p-4 text-center transition-colors hover:bg-white/[0.06]">
            <div className="text-3xl">✈️</div>
            <p className="mt-2 font-semibold">Telegram</p>
            <p className="text-xs text-[var(--text-muted)]">Message us</p>
          </a>
        )}
        {cfg.email && (
          <a href={`mailto:${cfg.email}`} className="glass rounded-2xl p-4 text-center transition-colors hover:bg-white/[0.06]">
            <div className="text-3xl">✉️</div>
            <p className="mt-2 font-semibold">Email</p>
            <p className="break-all text-xs text-[var(--text-muted)]">{cfg.email}</p>
          </a>
        )}
        <Link href="/dashboard/tickets" className="glass rounded-2xl p-4 text-center transition-colors hover:bg-white/[0.06]">
          <div className="text-3xl">🎫</div>
          <p className="mt-2 font-semibold">My Tickets</p>
          <p className="text-xs text-[var(--text-muted)]">Track your tickets</p>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Open a ticket</h2>
          {sent ? (
            <p className="mt-3 text-sm text-emerald-300">Thanks! Your ticket has been created. {"We'll reply soon."}</p>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Order question" required />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                  placeholder="Describe your issue…"
                  className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
              <Button full loading={busy} type="submit">Submit ticket</Button>
            </form>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">FAQ</h2>
          <div className="mt-4 space-y-4">
            {FAQS.map((f) => (
              <div key={f.q}>
                <p className="text-sm font-medium">{f.q}</p>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">{f.a}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}
