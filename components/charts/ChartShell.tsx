"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { cn } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

/* ------------------------------------------------------------------ */
/* Theme-aware palette (8 accents + light)                             */
/* ------------------------------------------------------------------ */
const ACCENT_PALETTE = [
  "#22d3ee", // cyan
  "#10b981", // emerald
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#3b82f6", // blue
  "#f97316", // orange
  "#ec4899", // pink
];

export interface ChartSeries {
  label: string;
  data: number[];
  color?: string;
  type?: "line" | "bar";
}

export interface ChartShellProps {
  title: string;
  labels: string[];
  series: ChartSeries[];
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
  dateRanges?: boolean;
  compare?: boolean;
  live?: boolean;
  onRangeChange?: (range: string) => void;
  exportName?: string;
  className?: string;
}

export function ChartShell({
  title,
  labels,
  series,
  height = 260,
  loading = false,
  emptyMessage = "Your chart will grow with your first order",
  dateRanges = true,
  compare = false,
  live = false,
  onRangeChange,
  exportName = "chart",
  className,
}: ChartShellProps) {
  const chartRef = useRef<ChartJS<"line" | "bar"> | null>(null);
  const [range, setRange] = useState("30");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [tick, setTick] = useState(0);
  const [zoomed, setZoomed] = useState<[number, number] | null>(null);

  // theme-aware styling
  const { accent, dark, textMuted } = useMemo(() => {
    if (typeof window === "undefined") return { accent: ACCENT_PALETTE[0], dark: false, textMuted: "#9ca3af" };
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || ACCENT_PALETTE[0];
    const dark = document.documentElement.getAttribute("data-mode") !== "light";
    const textMuted = dark ? "#9ca3af" : "#6b7280";
    return { accent, dark, textMuted };
  }, [tick]);

  // pause live updates when tab hidden
  useEffect(() => {
    if (!live) return;
    const iv = setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, 20000);
    const onVis = () => setTick((t) => t + 1);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [live]);

  const visible = useMemo(() => {
    const cleaned = series.map((s) => ({ ...s, data: s.data.map((v) => Number(v) || 0) }));
    let lab = labels;
    if (zoomed) {
      const [a, b] = zoomed;
      lab = labels.slice(a, b + 1);
      cleaned.forEach((s) => { s.data = s.data.slice(a, b + 1); });
    }
    return { lab, cleaned };
  }, [labels, series, zoomed]);

  const datasets = useMemo(
    () =>
      visible.cleaned.map((s, i) => ({
        label: s.label,
        data: s.data,
        hidden: hidden[s.label] ?? false,
        borderColor: s.color || ACCENT_PALETTE[i % ACCENT_PALETTE.length],
        backgroundColor: s.color ? s.color + "33" : ACCENT_PALETTE[i % ACCENT_PALETTE.length] + "33",
        borderWidth: 2,
        tension: 0.35,
        fill: s.type === "line",
        pointRadius: 0,
        pointHoverRadius: 4,
        type: s.type || "line",
      })),
    [visible, hidden]
  );

  const data = { labels: visible.lab, datasets } as never;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: dark ? "#181826" : "#ffffff",
        titleColor: dark ? "#e5e7eb" : "#111827",
        bodyColor: textMuted,
        borderColor: "rgba(128,128,160,0.25)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        titleFont: { size: 12, weight: 600 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textMuted, maxTicksLimit: 6, font: { size: 10 } },
        border: { color: "rgba(128,128,160,0.15)" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: textMuted, font: { size: 10 } },
        grid: { color: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        border: { display: false },
      },
    },
  } as never;

  const total = useMemo(() => visible.cleaned.reduce((a, s) => a + s.data.reduce((x, v) => x + v, 0), 0), [visible]);
  const prevTotal = useMemo(() => {
    const n = visible.lab.length;
    if (!n) return 0;
    return visible.cleaned.reduce((a, s) => {
      let sum = 0;
      for (let i = Math.max(0, n - s.data.length); i < s.data.length; i++) sum += s.data[i - n] ?? 0;
      return a + sum;
    }, 0);
  }, [visible]);
  const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  function exportPng() {
    if (!chartRef.current) return;
    const a = document.createElement("a");
    a.href = chartRef.current.toBase64Image("image/png", 1);
    a.download = `${exportName}.png`;
    a.click();
  }
  function exportCsv() {
    const rows: (string | number)[][] = [["label", ...visible.cleaned.map((s) => s.label)]];
    visible.lab.forEach((l, i) => rows.push([l, ...visible.cleaned.map((s) => s.data[i] ?? 0)]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${exportName}.csv`;
    a.click();
  }

  const dragRef = useRef<{ startX: number; index: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  function findIndexAt(clientX: number) {
    const el = containerRef.current;
    if (!el || labels.length < 2) return 0;
    const r = el.getBoundingClientRect();
    const x = clientX - r.left;
    const w = r.width;
    const i = Math.floor((x / w) * labels.length);
    return Math.max(0, Math.min(labels.length - 1, i));
  }

  return (
    <div ref={containerRef} className={cn("rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
          {compare && delta != null && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              vs previous period:{" "}
              <span className={delta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {delta >= 0 ? "+" : ""}{delta}%
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {live && (
            <span className="flex items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
              Live
            </span>
          )}
          <button onClick={exportPng} title="Export PNG" className="rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text)]">PNG</button>
          <button onClick={exportCsv} title="Export CSV" className="rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text)]">CSV</button>
        </div>
      </div>

      {dateRanges && (
        <div className="mb-2 flex flex-wrap gap-1">
          {[["7", "7d"], ["30", "30d"], ["90", "90d"]].map(([v, label]) => (
            <button
              key={v}
              onClick={() => { setRange(v); setZoomed(null); onRangeChange?.(v); }}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                range === v ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => { setRange("today"); setZoomed(null); onRangeChange?.("today"); }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
              range === "today" ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            Today
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex h-[260px] flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-white/[0.05]" />
          ))}
        </div>
      ) : total === 0 && visible.lab.length === 0 ? (
        <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="opacity-60"><path d="M3 3v18h18M7 14l4-4 3 3 5-6" /></svg>
          <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div
            className="relative cursor-crosshair"
            style={{ height }}
            onMouseDown={(e) => { dragRef.current = { startX: e.clientX, index: findIndexAt(e.clientX) }; }}
            onMouseMove={(e) => {
              if (!dragRef.current) return;
              const idx = findIndexAt(e.clientX);
              const start = Math.min(dragRef.current.index, idx);
              const end = Math.max(dragRef.current.index, idx);
              setZoomed([start, end]);
            }}
            onMouseUp={() => { dragRef.current = null; }}
            onMouseLeave={() => { dragRef.current = null; }}
          >
            <Line data={data} options={options} ref={chartRef as never} />
            {zoomed && (
              <button
                onClick={() => { setZoomed(null); setRange("30"); }}
                className="absolute bottom-2 right-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-medium text-[var(--accent)]"
              >
                Reset zoom
              </button>
            )}
          </div>

          {series.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {visible.cleaned.map((s, i) => {
                const isHidden = hidden[s.label] ?? false;
                return (
                  <button
                    key={s.label}
                    onClick={() => setHidden((h) => ({ ...h, [s.label]: !(h[s.label] ?? false) }))}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                      isHidden ? "border-[var(--border)] text-[var(--text-muted)] opacity-60" : "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color || ACCENT_PALETTE[i % ACCENT_PALETTE.length] }} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
