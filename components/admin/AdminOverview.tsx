"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ChartShell } from "@/components/charts/ChartShell";
import { isMockMode } from "@/lib/provider";

export function AdminOverview() {
  const supabase = createClient();
  const [stats, setStats] = useState<any>(null);
  const [verifiedCount, setVerifiedCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/users/verified")
      .then((r) => r.json())
      .then((d) => {
        if (d?.verified) setVerifiedCount(Object.values(d.verified).filter(Boolean).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const [users, orders, payments, tickets] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("charge, status, created_at"),
        supabase.from("payments").select("id").eq("status", "pending"),
        supabase.from("tickets").select("id").eq("status", "open"),
      ]);
      setStats({
        users: users.count ?? 0,
        orders: orders.data || [],
        pendingPayments: payments.count ?? 0,
        openTickets: tickets.count ?? 0,
      });
    })();
  }, []);

  if (!stats) return <Skeleton className="h-64" />;

  const volume = stats.orders.reduce((s: number, o: any) => s + Number(o.charge || 0), 0);
  const active = stats.orders.filter((o: any) => !["completed", "cancelled", "refunded"].includes(o.status)).length;

  // charts (real order data)
  const dayLabels: string[] = [];
  const dayCounts: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayLabels.push(d.toLocaleDateString(undefined, { weekday: "short" }));
    dayCounts.push(stats.orders.filter((o: any) => o.created_at && o.created_at.slice(0, 10) === key).length);
  }
  const statusNames = ["pending", "in_progress", "completed", "cancelled", "refunded"];
  const statusCounts = statusNames.map((s) => stats.orders.filter((o: any) => o.status === s).length);

  return (
    <div className="space-y-5">
      {isMockMode() && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          ⚠️ Mock mode is active (no provider keys). Admin functions still work with fake data.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard accent label="Users" value={stats.users} />
        <StatCard label="Order volume" value={volume} format="money" />
        <StatCard label="Pending payments" value={stats.pendingPayments} />
        <StatCard label="Open tickets" value={stats.openTickets} />
      </div>

      <Card>
        <p className="mb-3 text-sm font-semibold">Verification &amp; growth funnel</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
            <p className="text-xs text-[var(--text-muted)]">Signups</p>
            <p className="mt-1 text-2xl font-bold">{stats.users}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
            <p className="text-xs text-[var(--text-muted)]">Verified</p>
            <p className="mt-1 text-2xl font-bold">{verifiedCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
            <p className="text-xs text-[var(--text-muted)]">First order</p>
            <p className="mt-1 text-2xl font-bold">{stats.orders.filter((o: any) => o.status !== "pending").length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
            <p className="text-xs text-[var(--text-muted)]">First deposit</p>
            <p className="mt-1 text-2xl font-bold">{stats.pendingPayments}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartShell title="Orders per day" labels={dayLabels} series={[{ label: "Orders", data: dayCounts }]} dateRanges={false} exportName="orders-per-day" />
          <ChartShell title="Order status" labels={statusNames} series={[{ label: "Orders", data: statusCounts, type: "bar" }]} dateRanges={false} exportName="order-status" />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><p className="text-sm text-[var(--text-muted)]">Active orders</p><p className="mt-1 text-2xl font-bold">{active}</p></Card>
        <Card>
          <p className="mb-3 text-sm font-semibold">Quick links</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/payments"><Button size="sm">Payments queue</Button></Link>
            <Link href="/admin/services"><Button size="sm" variant="outline">Sync services</Button></Link>
            <Link href="/admin/users"><Button size="sm" variant="outline">Users</Button></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
