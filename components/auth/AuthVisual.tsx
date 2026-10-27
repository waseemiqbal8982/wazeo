"use client";

import { useEffect, useRef, useState } from "react";
import { CountUp, useReducedMotion } from "@/components/ui/CountUp";
import { useI18n } from "@/lib/i18n";

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB | null {
  if (!hex) return null;
  const m = hex.match(/^#?([a-f0-9]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m2 = hex.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m2) return { r: +m2[1], g: +m2[2], b: +m2[3] };
  return null;
}

const TAGLINE_KEYS = [
  "auth.visual.tagline1",
  "auth.visual.tagline2",
  "auth.visual.tagline3",
];

export default function AuthVisual() {
  const { t } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animOn, setAnimOn] = useState(false);
  const [tagIdx, setTagIdx] = useState(0);
  const reduced = useReducedMotion();

  // Decide whether the canvas animation can run. Fall back to a static
  // gradient when reduce-motion is on or the device is slow/weak.
  useEffect(() => {
    let slow = false;
    if (typeof navigator !== "undefined") {
      const hc = (navigator as Navigator).hardwareConcurrency;
      if (typeof hc === "number" && hc > 0 && hc <= 2) slow = true;
      const dm = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
      if (typeof dm === "number" && dm <= 2) slow = true;
    }
    setAnimOn(!reduced && !slow);
  }, [reduced]);

  // Rotating tagline.
  useEffect(() => {
    const id = setInterval(() => setTagIdx((i) => (i + 1) % TAGLINE_KEYS.length), 3500);
    return () => clearInterval(id);
  }, []);

  // Canvas engine: glowing nodes + flowing growth/drip waves, pointer-follow,
  // tap ripples, accent-reactive colors, ~30fps, paused when tab hidden.
  useEffect(() => {
    if (!animOn) return;
    const wrap = frameRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let nodes: { x: number; y: number; vx: number; vy: number; r: number; ph: number }[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    const ripples: { x: number; y: number; r: number; max: number; a: number }[] = [];
    let gone = false;

    const getVars = () => {
      const cs = getComputedStyle(document.documentElement);
      const a = hexToRgb(cs.getPropertyValue("--accent").trim()) || { r: 139, g: 92, b: 246 };
      const a2 = hexToRgb(cs.getPropertyValue("--accent-2").trim()) || { r: 109, g: 40, b: 217 };
      return { a, a2 };
    };

    const initNodes = () => {
      const count = Math.max(18, Math.min(46, Math.floor((width * height) / 16000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.4 + Math.random() * 2.4,
        ph: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes();
    };

    const posFromEvent = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = posFromEvent(e);
      pointer.x = p.x;
      pointer.y = p.y;
      if (e.pointerType === "touch") pointer.active = true;
    };
    const onPointerDown = (e: PointerEvent) => {
      const p = posFromEvent(e);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
      ripples.push({ x: p.x, y: p.y, r: 0, max: 44 + Math.random() * 26, a: 0.55 });
    };
    const onPointerUp = () => {
      pointer.active = false;
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    let hidden = document.hidden;
    const onVis = () => {
      hidden = document.hidden;
      if (!hidden) last = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);

    let raf = 0;
    let last = 0;
    let accentT = 0;
    let a = { r: 139, g: 92, b: 246 };
    let a2 = { r: 109, g: 40, b: 217 };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      // soft radial backlight
      const back = ctx.createRadialGradient(
        width * 0.5,
        height * 0.42,
        10,
        width * 0.5,
        height * 0.42,
        Math.max(width, height) * 0.75
      );
      back.addColorStop(0, `rgba(${a.r},${a.g},${a.b},0.18)`);
      back.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = back;
      ctx.fillRect(0, 0, width, height);

      // update nodes
      for (const n of nodes) {
        if (pointer.active) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < 150 && d > 0.01) {
            const f = (1 - d / 150) * 0.35;
            n.vx += (dx / d) * f;
            n.vy += (dy / d) * f;
          }
        }
        n.vx *= 0.95;
        n.vy *= 0.95;
        n.x += n.vx + Math.sin(now * 0.0005 + n.ph) * 0.18;
        n.y += n.vy + Math.cos(now * 0.0004 + n.ph * 1.3) * 0.18;
        if (n.x < -20) n.x = width + 20;
        else if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        else if (n.y > height + 20) n.y = -20;
      }

      // links between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const A = nodes[i];
          const B = nodes[j];
          const dx = A.x - B.x;
          const dy = A.y - B.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const d = Math.sqrt(d2);
            const alpha = (1 - d / 120) * 0.16;
            ctx.strokeStyle = `rgba(${a.r},${a.g},${a.b},${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(A.x, A.y);
            ctx.lineTo(B.x, B.y);
            ctx.stroke();
          }
        }
      }

      // growth curve (upper sweeping line)
      ctx.save();
      ctx.strokeStyle = `rgba(${a.r},${a.g},${a.b},0.5)`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const y = height * 0.38 - Math.sin(x * 0.006 + now * 0.0004) * 14 - (x / width) * height * 0.06;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // drip-feed wave (lower flowing band)
      ctx.save();
      ctx.strokeStyle = `rgba(${a2.r},${a2.g},${a2.b},0.4)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const y = height * 0.72 + Math.sin(x * 0.008 + now * 0.0006) * 10 + Math.sin(x * 0.02 - now * 0.001) * 5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // tap ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 0.7;
        r.a -= 0.006;
        if (r.a <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(${a.r},${a.g},${a.b},${Math.max(0, r.a)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.min(r.r, r.max), 0, Math.PI * 2);
        ctx.stroke();
      }

      // glowing nodes
      for (const n of nodes) {
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.002 + n.ph);
        ctx.save();
        ctx.shadowColor = `rgba(${a.r},${a.g},${a.b},0.9)`;
        ctx.shadowBlur = 10 + pulse * 6;
        ctx.fillStyle = `rgba(${a.r},${a.g},${a.b},${0.35 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const loop = (now: number) => {
      if (gone) return;
      raf = requestAnimationFrame(loop);
      if (hidden) return;
      if (now - last < 33) return; // ~30fps cap
      last = now;
      if (now - accentT > 900) {
        const v = getVars();
        a = v.a;
        a2 = v.a2;
        accentT = now;
      }
      draw(now);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [animOn]);

  const cardCls =
    "absolute z-10 rounded-xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md";
  const statLabelCls = "text-[10px] uppercase tracking-wide text-white/55";
  const statValCls = "text-sm font-semibold text-white tabular-nums";

  return (
    <div
      ref={frameRef}
      className="relative h-44 w-full overflow-hidden rounded-2xl border border-white/10 sm:h-52 lg:h-[500px]"
    >
      {/* static gradient (fallback + base layer) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 20% 10%, var(--accent-soft), transparent 55%), radial-gradient(120% 120% at 85% 90%, rgba(109,40,217,0.25), transparent 55%), linear-gradient(160deg, #14141f, #0b0b14)",
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0"
        style={{ display: animOn ? "block" : "none" }}
      />

      {/* floating stat cards (drift via CSS) */}
      <div className={`${cardCls} auth-float-1 left-[6%] top-[34%]`}>
        <div className={statLabelCls}>{t("auth.visual.stat.views")}</div>
        <div className={statValCls}>
          <CountUp
            value={1280000}
            duration={1800}
            formatter={(n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : Math.round(n).toLocaleString())}
          />
        </div>
      </div>
      <div className={`${cardCls} auth-float-2 right-[7%] top-[16%]`}>
        <div className={statLabelCls}>{t("auth.visual.stat.orders")}</div>
        <div className={statValCls}>
          <CountUp value={347} duration={1400} />
        </div>
      </div>
      <div className={`${cardCls} auth-float-3 left-[14%] bottom-[12%] lg:left-[20%]`}>
        <div className={statLabelCls}>{t("auth.visual.stat.platforms")}</div>
        <div className={statValCls}>
          <CountUp value={12} duration={1000} />
        </div>
      </div>

      {/* rotating tagline */}
      <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center">
        <div
          key={tagIdx}
          className="auth-tagline rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-md"
        >
          {t(TAGLINE_KEYS[tagIdx])}
        </div>
      </div>
    </div>
  );
}
