"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney, formatDateTime } from "@/lib/currency";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  status: string;
  quantity: number;
  charge: number;
  link: string;
  created_at: string;
  services: any;
}

const PER_PAGE = 10;

function tone(status: string): "success" | "danger" | "warning" | "muted" {
  if (status === "completed") return "success";
  if (status === "cancelled" || status === "refunded") return "danger";
  if (status === "processing" || status === "in_progress") return "warning";
  return "muted";
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, quantity, charge, link, created_at, services(name, platform)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (active) {
        setOrders(data || []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter === "active") list = list.filter((o) => !["completed", "cancelled", "refunded"].includes(o.status));
    else if (filter !== "all") list = list.filter((o) => o.status === filter);
    if (q) list = list.filter((o) => (o.services?.name || "").toLowerCase().includes(q.toLowerCase()) || o.link.includes(q));
    return list;
  }, [orders, filter, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const shown = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-[var(--text-muted)]">{filtered.length} total</p>
        </div>
        <Link href="/dashboard/new-order"><Button size="sm">+ New order</Button></Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="sm:w-56">
          <Tabs tabs={FILTERS} value={filter} onChange={(v) => { setFilter(v); setPage(0); }} />
        </div>
        <Input placeholder="Search by service or link" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h10" /></svg>}
          title="No orders"
          description="Place an order to see it here."
          action={<Link href="/dashboard/new-order"><Button size="sm">Place order</Button></Link>}
        />
      ) : (
        <>
          <ul className="space-y-2">
            {shown.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/orders/${o.id}`} className="glass block rounded-2xl p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_var(--glow)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{o.services?.name || "Service"}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {o.services?.platform} · {o.quantity} · {formatDateTime(o.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold">{formatMoney(o.charge)}</span>
                      <Badge tone={tone(o.status)}>{ORDER_STATUS_LABELS[o.status] || o.status}</Badge>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                Prev
              </Button>
              <span className="text-sm text-[var(--text-muted)]">{page + 1} / {pages}</span>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
