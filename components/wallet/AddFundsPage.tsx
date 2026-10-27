"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PaymentHistory } from "./PaymentHistory";

interface Method { name: string; account: string; instructions?: string }

export function AddFundsPage() {
  const supabase = createClient();
  const [methods, setMethods] = useState<Method[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: settings }, { data: pays }] = await Promise.all([
        supabase.from("settings").select("value").eq("key", "payment_methods").single(),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      if (!active) return;
      let list: Method[] = [];
      try {
        list = settings?.value ? (JSON.parse(settings.value) as Method[]) : [];
      } catch {}
      if (list.length === 0) list = [{ name: "Bank Transfer", account: "Contact support for details", instructions: "Ask support for the latest account details." }];
      setMethods(list);
      setMethod(list[0]?.name || "");
      setHistory(pays || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const selectedMethod = methods.find((m) => m.name === method);

  async function submit() {
    setError("");
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    if (!file) return setError("Upload a payment screenshot.");
    if (!method) return setError("Select a payment method.");
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setError("Not authenticated.");
      const path = `${user.id}/${Date.now()}-proof.png`;
      const { error: upErr } = await supabase.storage.from("payments").upload(path, file, { upsert: false });
      if (upErr) return setError("Could not upload proof. Please retry.");
      const { error: insErr } = await supabase.from("payments").insert({ user_id: user.id, amount: amt, method, proof_url: path });
      if (insErr) return setError(insErr.message);
      setAmount("");
      setFile(null);
      const { data } = await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(20);
      setHistory(data || []);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Add Funds</h1>
        <p className="text-sm text-[var(--text-muted)]">Transfer money and upload proof. An admin will approve it.</p>
      </div>

      {loading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Payment instructions</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{selectedMethod?.instructions || selectedMethod?.account}</p>
            </div>
            <Select
              label="Method"
              options={methods.map((m) => ({ value: m.name, label: m.name }))}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
            <Input label="Account details" value={selectedMethod?.account || ""} readOnly />
            <Input label="Amount (USD)" type="number" min={1} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Screenshot of payment</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
              />
              {file && <p className="mt-1 text-xs text-[var(--text-muted)]">{file.name}</p>}
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <Button full loading={busy} onClick={submit}>Submit payment</Button>
          </Card>
          <PaymentHistory history={history} />
        </div>
      )}
    </div>
  );
}
