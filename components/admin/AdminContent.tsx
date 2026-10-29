"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { audit } from "@/lib/audit";

interface Review { id: string; rating: number; text: string; author_display: string | null; status: string; }
interface Faq { id: string; question: string; answer: string; active: boolean; sort: number; }

const HOME_TOGGLES = ["showHero", "showStats", "showHow", "showServices", "showFeatures", "showDemo", "showReviews", "showTrust", "showFaq", "showTicker"] as const;

export function AdminContent() {
  const supabase = createClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"home" | "reviews" | "faq" | "footer" | "thresholds">("home");
  const [home, setHome] = useState<Record<string, string | boolean>>({});
  const [homeBusy, setHomeBusy] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqBusy, setFaqBusy] = useState(false);
  const [footerLinksText, setFooterLinksText] = useState("");
  const [thresholds, setThresholds] = useState({ orders: "100", services: "3", platforms: "0", supports: "0" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*");
      const map: Record<string, string> = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      try { setHome(JSON.parse(map.home_content || "{}")); } catch { setHome({}); }
      try {
        const th = JSON.parse(map.counter_thresholds || "{}");
        setThresholds({ orders: String(th.orders ?? 100), services: String(th.services ?? 3), platforms: String(th.platforms ?? 0), supports: String(th.supports ?? 0) });
      } catch {}
      try {
        const fl = JSON.parse(map.footer_links || "[]");
        if (Array.isArray(fl)) setFooterLinksText(fl.map((l) => `${l.label}|${l.href}`).join("\n"));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    supabase.from("reviews").select("*").order("created_at", { ascending: false }).then(({ data }) => setReviews(data || []));
    supabase.from("faqs").select("*").order("sort", { ascending: true }).then(({ data }) => setFaqs(data || []));
  }, []);

  async function saveHome() {
    setHomeBusy(true);
    const payload = { ...home };
    const { error } = await supabase.from("settings").upsert({ key: "home_content", value: JSON.stringify(payload) });
    if (!error) await audit("content.save_home", { payload });
    setHomeBusy(false);
    if (error) return toast({ title: error.message, variant: "danger" });
    toast({ title: "Home content saved", variant: "success" });
  }

  async function moderateReview(id: string, status: string) {
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    if (error) return toast({ title: error.message, variant: "danger" });
    await audit("content.review_moderate", { id, status });
    setReviews((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    toast({ title: "Review updated", variant: "success" });
  }

  function toggleFaqActive(id: string) {
    const f = faqs.find((x) => x.id === id);
    if (!f) return;
    setFaqs((fs) => fs.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
    void supabase.from("faqs").update({ active: !f.active }).eq("id", id).then(({ error }) => {
      if (!error) void audit("content.faq_toggle", { id, active: !f.active });
    });
  }

  async function saveFaqs() {
    setFaqBusy(true);
    const { error } = await supabase.from("faqs").upsert(faqs.map(({ id, question, answer, active, sort }) => ({ id, question, answer, active, sort })));
    setFaqBusy(false);
    if (error) return toast({ title: error.message, variant: "danger" });
    await audit("content.faq_save", { count: faqs.length });
    toast({ title: "FAQ saved", variant: "success" });
  }

  async function addFaq() {
    const { data, error } = await supabase.from("faqs").insert({ question: "New question", answer: "New answer", active: true, sort: faqs.length }).select().single();
    if (error) return toast({ title: error.message, variant: "danger" });
    setFaqs((fs) => [...fs, data]);
  }

  async function saveFooter() {
    const parsed = footerLinksText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [label, ...rest] = l.split("|");
      return { label: label.trim(), href: rest.join("|").trim() || "/" };
    });
    const { error } = await supabase.from("settings").upsert({ key: "footer_links", value: JSON.stringify(parsed) });
    if (error) return toast({ title: error.message, variant: "danger" });
    await audit("content.footer_save", { count: parsed.length });
    toast({ title: "Footer links saved", variant: "success" });
  }

  async function saveThresholds() {
    const val = { orders: Number(thresholds.orders) || 0, services: Number(thresholds.services) || 0, platforms: Number(thresholds.platforms) || 0, supports: Number(thresholds.supports) || 0 };
    const { error } = await supabase.from("settings").upsert({ key: "counter_thresholds", value: JSON.stringify(val) });
    if (error) return toast({ title: error.message, variant: "danger" });
    await audit("content.thresholds_save", val);
    toast({ title: "Thresholds saved", variant: "success" });
  }

  const HOME_FIELDS = [
    { key: "heroTitle", label: "Hero headline" },
    { key: "heroSubtitle", label: "Hero subtitle" },
    { key: "ctaStart", label: "Primary button text" },
    { key: "ctaPrices", label: "Secondary button text" },
    { key: "howTitle", label: "How it works title" },
    { key: "featuresTitle", label: "Features title" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Content</h1>
      <div className="flex flex-wrap gap-2">
        {(["home", "reviews", "faq", "footer", "thresholds"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)]"}`}>
            {t === "home" ? "Home" : t === "reviews" ? "Reviews" : t === "faq" ? "FAQ" : t === "footer" ? "Footer links" : "Counters"}
          </button>
        ))}
      </div>

      {tab === "home" && (
        <Card className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">Edit the public home page headline, text and which sections are visible.</p>
          {HOME_FIELDS.map((f) => (
            <Input key={f.key} label={f.label} value={String(home[f.key] ?? "")} onChange={(e) => setHome((h) => ({ ...h, [f.key]: e.target.value }))} />
          ))}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {HOME_TOGGLES.map((k) => (
              <label key={k} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm">
                {k.replace("show", "")}
                <input type="checkbox" checked={Boolean(home[k])} onChange={(e) => setHome((h) => ({ ...h, [k]: e.target.checked }))} className="h-5 w-5 accent-[var(--accent)]" />
              </label>
            ))}
          </div>
          <Button loading={homeBusy} onClick={saveHome}>Save home content</Button>
        </Card>
      )}

      {tab === "reviews" && (
        <Card className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">Moderate reviews. Only <strong className="text-[var(--text)]">approved</strong> ones appear on the public site.</p>
          {reviews.length === 0 && <p className="text-sm text-[var(--text-muted)]">No reviews yet.</p>}
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">{"★".repeat(r.rating)}</span>
                    <span className="text-xs text-[var(--text-muted)]">{r.author_display || "User"}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : r.status === "hidden" ? "bg-white/[0.06] text-[var(--text-muted)]" : "bg-[var(--warning)]/15 text-[var(--warning)]"}`}>{r.status}</span>
                </div>
                <p className="mt-2 text-sm">{r.text || "(no text)"}</p>
                <div className="mt-3 flex gap-2">
                  {r.status !== "approved" && <Button size="sm" onClick={() => moderateReview(r.id, "approved")}>Approve</Button>}
                  {r.status !== "hidden" && <Button size="sm" variant="outline" onClick={() => moderateReview(r.id, "hidden")}>Hide</Button>}
                  <Button size="sm" variant="danger" onClick={async () => { const { error } = await supabase.from("reviews").delete().eq("id", r.id); if (!error) { setReviews((rs) => rs.filter((x) => x.id !== r.id)); void audit("content.review_delete", { id: r.id }); } }}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "faq" && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Manage the public FAQ (used on home + /faq).</p>
            <Button variant="outline" size="sm" onClick={addFaq}>Add question</Button>
          </div>
          {faqs.map((f, i) => (
            <div key={f.id} className="space-y-2 rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2">
                <Input value={f.question} onChange={(e) => setFaqs((fs) => fs.map((x) => (x.id === f.id ? { ...x, question: e.target.value } : x)))} placeholder="Question" />
                <button type="button" onClick={() => toggleFaqActive(f.id)} className={`h-11 shrink-0 rounded-full px-3 text-xs font-medium ${f.active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-[var(--text-muted)]"}`}>{f.active ? "Active" : "Hidden"}</button>
              </div>
              <textarea value={f.answer} onChange={(e) => setFaqs((fs) => fs.map((x) => (x.id === f.id ? { ...x, answer: e.target.value } : x)))} rows={2} className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 text-sm focus:border-[var(--accent)] focus:outline-none" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <button type="button" onClick={() => setFaqs((fs) => { const arr = [...fs]; if (i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; return arr; })} className="rounded px-2 py-1 hover:bg-white/[0.05]">↑</button>
                  <button type="button" onClick={() => setFaqs((fs) => { const arr = [...fs]; if (i < arr.length - 1) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; return arr; })} className="rounded px-2 py-1 hover:bg-white/[0.05]">↓</button>
                  <span>Order</span>
                </div>
                <button type="button" onClick={async () => { const { error } = await supabase.from("faqs").delete().eq("id", f.id); if (!error) { setFaqs((fs) => fs.filter((x) => x.id !== f.id)); void audit("content.faq_delete", { id: f.id }); } }} className="text-xs text-[var(--danger)]">Delete</button>
              </div>
            </div>
          ))}
          <Button loading={faqBusy} onClick={saveFaqs}>Save FAQ</Button>
        </Card>
      )}

      {tab === "footer" && (
        <Card className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">Footer links (one per line: Label|/path)</p>
            <textarea value={footerLinksText} onChange={(e) => setFooterLinksText(e.target.value)} rows={8} className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 font-mono text-xs focus:border-[var(--accent)] focus:outline-none" />
          </div>
          <Button onClick={saveFooter}>Save footer links</Button>
        </Card>
      )}

      {tab === "thresholds" && (
        <Card className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Live counters on the home page are hidden when below these minimums, so we never show a tiny or zero number.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["orders", "services", "platforms", "supports"] as const).map((k) => (
              <Input key={k} label={k === "orders" ? "Orders min" : k === "services" ? "Services min" : k === "platforms" ? "Platforms min" : "Support min"} type="number" value={thresholds[k]} onChange={(e) => setThresholds((t) => ({ ...t, [k]: e.target.value }))} />
            ))}
          </div>
          <Button onClick={saveThresholds}>Save thresholds</Button>
        </Card>
      )}
    </div>
  );
}
