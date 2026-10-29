"use client";

import { useEffect, useRef } from "react";

/**
 * Item 4 — desktop-only custom cursor (soft ring + dot).
 * - Enabled only when (hover:hover) and (pointer:fine) and no reduced motion.
 * - Keeps the native cursor visible; our elements are pure overlay (pointer-events none).
 * - One requestAnimationFrame loop, transform-only movement with easing.
 * - Re-colors to the current accent; grows/colours over buttons & links,
 *   becomes a text-bar over inputs, shrinks on press, ripple on click.
 * - Paused while the tab is hidden.
 */
export function Cursor() {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = typeof window === "undefined" ? null : window.matchMedia("(hover: hover) and (pointer: fine)");
    const rmq = typeof window === "undefined" ? null : window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mq || !mq.matches || (rmq && rmq.matches)) return;

    const wrap = wrapRef.current;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!wrap || !ring || !dot) return;

    let raf = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let curX = targetX;
    let curY = targetY;
    let visible = false;

    const readAccent = () => {
      const s = getComputedStyle(document.documentElement);
      return s.getPropertyValue("--accent").trim() || "#a78bfa";
    };

    const applyVisual = (interactive: string | null, pressed: boolean) => {
      const accent = readAccent();
      dot.style.background = accent;
      if (interactive === "text") {
        ring.style.width = "3px";
        ring.style.height = "20px";
        ring.style.borderRadius = "2px";
        ring.style.border = "1px solid " + accent;
        ring.style.background = "transparent";
        ring.style.boxShadow = "none";
      } else if (interactive === "link") {
        ring.style.width = "44px";
        ring.style.height = "44px";
        ring.style.borderRadius = "9999px";
        ring.style.border = "2px solid " + accent;
        ring.style.background = accent + "1a";
        ring.style.boxShadow = "0 0 24px 0 " + accent + "55";
      } else {
        ring.style.width = "32px";
        ring.style.height = "32px";
        ring.style.borderRadius = "9999px";
        ring.style.border = "1.5px solid " + accent + "aa";
        ring.style.background = "transparent";
        ring.style.boxShadow = "0 0 16px 0 " + accent + "33";
      }
      const scale = pressed ? 0.8 : interactive === "link" ? 1.15 : 1;
      ring.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%) scale(${scale})`;
    };

    const loop = () => {
      if (document.hidden) {
        wrap.style.opacity = "0";
        raf = requestAnimationFrame(loop);
        return;
      }
      wrap.style.opacity = visible ? "1" : "0";
      curX += (targetX - curX) * 0.18;
      curY += (targetY - curY) * 0.18;
      dot.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = ring.style.transform.replace(/translate3d\([^)]*\)/, `translate3d(${curX}px, ${curY}px, 0)`);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: MouseEvent) => {
      visible = true;
      targetX = e.clientX;
      targetY = e.clientY;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      let mode: string | null = null;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) mode = "text";
      else if (t.closest("button, a, [role=button], [onclick]")) mode = "link";
      applyVisual(mode, false);
    };
    const onDown = () => {
      const t = document.elementFromPoint(curX, curY) as HTMLElement | null;
      const mode = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") ? "text" : t?.closest("button, a, [role=button], [onclick]") ? "link" : null;
      applyVisual(mode, true);
    };
    const onUp = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const mode = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") ? "text" : t?.closest("button, a, [role=button], [onclick]") ? "link" : null;
      applyVisual(mode, false);
    };
    const onClickRipple = (e: MouseEvent) => {
      const r = document.createElement("span");
      r.className = "cursor-ripple";
      r.style.left = `${e.clientX - 6}px`;
      r.style.top = `${e.clientY - 6}px`;
      document.body.appendChild(r);
      window.setTimeout(() => r.remove(), 550);
    };
    const onLeave = () => { visible = false; };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("click", onClickRipple);
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("click", onClickRipple);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none fixed inset-0 z-[60] opacity-0" aria-hidden="true">
      <div ref={ringRef} className="absolute left-0 top-0 h-8 w-8 rounded-full border transition-none" style={{ willChange: "transform" }} />
      <div ref={dotRef} className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full" style={{ willChange: "transform" }} />
    </div>
  );
}
