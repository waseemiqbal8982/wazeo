"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from "chart.js";
import { Line } from "react-chartjs-2";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney, formatDateTime } from "@/lib/currency";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { Stats } from "./StatBox";
import { ChunksTable } from "./ChunksTable";
import { RateOrder } from "./RateOrder";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export function OrderDetail({ id }: { id: string }) {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: o }, { data: c }] = await Promise.all([
      supabase.from("orders").select("*, services(name, platform)").eq("id", id).single(),
      supabase.from("order_chunks").select("*").eq("order_id", id).order("run_at", { ascending: true }),
    ]);
    setOrder(o);
    setChunks(c || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [id]);

  const chart = useMemo(() => {
    let planned = 0, delivered = 0;
    const labels: string[] = [], plannedData: number[] = [], deliveredData: number[] = [];
    chunks.forEach((c) => {
      planned += Number(c.quantity) || 0;
      if (c.status === "done") delivered += Number(c.quantity) || 0;
      labels.push(formatDateTime(c.run_at));
      plannedData.push(planned);
      deliveredData.push(delivered);
    });
    return {
      labels,
      datasets: [
        { label: "Planned", data: plannedData, borderColor: "#8B5CF6", backgroundColor: "rgba(139,92,246,0.1)", fill: true, tension: 0.3, pointRadius: 0 },
        { label: "Delivered", data: deliveredData, borderColor: "#10B981", backgroundColor: "transparent", tension: 0.3, pointRadius: 0 },
      ],
    };
  }, [chunks]);

  async function refresh() {
    const res = await fetch("/api/orders/refresh", { method: "POST" });
    const data = await res.json();
    toast({ title: res.ok ? `Refreshed ${data.updated} order(s)` : "Refresh failed", variant: res.ok ? "success" : "danger" });
    load();
  }

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  }
  if (!order) return <EmptyState title="Order not found" />;

  const deliveredNow = chunks.filter((c) => c.status === "done").reduce((s, c) => s + Number(c.quantity), 0);
  const plannedTotal = chunks.reduce((s, c) => s + Number(c.quantity), 0);
  const progress = plannedTotal ? Math.round((deliveredNow / plannedTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{order.services?.name || "Order"}</h1>
          <p className="text-sm text-[var(--text-muted)]">#{order.id.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={order.status === "completed" ? "success" : order.status === "cancelled" || order.status === "refunded" ? "danger" : "warning"}>
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={refresh}>Refresh</Button>
        </div>
      </div>

      {(() => {
        const steps = ["pending", "processing", "in_progress", "completed"];
        const idx = steps.indexOf(order.status);
        return (
          <Card>
            <div className="flex items-center justify-between">
              {steps.map((s, i) => (
                <div key={s} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-200 ${
                        i < idx
                          ? "bg-[var(--success)] text-white"
                          : i === idx
                          ? "bg-[var(--accent)] text-white"
                          : "bg-white/[0.08] text-[var(--text-muted)]"
                      }`}
                    >
                      {i < idx ? "✓" : i + 1}
                    </div>
                    <span className={`mt-1 text-[10px] ${i <= idx ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
                      {ORDER_STATUS_LABELS[s] || s}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`mx-1 mb-4 h-0.5 flex-1 rounded ${i < idx ? "bg-[var(--success)]" : "bg-white/[0.08]"}`} />
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stats label="Link" value={<span className="block max-w-[140px] truncate">{order.link}</span>} />
        <Stats label="Quantity" value={order.quantity} />
        <Stats label="Charge" value={formatMoney(order.charge)} />
        <Stats label="Progress" value={`${progress}%`} />
      </div>

      {chunks.length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-semibold">Delivery schedule</p>
          <div className="h-48">
            <Line data={chart} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#9b9fb2", font: { size: 10 } } }, x: { grid: { display: false }, ticks: { color: "#9b9fb2", font: { size: 9 }, maxTicksLimit: 6 } } }, plugins: { legend: { labels: { color: "#f2f2f7", font: { size: 11 } } } } }} />
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex items-center justify-between p-4 pb-2">
          <p className="text-sm font-semibold">Chunks</p>
          <span className="text-xs text-[var(--text-muted)]">{chunks.length} planned</span>
        </div>
        <ChunksTable chunks={chunks} />
      </Card>

      {order.status === "completed" && <RateOrder orderId={order.id} />}

      <Button variant="outline" onClick={() => router.push("/dashboard/orders")}>← Back to orders</Button>
    </div>
  );
}
