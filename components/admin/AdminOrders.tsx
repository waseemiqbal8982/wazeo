"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatMoney, formatDateTime } from "@/lib/currency";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export function AdminOrders() {
  const supabase = createClient();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("*, services(name, platform), profiles(username)")
      .order("created_at", { ascending: false })
      .limit(200);
    setOrders(data || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "active") return orders.filter((o) => !["completed", "cancelled", "refunded"].includes(o.status));
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  async function cancelRefund(id: string) {
    const { error } = await supabase.rpc("cancel_and_refund", { p_order_id: id });
    if (error) return toast({ title: error.message, variant: "danger" });
    toast({ title: "Order refunded", variant: "success" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-[var(--text-muted)]">{filtered.length} shown</p>
        </div>
        <div className="w-56"><Tabs tabs={FILTERS} value={filter} onChange={setFilter} /></div>
      </div>

      <div className="glass rounded-2xl">
        <div className="max-h-[70vh] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#12121f]">
              <tr className="text-left text-xs text-[var(--text-muted)]">
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Charge</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2.5">
                    <p className="max-w-[180px] truncate font-medium">{o.services?.name || "Service"}</p>
                    <p className="text-xs text-[var(--text-muted)]">{formatDateTime(o.created_at)}</p>
                  </td>
                  <td className="px-4 py-2.5">{o.profiles?.username || "—"}</td>
                  <td className="px-4 py-2.5">{o.quantity}</td>
                  <td className="px-4 py-2.5">{formatMoney(o.charge)}</td>
                  <td className="px-4 py-2.5"><Badge tone={o.status === "completed" ? "success" : o.status === "cancelled" || o.status === "refunded" ? "danger" : "warning"}>{ORDER_STATUS_LABELS[o.status] || o.status}</Badge></td>
                  <td className="px-4 py-2.5">
                    {!["completed", "cancelled", "refunded"].includes(o.status) && (
                      <Button size="sm" variant="danger" onClick={() => cancelRefund(o.id)}>Refund</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
