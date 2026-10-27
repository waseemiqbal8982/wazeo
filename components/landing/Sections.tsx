import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";

export function Sections() {
  return (
    <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16">
      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          { title: "Drip-feed", desc: "Spread delivery over hours with smart curves. Natural growth, no suspicious spikes." },
          { title: "Fast start", desc: "Most orders start within minutes. Real-time status and order tracking." },
          { title: "24/7 support", desc: "Ticket system with real staff. Help whenever you need it." },
        ].map((f) => (
          <Card key={f.title} glow interactive className="p-6">
            <h3 className="text-base font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{f.desc}</p>
          </Card>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-bold">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Create an account", d: "Sign up with your email in 30 seconds." },
            { n: "2", t: "Add funds", d: "Send a payment and upload your proof." },
            { n: "3", t: "Place an order", d: "Paste a link, choose a service, and go." },
          ].map((s) => (
            <div key={s.n} className="glass rounded-2xl p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-3 text-sm font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-bold">FAQ</h2>
        <div className="mx-auto mt-6 max-w-2xl space-y-3">
          {[
            { q: "How fast are orders delivered?", a: "Most orders start within minutes. Delivery time depends on the service and the provider." },
            { q: "Do you guarantee retention?", a: "No. Retention depends on the platform and the target account. We can't guarantee results." },
            { q: "What is drip-feed?", a: "It spreads your order over a set duration using natural growth curves." },
            { q: "How do I add funds?", a: "Go to Add Funds, send the payment, and upload a screenshot. An admin approves it." },
          ].map((f) => (
            <details key={f.q} className="glass rounded-xl px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mt-16 border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-sm text-[var(--text-muted)]">© {new Date().getFullYear()} Wazeo</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/terms" className="text-[var(--text-muted)] hover:text-[var(--accent)]">Terms</Link>
            <Link href="/refund-policy" className="text-[var(--text-muted)] hover:text-[var(--accent)]">Refund policy</Link>
            <Link href="/sign-in" className="text-[var(--text-muted)] hover:text-[var(--accent)]">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
