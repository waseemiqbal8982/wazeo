"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import {
  ENGAGEMENT_TYPES,
  WINDOW_PRESETS,
  CURVE_PRESETS,
  type EngagementType,
} from "@/lib/organic";
import { CurveGallery } from "./CurveGallery";
import { CurveChart, type CurveDatum } from "./CurveChart";

interface PreviewResponse {
  presetId: string;
  presetLabel: string;
  windowMinutes: number;
  microStepsCount: number;
  totalEvents: number;
  curvePoints: { x: number; cumulative: number }[];
  violations: string[];
}

const ENGAGEMENT_META: Record<EngagementType, { label: string; min: number; default: number }> = {
  views: { label: "Views", min: 100, default: 500 },
  likes: { label: "Likes", min: 10, default: 50 },
  comments: { label: "Comments", min: 10, default: 20 },
  saves: { label: "Saves", min: 10, default: 20 },
  shares: { label: "Shares", min: 10, default: 25 },
};

const PRESET_BY_ID = new Map(CURVE_PRESETS.map((p) => [p.id, p]));

export function OrganicNewOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [link, setLink] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [eng, setEng] = useState<Record<EngagementType, number>>({
    views: 500,
    likes: 50,
    comments: 20,
    saves: 0,
    shares: 0,
  });
  const [windowId, setWindowId] = useState("24h");
  const [variance, setVariance] = useState(10);
  const [peakHours, setPeakHours] = useState(true);
  const [presetId, setPresetId] = useState("steady");

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [placing, setPlacing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const selectedEngagement = useMemo(
    () => ENGAGEMENT_TYPES.filter((t) => (eng[t] ?? 0) > 0),
    [eng]
  );

  const totalQty = useMemo(
    () => selectedEngagement.reduce((s, t) => s + (eng[t] ?? 0), 0),
    [selectedEngagement, eng]
  );

  const runPreview = useCallback(
    (preset: string) => {
      const id = ++requestIdRef.current;
      setLoading(true);
      fetch("/api/graph/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagement: eng,
          presetId: preset,
          windowId,
          variancePercent: variance,
          startHour: new Date().getHours(),
        }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("preview failed"))))
        .then((data: PreviewResponse) => {
          if (requestIdRef.current !== id) return;
          setPreview(data);
          setLoading(false);
        })
        .catch(() => {
          if (requestIdRef.current !== id) return;
          setLoading(false);
        });
    },
    [eng, windowId, variance]
  );
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPreview(presetId), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [presetId, runPreview]);

  const curveData = useMemo<CurveDatum[]>(() => {
    if (!preview) return [];
    return preview.curvePoints.map((p) => ({ x: p.x, y: p.cumulative * totalQty }));
  }, [preview, totalQty]);

  function toggleEngagement(t: EngagementType) {
    setEng((prev) => {
      const n = { ...prev };
      if ((prev[t] ?? 0) > 0) n[t] = 0;
      else n[t] = ENGAGEMENT_META[t].default;
      return n;
    });
  }

  async function handlePlace() {
    if (!link) {
      toast({ title: "Link required", description: "Paste a post link to continue.", variant: "danger" });
      return;
    }
    if (selectedEngagement.length === 0) {
      toast({ title: "No engagement selected", description: "Pick at least one type.", variant: "danger" });
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/organic/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link,
          platform,
          presetId,
          windowId,
          variance,
          peakHours,
          engagement: eng,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Could not save the schedule", description: data.error || "Please try again.", variant: "danger" });
        return;
      }
      setPlaced(true);
      toast({ title: "Schedule saved", description: `${data.scheduledRuns ?? 0} runs scheduled. Redirecting to orders…`, variant: "success" });
      router.push("/dashboard/orders");
    } catch {
      toast({ title: "Network error", description: "Could not save your schedule.", variant: "danger" });
    } finally {
      setPlacing(false);
    }
  }

  if (placed) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Delivery schedule</h1>
          <p className="text-sm text-[var(--text-muted)]">Spread your order across a delivery window.</p>
        </div>
        <button
          type="button"
          onClick={() => runPreview(presetId)}
          className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm text-[var(--accent)] hover:border-[var(--accent)]"
        >
          Refresh preview
        </button>
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="mb-2 text-sm font-semibold text-[var(--text)]">Target link</p>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Paste your post link"
          className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {["instagram", "tiktok", "youtube"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition",
                platform === p
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-strong)] text-[var(--text-muted)]"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="mb-2 text-sm font-semibold text-[var(--text)]">Engagement</p>
        <div className="flex flex-wrap gap-2">
          {ENGAGEMENT_TYPES.map((t) => {
            const active = (eng[t] ?? 0) > 0;
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleEngagement(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                )}
              >
                {ENGAGEMENT_META[t].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Delivery window</p>
            <div className="flex flex-wrap gap-1.5">
              {WINDOW_PRESETS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWindowId(w.id)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs",
                    windowId === w.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border-strong)] text-[var(--text-muted)]"
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Natural variation ± {variance}%</p>
            <input
              type="range"
              min={0}
              max={60}
              value={variance}
              onChange={(e) => setVariance(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>
          <div className="flex flex-col justify-center gap-2">
            <label className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input type="checkbox" checked={peakHours} onChange={(e) => setPeakHours(e.target.checked)} className="accent-[var(--accent)]" />
              Peak hours (19–21 local)
            </label>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--text)]">Delivery curve</p>
          <span className="text-[10px] text-[var(--text-muted)]">Choose how delivery spreads over time</span>
        </div>
        <CurveGallery selected={presetId} onSelect={setPresetId} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <p className="mb-1 text-sm font-semibold text-[var(--text)]">Live preview</p>
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            {PRESET_BY_ID.get(presetId)?.label ?? "Steady"} · {totalQty} total events
          </p>
          <div className="h-44">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-36 w-full rounded-xl bg-white/[0.04]" />
              </div>
            ) : preview ? (
              <CurveChart planned={curveData} height={180} area />
            ) : (
              <div className="flex h-36 items-center justify-center rounded-xl bg-white/[0.02] text-xs text-[var(--text-muted)]">
                Adjust settings to preview your curve.
              </div>
            )}
          </div>
          {preview && preview.violations.length > 0 && (
            <div className="mt-2 space-y-1">
              {preview.violations.slice(0, 2).map((v, i) => (
                <p key={i} className="text-[10px] text-amber-400">• {v}</p>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="mt-4 rounded-xl border border-[var(--border)] p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Total engagement</span>
              <span className="font-semibold text-[var(--text)]">{totalQty}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Delivery steps</span>
              <span className="font-semibold text-[var(--text)]">{preview?.microStepsCount ?? 0}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Window</span>
              <span className="font-semibold text-[var(--text)]">
                {WINDOW_PRESETS.find((w) => w.id === windowId)?.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePlace}
            disabled={loading || placing}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--glow)] hover:brightness-110 disabled:opacity-50"
          >
            {placing ? "Saving schedule…" : "Create scheduled order"}
          </button>
          <p className="mt-2 text-center text-[10px] text-[var(--text-muted)]">
            Creates a scheduled order spread across the chosen window.
          </p>
        </div>
      </div>
    </div>
  );
}

