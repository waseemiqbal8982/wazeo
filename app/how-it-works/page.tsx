import { PublicShell } from "@/components/public/PublicShell";

export const metadata = { title: "How it works" };

const STEPS = [
  { n: "1", t: "Create an account", d: "Sign up free in about 30 seconds. Choose your language and currency." },
  { n: "2", t: "Add funds", d: "Top up your balance using one of our available payment methods." },
  { n: "3", t: "Place an order", d: "Paste a link to your profile or video, pick a service, and set the quantity." },
  { n: "4", t: "Set time & curve", d: "Choose how long delivery should take and pick a growth curve — or draw your own." },
  { n: "5", t: "Watch it grow", d: "Track your order live. It is delivered gradually over the duration you set." },
];

export default function HowItWorksPage() {
  return (
    <PublicShell title="How it works" subtitle="From sign-up to delivered order in five simple steps.">
      <div className="space-y-4">
        {STEPS.map((s) => (
          <div key={s.n} className="glass flex gap-4 rounded-2xl p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-bold text-white">{s.n}</span>
            <div>
              <h2 className="font-semibold">{s.t}</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
    </PublicShell>
  );
}
