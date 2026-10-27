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
  const supabase = createClient();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("instant");
  const [platform, setPlatform] = useState("instagram");
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Service | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [curve, setCurve] = useState("steady");
  const [submitting, setSubmitting] = useState(false);
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

  async function submit() {
    setError("");
    if (!selected) return setError("Please choose a service.");
    if (!link) return setError("Please paste your link.");
    if (linkError) return setError(linkError);
    if (!qty || qty <= 0) return setError("Enter a quantity.");
    if (qty < Number(selected.min) || qty > Number(selected.max)) {
      return setError(`Quantity must be between ${selected.min} and ${selected.max}.`);
    }
    if (mode === "drip") {
      const dur = Number(durationMinutes);
      if (!dur || dur < 15 || dur > 72 * 60) return setError("Duration must be 15 min – 72 hours.");
      if (qty < Math.min(10, Number(selected.min))) return setError("Drip-feed quantity minimum is 10.");
    }
    if (estCost > balance) return setError("Insufficient balance for this order.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selected.id,
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
        onPlatform={(p) => { setPlatform(p); setSelected(null); setCategory("all"); }}
        category={category}
        onCategory={setCategory}
        q={q}
        onQ={setQ}
        selected={selected}
        onSelect={(s) => { setSelected(s); setCategory(s.category); }}
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
        onSubmit={submit}
      />
    </div>
  );
}
