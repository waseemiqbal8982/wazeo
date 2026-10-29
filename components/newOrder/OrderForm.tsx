"use client";

import { CURVES, PLATFORMS } from "@/lib/constants";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrency } from "@/lib/currency-store";
import { SchedulePreview } from "./SchedulePreview";
import { CurveCanvas } from "./CurveCanvas";
import type { ScheduleChunk } from "@/lib/schedule";

interface Service {
  provider_rate: number;
  markup_percent: number;
  min: number;
  max: number;
}

interface Props {
  platform: string;
  link: string;
  onLink: (l: string) => void;
  linkError: string | null;
  quantity: string;
  onQuantity: (q: string) => void;
  durationMinutes: string;
  onDuration: (d: string) => void;
  startDelayMinutes: string;
  onStartDelay: (d: string) => void;
  variation: string;
  onVariation: (v: string) => void;
  minRun: string;
  onMinRun: (v: string) => void;
  maxRun: string;
  onMaxRun: (v: string) => void;
  curve: string;
  onCurve: (c: string) => void;
  curvePoints: number[];
  onCurvePoints: (p: number[]) => void;
  schedule: ScheduleChunk[];
  summary: string;
  selected: Service | null;
  estCost: number;
  balance: number;
  error: string;
  submitting: boolean;
  onSubmit: () => void;
}

function formatSummary(raw: string): string {
  // raw is like "4–9" and "6"
  return raw;
}

export function OrderForm(props: Props) {
  const hint = PLATFORMS.find((p) => p.id === props.platform)?.hint;
  const { fmt } = useCurrency();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 font-medium text-[var(--accent)]">
          Gradual delivery
        </span>
        <span>Delivered over your chosen window — no instant orders.</span>
      </div>

      <Card className="space-y-4 p-4">
        <Input label="Link" placeholder={hint} value={props.link} onChange={(e) => props.onLink(e.target.value)} error={props.linkError || undefined} />
        <Input label="Quantity" type="number" min={props.selected ? props.selected.min : 1} value={props.quantity} onChange={(e) => props.onQuantity(e.target.value)}
          hint={props.selected ? `Allowed: ${props.selected.min} – ${props.selected.max}` : undefined} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Duration (minutes)" type="number" min={15} max={72 * 60} value={props.durationMinutes} onChange={(e) => props.onDuration(e.target.value)}
            hint="15 min – 72 hours" />
          <Input label="Start delay (min)" type="number" min={0} value={props.startDelayMinutes} onChange={(e) => props.onStartDelay(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Natural variation %" type="number" min={0} max={30} value={props.variation} onChange={(e) => props.onVariation(e.target.value)} />
          <Select label="Curve" options={CURVES.map((c) => ({ value: c.id, label: c.label }))} value={props.curve} onChange={(e) => props.onCurve(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Min per run" type="number" min={1} value={props.minRun} onChange={(e) => props.onMinRun(e.target.value)} />
          <Input label="Max per run (optional)" type="number" min={1} value={props.maxRun} onChange={(e) => props.onMaxRun(e.target.value)} />
        </div>

        {props.curve === "custom" && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Draw your delivery curve</p>
            <CurveCanvas value={props.curvePoints} onChange={props.onCurvePoints} />
          </div>
        )}

        <SchedulePreview schedule={props.schedule} curve={props.curve} />

        {props.summary && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--accent-soft)]/30 p-3 text-sm">
            <span className="text-[var(--text-muted)]">Delivery: </span>
            <span className="font-medium text-[var(--text)]">{formatSummary(props.summary)}</span>
          </div>
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
          Place delivery order
        </Button>
      </Card>
    </div>
  );
}
