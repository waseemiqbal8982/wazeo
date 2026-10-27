"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { audit } from "@/lib/audit";
import en from "@/locales/en.json";
import ur from "@/locales/ur.json";
import hi from "@/locales/hi.json";
import fr from "@/locales/fr.json";
import zh from "@/locales/zh.json";

const LANGS = ["en", "ur", "hi", "fr", "zh"];
const dicts: Record<string, Record<string, string>> = { en, ur, hi, fr, zh };

export function AdminTranslations() {
  const sb = createClient();
  const { toast } = useToast();
  const [lang, setLang] = useState("ur");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const { data } = await sb.from("translation_overrides").select("*").eq("lang", lang);
    const map: Record<string, string> = {};
    (data || []).forEach((r) => { map[r.key] = r.value; });
    setOverrides(map);
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  const base = dicts[lang];
  const keys = Object.keys(dicts.en).sort();
  const filtered = keys.filter((k) => !q || k.toLowerCase().includes(q.toLowerCase()) || dicts.en[k].toLowerCase().includes(q.toLowerCase()));
  const missingCount = keys.filter((k) => !(k in base)).length;

  async function save(key: string) {
    const val = overrides[key];
    await sb.from("translation_overrides").upsert({ lang, key, value: val }, { onConflict: "lang,key" });
    await audit("translation_update", { lang, key });
    toast({ title: "Saved", variant: "success" });
  }

  async function reset(key: string) {
    await sb.from("translation_overrides").delete().eq("lang", lang).eq("key", key);
    const next = { ...overrides };
    delete next[key];
    setOverrides(next);
    toast({ title: "Reset to default", variant: "success" });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Translations</h1>
          <p className="text-sm text-[var(--text-muted)]">Override kisi bhi key ka text, language ke hisaab se.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select options={LANGS.map((l) => ({ value: l, label: l }))} value={lang} onChange={(e) => setLang(e.target.value)} className="w-28" />
          <Badge tone={missingCount === 0 ? "success" : "danger"}>{missingCount} missing</Badge>
        </div>
      </div>

      <Input placeholder="Search key or English text…" value={q} onChange={(e) => setQ(e.target.value)} />

      <Card className="p-0">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#12121f]">
              <tr className="text-left text-xs text-[var(--text-muted)]">
                <th className="px-4 py-2 font-medium">Key</th>
                <th className="px-4 py-2 font-medium">English</th>
                <th className="px-4 py-2 font-medium">{lang}</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((key) => (
                <tr key={key}>
                  <td className="px-4 py-2 font-mono text-xs text-[var(--text-muted)]">{key}</td>
                  <td className="px-4 py-2 text-[var(--text-muted)]">{dicts.en[key]}</td>
                  <td className="px-4 py-2">
                    <Input
                      value={overrides[key] ?? base[key] ?? ""}
                      placeholder={base[key] ?? ""}
                      onChange={(e) => setOverrides((o) => ({ ...o, [key]: e.target.value }))}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => save(key)}>Save</Button>
                      {overrides[key] !== undefined && (
                        <Button size="sm" variant="outline" onClick={() => reset(key)}>Reset</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
