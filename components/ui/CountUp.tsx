"use client";

import { useEffect, useState } from "react";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const check = () => {
      const manual = document.documentElement.dataset.reduceMotion === "true";
      const media = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setReduced(manual || media);
    };
    check();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener?.("change", check);
    return () => mq.removeEventListener?.("change", check);
  }, []);

  return reduced;
}

export function CountUp({
  value,
  duration = 800,
  formatter,
}: {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return <>{formatter ? formatter(display) : Math.round(display).toLocaleString()}</>;
}
