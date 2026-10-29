"use client";

import { useState } from "react";
import { PublicShell } from "@/components/public/PublicShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function TrackerPage() {
  const [orderId, setOrderId] = useState("");
  const [result, setResult] = useState<null | { status: string; quantity: number; created: string; platform: string }>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!orderId.trim()) return setError("Please enter an order ID.");
    setBusy(true);
    try {
      const res = await fetch(`/api/public/tracker?id=${encodeURIComponent(orderId.trim())}`);
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Order not found.");
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell title="Order Tracker" subtitle="Check the delivery status of an order by its ID. No personal data is shown.">
      <form onSubmit={lookup} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Enter order ID (e.g. 550e8400-…)"
          className="flex-1"
        />
        <Button loading={busy} type="submit">Track order</Button>
      </form>

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      {result && (
        <div className="glass mt-6 rounded-2xl p-5">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Status</dt><dd className="font-semibold capitalize">{result.status}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Quantity</dt><dd className="font-semibold">{result.quantity}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Platform</dt><dd className="font-semibold capitalize">{result.platform}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Placed</dt><dd className="font-semibold">{result.created}</dd></div>
          </dl>
        </div>
      )}
    </PublicShell>
  );
}
