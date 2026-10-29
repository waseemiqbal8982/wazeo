import Link from "next/link";
import { PublicShell } from "@/components/public/PublicShell";
import { getHomeData } from "@/lib/home-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  let data;
  try {
    data = await getHomeData();
  } catch {
    data = null;
  }

  const cards = data
    ? data.services
    : ["instagram", "tiktok", "youtube"].map((p) => ({ platform: p, label: p, fromUsd: null }));

  return (
    <PublicShell title="Pricing" subtitle="Transparent prices from our live service list. Convert to your currency with the switcher above.">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((s) => (
          <Link
            key={s.platform}
            href={`/services?platform=${s.platform}`}
            className="glass group rounded-2xl p-6 text-center transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_var(--glow)]"
          >
            <h2 className="text-lg font-semibold capitalize">{s.label}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {s.fromUsd != null ? (
                <>From ${s.fromUsd.toFixed(4)}</>
              ) : (
                "Prices on request"
              )}
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]">Browse services →</span>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
        Need help choosing? <Link href="/support" className="text-[var(--accent)]">Contact support</Link>.
      </p>
    </PublicShell>
  );
}
