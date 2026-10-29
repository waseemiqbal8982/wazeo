"use client";

const ITEMS = [
  {
    title: "Secure payments",
    desc: "Encrypted checkout and HTTPS everywhere. Card details are never stored.",
    d: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4zM9 12l2 2 4-4",
  },
  {
    title: "Honest refunds",
    desc: "A clear refund policy, handled fairly within 24 hours of your request.",
    d: "M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5",
  },
  {
    title: "24/7 support",
    desc: "Real humans on WhatsApp, Telegram and support tickets — not just bots.",
    d: "M4 13a8 8 0 018-8 8 8 0 018 8v3a4 4 0 01-4 4h-1v-6h3v3a2 2 0 002-2 6 6 0 00-6-6 6 6 0 00-6 6 2 2 0 002 2h3v6h-1a4 4 0 01-4-4v-3z",
  },
  {
    title: "Your data is private",
    desc: "We never sell your information and only share what's required to deliver your order.",
    d: "M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3zM8 11h8M12 11v5",
  },
];

export function TrustStrip() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14" aria-label="Trust and safety">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it) => (
          <div key={it.title} className="glass rounded-2xl p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={it.d} />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold">{it.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
