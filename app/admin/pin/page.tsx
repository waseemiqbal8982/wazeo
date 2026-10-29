"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";

export default function AdminPinPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [pin, setPin] = useState("");
  const [recovery, setRecovery] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    const payload = useRecovery ? { recovery } : { pin };
    if (useRecovery && !recovery) return setError("Recovery code enter karo.");
    if (!useRecovery && !/^\d{6,8}$/.test(pin)) return setError("PIN 6 se 8 digits ka hona chahiye.");
    setBusy(true);
    const res = await fetch("/api/admin/pin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(d.error || "Verification failed.");
      setPin("");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
      <Card className="w-full max-w-md p-6 text-center sm:p-8">
        <div className="mb-5 flex justify-center"><Logo size={40} /></div>
        <h1 className="text-xl font-bold">Admin PIN</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {useRecovery ? "Apna recovery code enter karo." : "Continue karne ke liye apna admin PIN enter karo."}
        </p>

        <div className="mt-5 space-y-3">
          {!useRecovery ? (
            <Input
              label="Admin PIN"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="••••••"
            />
          ) : (
            <Input label="Recovery code" value={recovery} onChange={(e) => setRecovery(e.target.value)} placeholder="XXXXXXXXXX" />
          )}
          {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <Button full loading={busy} onClick={submit}>Verify PIN</Button>
          <button type="button" onClick={() => { setUseRecovery(!useRecovery); setError(""); setPin(""); setRecovery(""); }} className="text-xs text-[var(--text-muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline">
            {useRecovery ? "← Use PIN instead" : "Use a recovery code"}
          </button>
        </div>
      </Card>
    </div>
  );
}
