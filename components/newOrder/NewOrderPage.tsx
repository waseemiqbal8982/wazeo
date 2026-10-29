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
  const [platform, setPlatform] = useState("instagram");
  const [selected, setSelected] = useState<Service | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [startDelayMinutes, setStartDelayMinutes] = useState("0");
  const [variation, setVariation] = useState("10");
  const [minRun, setMinRun] = useState("");
  const [maxRun, setMaxRun] = useState("");
  const [curve, setCurve] = useState("steady");
  const [curvePoints, setCurvePoints] = useState<number[]>([0.2, 0.8, 0.5, 1, 0.3]);
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
    if (!selected || qty <= 0) return [];
    const rMin = Number(minRun) > 0 ? Number(minRun) : Number(selected.min) || 10;
    const rMax = Number(maxRun) > 0 ? Number(maxRun) : 0;
    return buildSchedule(qty, Number(durationMinutes) || 60, curve as any, rMin, {
      variation: Math.min(30, Math.max(0, Number(variation) || 0)),
      startDelayMinutes: Math.max(0, Number(startDelayMinutes) || 0),
      minRun: rMin,
      ...(rMax > rMin ? { maxRun: rMax } : {}),
      ...(curve === "custom" ? { curvePoints } : {}),
    });
  }, [selected, qty, durationMinutes, curve, minRun, maxRun, variation, startDelayMinutes, curvePoints]);

  const summary = useMemo(() => {
    if (schedule.length < 2) return "";
    const gaps = schedule.slice(1).map((c, i) => c.minutes - schedule[i].minutes);
    const minGap = Math.max(1, Math.floor(Math.min(...gaps)));
    const maxGap = Math.max(minGap, Math.ceil(Math.max(...gaps)));
    const totalMinutes = schedule[schedule.length - 1].minutes;
    const hours = totalMinutes / 60;
    const finish = hours < 1 ? `${Math.round(totalMinutes)} minutes` : `${Math.round(hours * 10) / 10} hours`;
    return `about every ${minGap} to ${maxGap} minutes, finishing in about ${finish}`;
  }, [schedule]);

  function validate(): string | null {
    if (!selected) return "Please choose a service.";
    if (!link) return "Please paste your link.";
    if (linkError) return linkError;
    if (!qty || qty <= 0) return "Enter a quantity.";
    if (qty < Number(selected.min) || qty > Number(selected.max)) {
      return `Quantity must be between ${selected.min} and ${selected.max}.`;
    }
    const dur = Number(durationMinutes);
    if (!dur || dur < 15 || dur > 72 * 60) return "Duration must be 15 min – 72 hours.";
    const delay = Number(startDelayMinutes) || 0;
    if (delay >= dur) return "Start delay must be shorter than the duration.";
    if (curve === "custom" && curvePoints.length < 2) return "Draw your delivery curve.";
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
          durationMinutes: Number(durationMinutes),
          curve,
          curvePoints: curve === "custom" ? curvePoints : undefined,
          startDelayMinutes: Number(startDelayMinutes) || 0,
          variation: Number(variation) || 0,
          minRun: Number(minRun) > 0 ? Number(minRun) : undefined,
          maxRun: Number(maxRun) > 0 ? Number(maxRun) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not place order.");
        return;
      }
      setBalance(Number(data.balance));
      toast({ title: "Delivery order placed", description: "We're now processing your order.", variant: "success" });
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
        platform={platform}
        link={link}
        onLink={setLink}
        linkError={linkError}
        quantity={quantity}
        onQuantity={setQuantity}
        durationMinutes={durationMinutes}
        onDuration={setDurationMinutes}
        startDelayMinutes={startDelayMinutes}
        onStartDelay={setStartDelayMinutes}
        variation={variation}
        onVariation={setVariation}
        minRun={minRun}
        onMinRun={setMinRun}
        maxRun={maxRun}
        onMaxRun={setMaxRun}
        curve={curve}
        onCurve={setCurve}
        curvePoints={curvePoints}
        onCurvePoints={setCurvePoints}
        schedule={schedule}
        summary={summary}
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
                <p className="text-xs text-[var(--text-muted)]">Delivery</p>
                <p className="mt-1 font-semibold">{Math.round(Number(durationMinutes) / 60 * 10) / 10}h</p>
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
