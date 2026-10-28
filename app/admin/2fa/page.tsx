"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";

export default function Admin2faPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/2fa").then((r) => r.json()).then((d) => { if (typeof d.enabled === "boolean") setEnabled(d.enabled); }).catch(() => {});
  }, []);

  async function verify() {
    setError("");
    const value = recovery ? recoveryCode : code;
    if (!value) return setError(recovery ? "Enter your recovery code." : "Enter the 6-digit code.");
    setBusy(true);
    const res = await fetch("/api/admin/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recovery ? { recovery: value } : { code: value }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "Verification failed.");
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
      <Card className="w-full max-w-md p-6 text-center sm:p-8">
        <div className="mb-5 flex justify-center"><Logo size={40} /></div>
        <h1 className="text-xl font-bold">Two-factor authentication</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {enabled === false
            ? "2FA is not enabled for your account. Enable it from the admin System page."
            : recovery
              ? "Enter one of your recovery codes to sign in."
              : `Enter the 6-digit code sent to your email to continue.`}
        </p>

        {enabled !== false && (
          <div className="mt-5 space-y-3">
            {!recovery ? (
              <Input
                label="6-digit code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
              />
            ) : (
              <Input label="Recovery code" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} placeholder="0000000000" />
            )}
            {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <Button full loading={busy} onClick={verify}>Verify</Button>
            <button type="button" onClick={() => { setRecovery(!recovery); setError(""); setCode(""); setRecoveryCode(""); }} className="text-xs text-[var(--text-muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline">
              {recovery ? "← Use a code instead" : "Use a recovery code"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
