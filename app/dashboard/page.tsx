import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney, formatDateTime } from "@/lib/currency";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

function statusTone(status: string): "success" | "danger" | "warning" | "muted" {
  if (status === "completed") return "success";
  if (status === "cancelled" || status === "refunded") return "danger";
  if (status === "processing") return "warning";
  return "muted";
}

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const userId = user.id;

  const [ordersRes, spentRes, activeRes, lastRes, annRes, notifRes, profileRes] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("orders").select("charge").eq("user_id", userId),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("status", "in", '(completed,cancelled,refunded)'),
    supabase
      .from("orders")
      .select("id, status, quantity, charge, link, created_at, services(name, platform)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("announcements")
      .select("title, body")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false),
    supabase.from("profiles").select("balance").eq("id", userId).single(),
  ]);

  const balance = Number(profileRes.data?.balance || 0);

  const totalOrders = ordersRes.count ?? 0;
  const activeOrders = activeRes.count ?? 0;
  const totalSpent = (spentRes.data || []).reduce((s, r) => s + Number(r.charge || 0), 0);
  const unread = notifRes.count ?? 0;
  const lastOrders = lastRes.data || [];
  const announcement = annRes.data?.[0] || null;

  return (
    <div className="space-y-5">
      {announcement && (
        <div className="glass glass-glow rounded-2xl border-l-4 p-4" style={{ borderLeftColor: "var(--accent)" }}>
          <p className="text-sm font-semibold">{announcement.title}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{announcement.body}</p>
        </div>
      )}

      {unread > 0 && (
        <div className="glass rounded-2xl p-4 text-sm">
          <span className="font-medium">🔔 You have {unread} unread notification{unread > 1 ? "s" : ""}.</span>
          <Link href="/dashboard/settings" className="ml-2 text-[var(--accent)]">View</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard accent label="Balance" value={balance} format="money" />
        <StatCard label="Total orders" value={totalOrders} />
        <StatCard label="Total spent" value={totalSpent} format="money" />
        <StatCard label="Active orders" value={activeOrders} />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card glow className="flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold">Place a new order</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Pick a platform and service to get started. Instant or drip-feed.
            </p>
          </div>
          <Link href="/dashboard/new-order" className="mt-4">
            <Button full>New order</Button>
          </Link>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent orders</h2>
            <Link href="/dashboard/orders" className="text-sm text-[var(--accent)]">View all</Link>
          </div>
          {lastOrders.length === 0 ? (
            <EmptyState
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h10" /></svg>}
              title="No orders yet"
              description="Your orders will appear here once you place your first order."
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {lastOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{(o as any).services?.name || "Service"}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {(o as any).services?.platform} · {o.quantity} · {formatDateTime(o.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold">{formatMoney(o.charge)}</span>
                    <Badge tone={statusTone(o.status)}>{ORDER_STATUS_LABELS[o.status] || o.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
