"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export interface CurveDatum {
  x: number; // minutes offset
  y: number; // cumulative delivered
}

export interface CurveChartProps {
  planned?: CurveDatum[];
  delivered?: CurveDatum[];
  title?: string;
  height?: number;
  compact?: boolean; // sparkline mode
  showThresholds?: boolean;
  area?: boolean;
  className?: string;
}

const ACCENT = "var(--accent)";
const EMERALD = "var(--success)";
const MUTED = "var(--text-muted)";
const GRID = "rgba(255,255,255,0.06)";

function fmtTime(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  if (min < 1440) return `${(min / 60).toFixed(min % 60 === 0 ? 0 : 1)}h`;
  return `${(min / 1440).toFixed(min % 1440 === 0 ? 0 : 1)}d`;
}

function normalize(data: CurveDatum[] | undefined): CurveDatum[] | undefined {
  if (!data || data.length === 0) return undefined;
  return data;
}

export function CurveChart({
  planned,
  delivered,
  title,
  height = 200,
  compact = false,
  showThresholds = true,
  area = false,
  className,
}: CurveChartProps) {
  const chartRef = useRef<ChartJS | null>(null);

  const plannedN = useMemo(() => normalize(planned), [planned]);
  const deliveredN = useMemo(() => normalize(delivered), [delivered]);

  const data = useMemo(() => {
    const labels = plannedN ? plannedN.map((d) => fmtTime(d.x)) : deliveredN ? deliveredN.map((d) => fmtTime(d.x)) : [];
    const datasets: any[] = [];

    if (deliveredN) {
      datasets.push({
        label: "Delivered",
        data: deliveredN.map((d) => d.y),
        borderColor: EMERALD,
        backgroundColor: area ? "rgba(16,185,129,0.12)" : undefined,
        fill: area,
        borderWidth: compact ? 1.5 : 2,
        pointRadius: 0,
        tension: 0.4,
      });
    }

    if (plannedN) {
      datasets.push({
        label: "Planned",
        data: plannedN.map((d) => d.y),
        borderColor: ACCENT,
        borderDash: [5, 4],
        fill: false,
        borderWidth: compact ? 1.5 : 2,
        pointRadius: 0,
        tension: 0.35,
      });
    }

    return { labels, datasets };
  }, [plannedN, deliveredN, area, compact]);

  const options = useMemo(() => {
    const base: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: compact ? { display: false } : { labels: { color: MUTED, usePointStyle: true, boxWidth: 8 } },
        tooltip: {
          backgroundColor: "var(--surface-2)",
          borderColor: GRID,
          borderWidth: 1,
          titleColor: "var(--text)",
          bodyColor: "var(--text)",
          callbacks: {
            title: (items: any[]) => (items[0] ? items[0].label : ""),
          },
        },
      },
      scales: compact
        ? { x: { display: false }, y: { display: false } }
        : {
            x: { grid: { color: GRID }, ticks: { color: MUTED, maxTicksLimit: 8 }, border: { color: GRID } },
            y: {
              grid: { color: GRID },
              ticks: { color: MUTED },
              border: { color: GRID },
              beginAtZero: true,
              title: { display: true, text: "Delivered", color: MUTED },
            },
          },
    };
    return base;
  }, [compact]);

  return (
    <div className={className} style={{ height: compact ? 36 : height, position: "relative" }}>
      {title && !compact && (
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">{title}</p>
      )}
      <Line ref={chartRef as any} data={data} options={options} />
      {showThresholds && !compact && plannedN && plannedN.length > 0 && (
        <div className="pointer-events-none absolute right-0 top-0 hidden items-center gap-3 text-[10px] text-[var(--text-muted)] sm:flex">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: ACCENT }} /> Planned
          </span>
          {deliveredN && (
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4" style={{ background: EMERALD }} /> Delivered
            </span>
          )}
        </div>
      )}
    </div>
  );
}
