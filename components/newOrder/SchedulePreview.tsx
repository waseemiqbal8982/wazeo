"use client";

import { useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { ScheduleChunk } from "@/lib/schedule";
import { formatNumber } from "@/lib/currency";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export function SchedulePreview({ schedule, curve }: { schedule: ScheduleChunk[]; curve: string }) {
  const data = useMemo(() => {
    let acc = 0;
    const cum: number[] = [];
    schedule.forEach((c) => { acc += c.quantity; cum.push(acc); });
    const labels = schedule.map((c) => {
      const hours = c.minutes / 60;
      return hours < 1 ? `${Math.round(c.minutes)}m` : `${Math.round(hours * 10) / 10}h`;
    });
    return {
      labels,
      datasets: [
        {
          label: "Planned delivered",
          data: cum,
          borderColor: "#8B5CF6",
          backgroundColor: "rgba(139,92,246,0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
  }, [schedule]);

  const total = schedule.reduce((s, c) => s + c.quantity, 0);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">Schedule preview</span>
        <span className="text-xs text-[var(--text-muted)]">
          {formatNumber(total)} total · {curve.replace("_", " ")}
        </span>
      </div>
      <div className="h-40 rounded-xl border border-[var(--border)] bg-white/[0.02] p-2">
        {schedule.length === 0 ? (
          <p className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
            Enter quantity & duration to preview
          </p>
        ) : (
          <Line data={data} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }} />
        )}
      </div>
    </div>
  );
}
