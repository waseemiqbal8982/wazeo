"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney, formatDateTime } from "@/lib/currency";

export function PaymentHistory({ history }: { history: any[] }) {
  return (
    <Card>
      <p className="mb-3 text-sm font-semibold">Payment history</p>
      {history.length === 0 ? (
        <EmptyState title="No payments yet" description="Your submitted payments will appear here." />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {history.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{formatMoney(p.amount)}</p>
                <p className="text-xs text-[var(--text-muted)]">{p.method} · {formatDateTime(p.created_at)}</p>
              </div>
              <Badge tone={p.status === "approved" ? "success" : p.status === "rejected" ? "danger" : "warning"}>{p.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
