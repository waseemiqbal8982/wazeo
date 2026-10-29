"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { isSupportOnline, formatWorkingHours } from "@/lib/support";

interface SupportConfig {
  whatsapp: string;
  telegram: string;
  email: string;
  workingHours: string;
  workingTz: string;
  welcome: string;
}

const CHAT_ICON =
  "M4 6h16v10H8l-4 4V6z";

export function ContactFab() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<SupportConfig>({
    whatsapp: "", telegram: "", email: "", workingHours: "", workingTz: "", welcome: "",
  });
  const [online, setOnline] = useState(true);

  useEffect(() => {
    fetch("/api/meta/support")
      .then((r) => r.json())
      .then((d) => {
        setCfg(d);
        setOnline(isSupportOnline(d.workingHours, d.workingTz));
      })
      .catch(() => {});
  }, []);

  const hasAny = cfg.whatsapp || cfg.telegram || cfg.email;
  if (!hasAny) return null;

  const waLink = cfg.whatsapp ? `https://wa.me/${cfg.whatsapp.replace(/\D/g, "")}` : "";
  const tgLink = cfg.telegram
    ? /^https?:\/\//.test(cfg.telegram)
      ? cfg.telegram
      : `https://t.me/${cfg.telegram.replace(/^@/, "")}`
    : "";
  const tzLabel = cfg.workingTz || "Your local time";
  const hoursLabel = formatWorkingHours(cfg.workingHours);

  return (
    <div className="fixed bottom-[max(84px,env(safe-area-inset-bottom)+72px)] right-4 z-40 flex flex-col items-end gap-3 lg:bottom-5 lg:right-5">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="w-[300px] overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[#12121f] shadow-2xl"
          >
            <div className="border-b border-[var(--border)] bg-[var(--accent-soft)] p-4">
              <p className="text-sm font-semibold">{cfg.welcome || "How can we help?"}</p>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-[var(--danger)]"}`} />
                <span className="text-[var(--text-muted)]">
                  {online ? "Online now" : `Currently offline${hoursLabel ? ` · ${hoursLabel} (${tzLabel})` : ""}`}
                </span>
              </div>
            </div>
            <div className="space-y-2 p-3">
              {cfg.whatsapp && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-lg">💬</span>
                  <span>
                    <span className="block text-sm font-medium">WhatsApp</span>
                    <span className="block text-xs text-[var(--text-muted)]">Chat with us</span>
                  </span>
                </a>
              )}
              {cfg.telegram && (
                <a href={tgLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-lg">✈️</span>
                  <span>
                    <span className="block text-sm font-medium">Telegram</span>
                    <span className="block text-xs text-[var(--text-muted)]">Message us</span>
                  </span>
                </a>
              )}
              <Link href="/support" className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-lg">🎫</span>
                <span>
                  <span className="block text-sm font-medium">Ticket</span>
                  <span className="block text-xs text-[var(--text-muted)]">Open a support ticket</span>
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.9 }}
        aria-label="Support"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent)] text-white shadow-[0_8px_30px_-8px_var(--glow)]"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={CHAT_ICON} /></svg>
        )}
      </motion.button>
    </div>
  );
}
