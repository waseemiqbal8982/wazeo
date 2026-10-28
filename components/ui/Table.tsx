"use client";

import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  emptyState?: React.ReactNode;
  className?: string;
  dense?: boolean;
}

export function Table<T>({ columns, data, rowKey, emptyState, className, dense }: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6">
        {emptyState ?? (
          <p className="text-center text-sm text-[var(--text-muted)]">Koi data nahi.</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-[var(--border)]", className)}>
      {/* Desktop: real table (>= sm). Phone: stacked cards with table hidden. */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-white/[0.02]">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3 font-medium text-[var(--text-muted)]", dense ? "py-2 text-xs" : "", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={rowKey(row)} className="border-b border-[var(--border)]/50 last:border-0 transition-colors hover:bg-white/[0.03]">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 text-[var(--text)]", dense ? "py-2" : "py-3.5", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: stacked cards. */}
      <div className="divide-y divide-[var(--border)]/60 sm:hidden">
        {data.map((row) => (
          <div key={rowKey(row)} className="px-4 py-3">
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-3 py-1">
                  <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">{c.header}</span>
                  <span className="text-right text-sm text-[var(--text)]">{c.cell(row)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
