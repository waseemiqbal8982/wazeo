"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

export function AdminSecurity() {
  const sb = createClient();
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(false);
  const [pendingSetup, setPendingSetup] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/pin").then((r) => r.json()).then((d) => {
      if (typeof d.enabled === "boolean") {
        setEnabled(d.enabled);
        setPendingSetup(!!d.pendingSetup);
      }
    }).catch(() => {});
  }, []);

  async function startSetup() {
    if (!/^\d{6,8}$/.test(pin)) return toast({ title: "PIN 6 se 8 digits ka ho.", variant: "danger" });
    if (pin !== confirmPin) return toast({ title: "PIN dono baar same likho.", variant: "danger" });
    setBusy(true);
    const res = await fetch("/api/admin/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast({ title: d.error || "Setup failed.", variant: "danger" });
    setPendingSetup(true);
    setRecoveryCodes(d.recoveryCodes || []);
    setPin("");
    setConfirmPin("");
  }

  async function confirmSetup() {
    if (!confirmCode.trim()) return toast({ title: "Ek recovery code wapas type karo.", variant: "danger" });
    setBusy(true);
    const res = await fetch("/api/admin/pin/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: confirmCode }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast({ title: d.error || "Confirmation failed.", variant: "danger" });
    setPendingSetup(false);
    setRecoveryCodes(null);
    setConfirmCode("");
    setEnabled(true);
    toast({ title: "Admin PIN enable ho gaya." });
  }

  return (
    <Card className="space-y-3">
      <p className="text-sm font-semibold">Admin PIN</p>
      <div className="flex items-center gap-2">
        <Badge tone={enabled ? "success" : "muted"}>{enabled ? "Enabled" : "Disabled"}</Badge>
        {pendingSetup && <Badge tone="accent">Setup pending (recovery code confirm karo)</Badge>}
      </div>

      {!enabled && !pendingSetup && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">
            Sign-in ke baad admin routes PIN maangte hain (ek baar per device session, phir 12 ghante ki inactivity ke baad).
            PIN sirf salted slow hash ke taur par store hota hai. Setup ke waqt 8 recovery codes milenge — inhe save karo.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="New PIN (6–8 digits)" type="password" inputMode="numeric" maxLength={8} value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="••••••" />
            <Input label="Confirm PIN" type="password" inputMode="numeric" maxLength={8} value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="••••••" />
          </div>
          <Button loading={busy} onClick={startSetup}>Set Admin PIN</Button>
        </div>
      )}

      {pendingSetup && recoveryCodes && (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-white/[0.02] p-4">
          <p className="text-sm font-semibold">Recovery codes — sirf ab dikh rahe hain, save karo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {recoveryCodes.map((c, i) => (
              <code key={i} className="rounded bg-black/20 px-2 py-1 text-center text-xs font-bold tracking-widest">{c}</code>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Setup complete karne ke liye upar se koi EK code neeche type karo (wo code consume ho jayega).
          </p>
          <Input label="Type one recovery code to confirm" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value.trim().toUpperCase())} placeholder="XXXXXXXXXX" />
          <Button loading={busy} onClick={confirmSetup}>Confirm & Enable</Button>
        </div>
      )}

      {enabled && !pendingSetup && (
        <p className="text-xs text-[var(--text-muted)]">
          PIN active hai. Reset ke liye owner admin:reset-pin script chala sakta hai.
        </p>
      )}
    </Card>
  );
}
