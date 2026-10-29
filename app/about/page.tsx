import { PublicShell } from "@/components/public/PublicShell";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PublicShell title="About Wazeo" subtitle="Gradual, customizable delivery for Instagram, TikTok and YouTube.">
      <div className="space-y-5 text-sm leading-relaxed text-[var(--text)]">
        <p>
          Wazeo is a social-media delivery service. Instead of dumping an entire order
          in a few seconds, we deliver it gradually over a time you choose — using a
          growth curve you can shape yourself. This keeps your growth looking natural
          and avoids suspicious spikes.
        </p>
        <h2 className="text-lg font-semibold">What we do</h2>
        <p className="text-[var(--text-muted)]">
          We help creators and pages grow their presence on Instagram, TikTok and YouTube
          by delivering real views, likes, followers, comments and more — in a controlled,
          gradual way. You set the duration and the curve; we handle the rest.
        </p>
        <h2 className="text-lg font-semibold">Our principles</h2>
        <ul className="list-disc space-y-2 pl-5 text-[var(--text-muted)]">
          <li><strong className="text-[var(--text)]">Honesty:</strong> we never claim to guarantee results or that delivery is undetectable. We describe what we do plainly.</li>
          <li><strong className="text-[var(--text)]">Gradual delivery:</strong> orders are spread out over time, never as a sudden burst.</li>
          <li><strong className="text-[var(--text)]">Control:</strong> draw your own curve and watch a live tracking graph.</li>
          <li><strong className="text-[var(--text)]">Privacy:</strong> your data stays encrypted and is never sold.</li>
        </ul>
      </div>
    </PublicShell>
  );
}
