"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/Logo";

const OTP_LENGTH = Math.max(4, Math.min(10, Number(process.env.NEXT_PUBLIC_OTP_LENGTH || 6)));

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [done, setDone] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  useEffect(() => {
    setLinkExpired(new URLSearchParams(window.location.search).get("error") === "link_used_or_expired");
    (async () => {
      const sb = createClient();
      const { data } = await sb.auth.getUser();
      if (!data?.user) {
        router.replace("/sign-in");
        return;
      }
      setEmail(data.user.email || "");
      setResendIn(60);
    })();
  }, [router]);

  useEffect(() => {
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const verify = useCallback(async () => {
    if (otp.length < OTP_LENGTH || busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Invalid code.");
        setTick((c) => c + 1);
        setOtp("");
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 900);
    } catch {
      setErr("Network error. Please try again.");
      setTick((c) => c + 1);
      setOtp("");
    } finally {
      setBusy(false);
    }
  }, [otp, busy, email, router]);

  useEffect(() => {
    if (otp.length === OTP_LENGTH && !busy) void verify();
  }, [otp, busy, verify]);

  async function resend() {
    if (resendIn > 0 || busy) return;
    const res = await fetch("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setErr("");
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || "Try again later.");
      setTick((c) => c + 1);
      return;
    }
    setResendIn(60);
    setOtp("");
  }

  async function changeEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setErr("Enter a valid email.");
      setTick((c) => c + 1);
      return;
    }
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ email: newEmail });
    if (error) {
      setErr(error.message);
      setTick((c) => c + 1);
      return;
    }
    setEmail(newEmail);
    setEditingEmail(false);
    setNewEmail("");
    await fetch("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail }),
    });
    setResendIn(60);
    setOtp("");
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/sign-in");
  }

  return (
    <Card className="glass-glow p-6 text-center sm:p-8">
      {done ? (
        <>
          <div className="auth-check-pop mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/15">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4"><path className="auth-checkmark-stroke" d="m4 12.5 5 5L20 6.5" /></svg>
          </div>
          <h1 className="text-lg font-semibold">Email verified!</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Redirecting you…</p>
        </>
      ) : (
        <>
          <div className="mb-4 flex justify-center"><Logo size={36} /></div>
          <h1 className="text-lg font-semibold">{linkExpired ? "This link was already used or expired" : "Verify your email"}</h1>
          <p className="mb-5 mt-2 text-sm text-[var(--text-muted)]">
            {linkExpired
              ? "Enter the code below, or resend a new one."
              : `We sent a ${OTP_LENGTH}-digit code to ${email}. Enter it below to continue.`}
          </p>

          {editingEmail ? (
            <div className="space-y-3">
              <Input label="New email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="you@example.com" />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={changeEmail}>Update &amp; resend</Button>
                <Button variant="ghost" onClick={() => { setEditingEmail(false); setNewEmail(""); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div key={tick} className={err ? "animate-shake" : ""}>
                <OtpInput length={OTP_LENGTH} value={otp} onChange={(v) => { setOtp(v); if (err) setErr(""); }} disabled={busy} error={!!err} autoFocus />
                {err && <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>}
              </div>
              <div className="mt-5 flex flex-col items-center gap-2">
                <Button variant="ghost" size="sm" disabled={resendIn > 0 || busy} onClick={resend}>
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </Button>
                <p className="text-[11px] text-[var(--text-muted)]">Use the newest code — a new code cancels the old one.</p>
                <button type="button" onClick={() => setEditingEmail(true)} className="text-xs text-[var(--text-muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline">
                  Wrong email? Change it
                </button>
              </div>
            </>
          )}

          <div className="mt-5 border-t border-[var(--border)] pt-3">
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </>
      )}
    </Card>
  );
}

