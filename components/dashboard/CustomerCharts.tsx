"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChartShell } from "@/components/charts/ChartShell";

type OrderRow = { platform: string; created_at: string; charge: number };

export function CustomerCharts() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OrderRow[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          if (active) setLoading(false);
          return;
        }
        const { data: orders } = await supabase
          .from("orders")
          .select("charge, created_at, services(platform)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);
        if (active) {
          setData(
            (orders || []).map((o: any) => ({
              platform: o.services?.platform || "other",
              created_at: o.created_at || "",
              charge: Number(o.charge || 0),
            }))
          );
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Spending over the last 30 days.
  const spendLabels: string[] = [];
  const spendValues: number[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    spendLabels.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    spendValues.push(
      data
        .filter((o) => o.created_at && o.created_at.slice(0, 10) === key)
        .reduce((s, o) => s + o.charge, 0)
    );
  }

  // Orders by platform.
  const platOrder = ["instagram", "tiktok", "youtube"];
  const platformNames = platOrder.map((p) => p[0].toUpperCase() + p.slice(1));
  const platformCounts = platOrder.map((p) => data.filter((o) => o.platform === p).length);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartShell
        title="Spending (last 30 days)"
        labels={spendLabels}
        series={[{ label: "Spend", data: spendValues }]}
        loading={loading}
        exportName="customer-spend"
      />
      <ChartShell
        title="Orders by platform"
        labels={platformNames}
        series={[{ label: "Orders", data: platformCounts, type: "bar" }]}
        loading={loading}
        exportName="customer-platform"
      />
    </div>
  );
}
