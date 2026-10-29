"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  value: number[]; // control-point weights 0..1 (y)
  onChange: (points: number[]) => void;
  height?: number;
}

// A touch-friendly canvas editor for drawing a delivery-speed curve. The user
// drags 6–12 control points (or draws freehand, smoothed to control points).
export function CurveCanvas({ value, onChange, height = 220 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);

  const points = useMemo(
    () => (value.length >= 2 ? value : [0.2, 0.8, 0.5, 1, 0.3]),
    [value]
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // area + curve
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - p * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#8B5CF6";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // fill
    const fill = ctx.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, "rgba(139,92,246,0.25)");
    fill.addColorStop(1, "rgba(139,92,246,0)");
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    // control points
    points.forEach((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - p * height;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = i === dragging ? "#22D3EE" : "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "rgba(139,92,246,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [points, dragging]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const toPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height));
    return { x, y };
  }, []);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number, freehand: boolean) => {
      const { x, y } = toPoint(clientX, clientY);
      if (freehand) {
        // append / snap to a fixed set of 8 evenly spaced control points
        const count = 8;
        const idx = Math.round(x * (count - 1));
        const next = [...points];
        while (next.length < count) next.push(0.5);
        next[idx] = y;
        onChange(next.slice(0, count));
      } else if (dragging !== null) {
        const next = [...points];
        next[dragging] = y;
        onChange(next);
      } else {
        // tap to add/toggle nearest point
        const idx = Math.round(x * (points.length - 1));
        const next = [...points];
        next[idx] = y;
        onChange(next);
      }
    },
    [toPoint, onChange, points, dragging]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setActive(true);
    const idx = Math.round(toPoint(e.clientX, e.clientY).x * (points.length - 1));
    setDragging(idx);
    updateFromPointer(e.clientX, e.clientY, false);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active) return;
    updateFromPointer(e.clientX, e.clientY, dragging === null);
  };

  const onPointerUp = () => {
    setActive(false);
    setDragging(null);
  };

  const addPoint = () => {
    if (points.length < 12) {
      const next = [...points, 0.5];
      onChange(next);
    }
  };

  const undo = () => {
    if (points.length > 2) onChange(points.slice(0, -1));
  };

  const reset = () => onChange([0.2, 0.8, 0.5, 1, 0.3]);

  const smooth = () => {
    // simple 3-point moving average for a smoother curve
    const next = points.map((p, i) => {
      const prev = points[i - 1] ?? p;
      const nxt = points[i + 1] ?? p;
      return (prev + p + nxt) / 3;
    });
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-white/[0.02]" style={{ height, touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={560}
          height={220}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="h-full w-full cursor-crosshair"
          style={{ touchAction: "none" }}
        />
        <span className="pointer-events-none absolute left-2 top-1.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          Delivery speed →
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={addPoint} disabled={points.length >= 12}>Add point</Button>
        <Button size="sm" variant="outline" onClick={smooth}>Smooth</Button>
        <Button size="sm" variant="outline" onClick={undo} disabled={points.length <= 2}>Undo</Button>
        <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
        <span className="ml-auto text-xs text-[var(--text-muted)]">{points.length} points</span>
      </div>
    </div>
  );
}
