"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildSchedule } from "@/lib/schedule";
import { validateLink } from "@/lib/validation";
import { useShell } from "@/components/dashboard/shell-context";
import { useToast } from "@/components/ui/Toast";
import { ServicePicker } from "./ServicePicker";
import { OrderForm } from "./OrderForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/lib/currency-store";

interface Service {
  id: string;
  name: string;
  platform: string;
  category: string;
  provider_rate: number;
  markup_percent: number;
  min: number;
  max: number;
}

export function NewOrderPage() {
  const router = useRouter();
  const { balance, setBalance } = useShell();
  const { toast } = useToast();
  const { fmt } = useCurrency();
  const supabase = createClient();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("instant");
  const [platform, setPlatform] = useState("instagram");
  const [selected, setSelected] = useState<Service | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [curve, setCurve] = useState("steady");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("services").select("*").eq("active", true);
      if (active) {
        setServices(data || []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const qty = Number(quantity) || 0;
  const sellPerUnit = selected ? selected.provider_rate * (1 + selected.markup_percent / 100) : 0;
  const estCost = qty * sellPerUnit;
  const linkError = link ? validateLink(platform, link) : null;

  const schedule = useMemo(() => {
    if (mode !== "drip" || !selected || qty <= 0) return [];
    return buildSchedule(qty, Number(durationMinutes) || 60, curve as any, Number(selected.min));
  }, [mode, selected, qty, durationMinutes, curve]);

  function validate(): string | null {
    if (!selected) return "Please choose a service.";
    if (!link) return "Please paste your link.";
    if (linkError) return linkError;
    if (!qty || qty <= 0) return "Enter a quantity.";
    if (qty < Number(selected.min) || qty > Number(selected.max)) {
      return `Quantity must be between ${selected.min} and ${selected.max}.`;
    }
    if (mode === "drip") {
      const dur = Number(durationMinutes);
      if (!dur || dur < 15 || dur > 72 * 60) return "Duration must be 15 min – 72 hours.";
      if (qty < Math.min(10, Number(selected.min))) return "Drip-feed quantity minimum is 10.";
    }
    if (estCost > balance) return "Insufficient balance for this order.";
    return null;
  }

  function handleConfirm() {
    setError("");
    const v = validate();
    if (v) return setError(v);
    setConfirmOpen(true);
  }

  async function placeOrder() {
    setConfirmOpen(false);
    setError("");
    const v = validate();
    if (v) return setError(v);

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selected!.id,
          link: link.trim(),
          quantity: qty,
          mode,
          durationMinutes: mode === "drip" ? Number(durationMinutes) : undefined,
          curve: mode === "drip" ? curve : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not place order.");
        return;
      }
      setBalance(Number(data.balance));
      toast({ title: mode === "drip" ? "Drip order placed" : "Order placed", description: "We're now processing your order.", variant: "success" });
      router.push("/dashboard/orders");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">New Order</h1>
        <p className="text-sm text-[var(--text-muted)]">Choose a service and paste your link.</p>
      </div>

      <ServicePicker
        services={services}
        loading={loading}
        platform={platform}
        onPlatform={(p) => { setPlatform(p); setSelected(null); }}
        selected={selected}
        onSelect={setSelected}
      />

      <OrderForm
        mode={mode}
        onMode={setMode}
        platform={platform}
        link={link}
        onLink={setLink}
        linkError={linkError}
        quantity={quantity}
        onQuantity={setQuantity}
        durationMinutes={durationMinutes}
        onDuration={setDurationMinutes}
        curve={curve}
        onCurve={setCurve}
        schedule={schedule}
        selected={selected}
        estCost={estCost}
        balance={balance}
        error={error}
        submitting={submitting}
        onSubmit={handleConfirm}
      />

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm order">
        {selected && (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3 text-sm">
              <p className="font-medium">{selected.name}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Link: {link}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
                <p className="text-xs text-[var(--text-muted)]">Quantity</p>
                <p className="mt-1 font-semibold">{qty}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
                <p className="text-xs text-[var(--text-muted)]">Mode</p>
                <p className="mt-1 font-semibold capitalize">{mode}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
                <p className="text-xs text-[var(--text-muted)]">Cost</p>
                <p className="mt-1 text-lg font-bold text-[var(--accent)]">{fmt(estCost)}</p>
              </div>
            </div>
            <Button full loading={submitting} onClick={placeOrder}>Place order</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
