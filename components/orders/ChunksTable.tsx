"use client";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/currency";

function tone(status: string) {
  if (status === "done") return "success";
  if (status === "failed") return "danger";
  if (status === "sent") return "warning";
  return "muted";
}

export function ChunksTable({ chunks }: { chunks: any[] }) {
  if (chunks.length === 0) {
    return <div className="p-4"><EmptyState title="No chunks" description="This order doesn't use scheduled chunks." /></div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--text-muted)]">
            <th className="px-4 py-2 font-medium">Run at</th>
            <th className="px-4 py-2 font-medium">Quantity</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Provider</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {chunks.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-2.5 text-[var(--text-muted)]">{formatDateTime(c.run_at)}</td>
              <td className="px-4 py-2.5">{c.quantity}</td>
              <td className="px-4 py-2.5"><Badge tone={tone(c.status)}>{c.status}</Badge></td>
              <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{c.provider_order_id || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
