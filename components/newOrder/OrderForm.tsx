"use client";

import { CURVES, PLATFORMS } from "@/lib/constants";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { useCurrency } from "@/lib/currency-store";
import { SchedulePreview } from "./SchedulePreview";
import type { ScheduleChunk } from "@/lib/schedule";

interface Service {
  provider_rate: number;
  markup_percent: number;
  min: number;
  max: number;
}

interface Props {
  mode: string;
  onMode: (m: string) => void;
  platform: string;
  link: string;
  onLink: (l: string) => void;
  linkError: string | null;
  quantity: string;
  onQuantity: (q: string) => void;
  durationMinutes: string;
  onDuration: (d: string) => void;
  curve: string;
  onCurve: (c: string) => void;
  schedule: ScheduleChunk[];
  selected: Service | null;
  estCost: number;
  balance: number;
  error: string;
  submitting: boolean;
  onSubmit: () => void;
}

export function OrderForm(props: Props) {
  const hint = PLATFORMS.find((p) => p.id === props.platform)?.hint;
  const { fmt } = useCurrency();
  return (
    <div className="space-y-4">
      <Tabs tabs={[{ id: "instant", label: "Instant" }, { id: "drip", label: "Drip-feed" }]} value={props.mode} onChange={props.onMode} />

      <Card className="space-y-4 p-4">
        <Input label="Link" placeholder={hint} value={props.link} onChange={(e) => props.onLink(e.target.value)} error={props.linkError || undefined} />
        <Input label="Quantity" type="number" min={props.selected ? props.selected.min : 1} value={props.quantity} onChange={(e) => props.onQuantity(e.target.value)}
          hint={props.selected ? `Allowed: ${props.selected.min} – ${props.selected.max}` : undefined} />

        {props.mode === "drip" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Duration (minutes)" type="number" min={15} max={72 * 60} value={props.durationMinutes} onChange={(e) => props.onDuration(e.target.value)} />
              <Select label="Curve" options={CURVES.map((c) => ({ value: c.id, label: c.label }))} value={props.curve} onChange={(e) => props.onCurve(e.target.value)} />
            </div>
            <SchedulePreview schedule={props.schedule} curve={props.curve} />
          </>
        )}

        {props.selected && (
          <div className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Estimated cost</span>
              <span className="text-lg font-bold text-[var(--accent)]">{fmt(props.estCost)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Balance</span>
              <span>{fmt(props.balance)}</span>
            </div>
          </div>
        )}

        {props.error && <p className="text-sm text-[var(--danger)]">{props.error}</p>}

        <Button full loading={props.submitting} onClick={props.onSubmit}>
          {props.mode === "drip" ? "Place drip order" : "Place order"}
        </Button>
      </Card>
    </div>
  );
}
