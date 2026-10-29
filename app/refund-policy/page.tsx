import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Refund Policy" };

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="inline-flex items-center gap-2">
        <Logo size={28} />
        <span className="font-bold">Wazeo</span>
      </Link>
      <h1 className="mt-8 text-3xl font-bold">Refund Policy</h1>
      <p className="mt-2 inline-block rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">Template — edit from Admin → Content</p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--text-muted)]">
        <p>We want you to be happy with Wazeo. Please read this refund policy carefully.</p>
        <h2 className="text-base font-semibold text-[var(--text)]">No guarantee of delivery</h2>
        <p>Social media growth depends on the platform and your account. We cannot guarantee delivery, speed, or retention. By placing an order you accept this risk.</p>
        <h2 className="text-base font-semibold text-[var(--text)]">When you can get a refund</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>We fail to send your order to the provider (automatic refund).</li>
          <li>An order is cancelled by us before any service is delivered.</li>
          <li>The provider confirms the order can never be fulfilled.</li>
        </ul>
        <h2 className="text-base font-semibold text-[var(--text)]">When refunds are not available</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Orders already partially or fully delivered.</li>
          <li>Drops or natural decrease in numbers after delivery.</li>
          <li>Orders placed with wrong links or wrong usernames.</li>
        </ul>
        <h2 className="text-base font-semibold text-[var(--text)]">How to request a refund</h2>
        <p>Open a ticket in your dashboard and our team will review it within 24-48 hours.</p>
      </div>
    </div>
  );
}
