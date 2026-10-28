import { Hero } from "@/components/landing/Hero";
import { Sections } from "@/components/landing/Sections";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed right-4 top-4 z-30"><CurrencySwitcher /></div>
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-10 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent-2), transparent 70%)" }}
        />
      </div>
      <Hero />
      <Sections />
    </div>
  );
}
