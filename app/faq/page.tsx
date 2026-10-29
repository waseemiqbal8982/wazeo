"use client";

import { useEffect, useState } from "react";
import { PublicShell } from "@/components/public/PublicShell";
import { cn } from "@/lib/utils";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    fetch("/api/public/faq")
      .then((r) => r.json())
      .then((d) => setFaqs(d.faqs || []))
      .catch(() => setFaqs([]));
  }, []);

  return (
    <PublicShell title="Frequently asked questions" subtitle="Answers to common questions about Wazeo.">
      <div className="space-y-3">
        {faqs.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">No FAQ entries yet — the admin can add some.</p>
        )}
        {faqs.map((f, i) => (
          <div key={f.id} className="glass overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={open === i}
            >
              <span className="text-sm font-semibold">{f.question}</span>
              <span className={cn("shrink-0 text-[var(--accent)] transition-transform duration-200", open === i ? "rotate-45" : "")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </button>
            {open === i && (
              <p className="px-5 pb-5 text-sm text-[var(--text-muted)]">{f.answer}</p>
            )}
          </div>
        ))}
      </div>
    </PublicShell>
  );
}
