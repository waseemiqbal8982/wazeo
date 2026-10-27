"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

export function SplashLoader() {
  const [phase, setPhase] = useState<"shown" | "fading" | "gone">("shown");

  useEffect(() => {
    const start = Date.now();
    const timer = setTimeout(() => {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, 600 - elapsed);
      setTimeout(() => setPhase("fading"), wait);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === "fading") {
      const t = setTimeout(() => setPhase("gone"), 450);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div id="splash" className={phase === "fading" ? "fade-out" : ""} aria-hidden="true">
      <div className="relative flex items-center justify-center">
        <div className="splash-spinner" />
        <Logo size={54} />
      </div>
      <p className="text-sm text-[var(--text-muted)]">Panel khul raha hai</p>
    </div>
  );
}
