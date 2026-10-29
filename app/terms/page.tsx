import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="inline-flex items-center gap-2">
        <Logo size={28} />
        <span className="font-bold">Wazeo</span>
      </Link>
      <h1 className="mt-8 text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 inline-block rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">Template — edit from Admin → Content</p>
      <div className="prose mt-6 space-y-4 text-sm leading-relaxed text-[var(--text-muted)]">
        <p>By using Wazeo you agree to these terms.</p>
        <h2 className="text-base font-semibold text-[var(--text)]">1. Use of service</h2>
        <p>You may use Wazeo to purchase social media services. You must provide valid links and not use the service for spam, harassment, or anything illegal.</p>
        <h2 className="text-base font-semibold text-[var(--text)]">2. No guarantee of results</h2>
        <p>We do not guarantee specific results, delivery speed, or retention. Delivery depends on the target platform and your account. We are not responsible for account actions taken by third-party platforms.</p>
        <h2 className="text-base font-semibold text-[var(--text)]">3. Payments & refunds</h2>
        <p>All purchases are final unless stated in our <Link href="/refund-policy" className="text-[var(--accent)]">refund policy</Link>. We may cancel orders that violate these terms.</p>
        <h2 className="text-base font-semibold text-[var(--text)]">4. Termination</h2>
        <p>We may suspend or disable accounts that violate these terms.</p>
      </div>
    </div>
  );
}
