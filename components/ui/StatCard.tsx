"use client";

import { CountUp } from "./CountUp";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";

interface StatCardProps {
  label: string;
  value: number;
  format?: "money";
  icon?: React.ReactNode;
  accent?: boolean;
  className?: string;
}

export function StatCard({ label, value, format, icon, accent, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-4",
        accent && "glass-glow",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
        {icon && <div className="text-[var(--accent)]">{icon}</div>}
      </div>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", accent && "text-[var(--accent)]")}>
        <CountUp value={value} formatter={format === "money" ? (n) => formatMoney(n) : undefined} />
      </p>
    </div>
  );
}
