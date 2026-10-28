"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import {
  ENGAGEMENT_TYPES,
  WINDOW_PRESETS,
  ALL_CURVE_PRESETS,
  type EngagementType,
} from "@/lib/organic";
import { CurveGallery } from "./CurveGallery";
import { RiskMeter } from "./RiskMeter";
import { CurveChart, type CurveDatum } from "./CurveChart";

interface PreviewResponse {
  risk: number;
  band: string;
  organicScore: number;
  reRolls: number;
  totalEvents: number;
  microStepsCount: number;
  curvePoints: { x: number; cumulative: number }[];
  violations: string[];
  windowMinutes: number;
}

const ENGAGEMENT_META: Record<EngagementType, { label: string; min: number; default: number }> = {
  views: { label: "Views", min: 100, default: 500 },
  likes: { label: "Likes", min: 10, default: 50 },
  comments: { label: "Comments", min: 10, default: 20 },
  saves: { label: "Saves", min: 10, default: 20 },
  shares: { label: "Shares", min: 10, default: 25 },
};

const PRESET_BY_ID = new Map(ALL_CURVE_PRESETS.map((p) => [p.id, p]));


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
  const [organicMode, setOrganicMode] = useState(true);
  const [presetId, setPresetId] = useState("auto_safe");

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoFix, setAutoFix] = useState(false);
  const [placed, setPlaced] = useState(false);
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
          peakHours,
          organicMode,
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
    [eng, windowId, variance, peakHours, organicMode]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPreview(presetId), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [presetId, runPreview]);

  // Auto-fix: if risk over 22, re-roll preset to a safe one.
  useEffect(() => {
    if (!autoFix || !preview) return;
    if (preview.risk > 22) {
      const safeId = ALL_CURVE_PRESETS.find((p) => p.id !== presetId)?.id ?? "auto_safe";
      setPresetId(safeId);
      setAutoFix(false);
      toast({ title: "Auto-fix", description: "Risk was high — switched to a safer curve.", variant: "success" });
    } else {
      setAutoFix(false);
    }
  }, [autoFix, preview, presetId, toast]);

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

  function handlePlace() {
    if (!link) {
      toast({ title: "Link required", description: "Paste a post link to continue.", variant: "danger" });
      return;
    }
    if (selectedEngagement.length === 0) {
      toast({ title: "No engagement selected", description: "Pick at least one type.", variant: "danger" });
      return;
    }
    if (preview && preview.risk > 30) {
      toast({ title: "Risk too high", description: "Use Auto-fix to lower risk before placing.", variant: "danger" });
      return;
    }
    try {
      sessionStorage.setItem(
        "wazeo-organic-plan",
        JSON.stringify({
          link,
          platform,
          presetId,
          windowId,
          variance,
          peakHours,
          organicMode,
          engagement: eng,
          totalQty,
        })
      );
    } catch {}
    setPlaced(true);
    toast({ title: "Organic plan ready", description: "Redirecting to place your order…", variant: "success" });
    router.push("/dashboard/new-order");
  }

  if (placed) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Organic Engagement</h1>
          <p className="text-sm text-[var(--text-muted)]">Build a natural-looking delivery curve before you order.</p>
        </div>
        <button
          type="button"
          onClick={() => runPreview(presetId)}
          className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] px-3 py-2 text-xs text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <span className={cn("h-2 w-2 rounded-full", loading ? "animate-pulse bg-[var(--accent)]" : "bg-emerald-400")} />
          Live preview
        </button>
      </div>

      {/* Link input */}
      <div className="glass rounded-2xl p-4">
        <label className="text-xs font-medium text-[var(--text-muted)]">Post link</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="h-10 rounded-xl border border-[var(--border-strong)] bg-transparent px-3 text-sm text-[var(--text)]"
          >
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
          </select>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://instagram.com/p/…"
            className="h-10 flex-1 rounded-xl border border-[var(--border-strong)] bg-transparent px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Engagement toggles */}
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

      {/* Window + variance */}
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
            <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Variance ± {variance}%</p>
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
            <label className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input type="checkbox" checked={organicMode} onChange={(e) => setOrganicMode(e.target.checked)} className="accent-[var(--accent)]" />
              Organic mode
            </label>
          </div>
        </div>
      </div>

      {/* Curve gallery */}
      <div className="glass rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--text)]">Curve gallery</p>
          <span className="text-[10px] text-[var(--text-muted)]">Select a delivery shape</span>
        </div>
        <CurveGallery selected={presetId} onSelect={setPresetId} />
      </div>

      {/* Live preview + risk + price */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <p className="mb-1 text-sm font-semibold text-[var(--text)]">Live preview</p>
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            {PRESET_BY_ID.get(presetId)?.label ?? "Auto Safe"} · {totalQty} total events
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
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text)]">Risk meter</p>
            <button
              type="button"
              onClick={() => setAutoFix(true)}
              className="rounded-lg border border-[var(--border-strong)] px-2.5 py-1 text-xs text-[var(--accent)] hover:border-[var(--accent)]"
            >
              Auto-fix
            </button>
          </div>
          <RiskMeter score={preview?.risk ?? 0} organicScore={preview?.organicScore} />
          <div className="mt-4 rounded-xl border border-[var(--border)] p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Total engagement</span>
              <span className="font-semibold text-[var(--text)]">{totalQty}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Delivered model</span>
              <span className="font-semibold text-[var(--text)]">{preview?.totalEvents ?? 0}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Micro-steps</span>
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
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--glow)] hover:brightness-110 disabled:opacity-50"
          >
            Continue to Place Order
          </button>
          <p className="mt-2 text-center text-[10px] text-[var(--text-muted)]">
            Proceeds to the standard New Order flow with your organic plan attached.
          </p>
        </div>
      </div>
    </div>
  );
}

