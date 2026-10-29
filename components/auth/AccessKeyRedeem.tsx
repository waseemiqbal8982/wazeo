"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { passwordStrength } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { formatAccessUntil } from "@/lib/access";

type Step = "key" | "validating" | "validated" | "activate" | "activating" | "welcome";

interface ValidInfo {
  plan_name: string;
  access_days: number | null;
  permanent: boolean;
  features: string[];
  bound_email: string | null;
}

/** Auto-format raw input into WZ-XXXX-XXXX-XXXX (uppercase). */
function dateFromNow(days: number | null): string | null {
  if (days == null) return null;
  return new Date(Date.now() + days * 86400000).toISOString();
}

export function formatAccessKey(raw: string): string {
  const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) parts.push(clean.slice(i, i + 4));
  return ["WZ", ...parts].join("-");
}

export function AccessKeyRedeem() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("key");
  const [key, setKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState<ValidInfo | null>(null);
  const [error, setError] = useState("");
  const [errTick, setErrTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const strength = passwordStrength(password);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const fail = (msg: string) => {
    setError(msg);
    setErrTick((c) => c + 1);
  };

  async function validateKey() {
    if (!/^WZ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
      return fail("Enter a valid WZ-XXXX-XXXX-XXXX access key.");
    }
    setError("");
    setStep("validating");
    let data: any;
    try {
      const res = await fetch("/api/auth/key-redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", key }),
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || "This key is invalid, expired or not for this email");
    } catch (e: any) {
      const el = new Date().getTime();
      const wait = Math.max(1200 - (Date.now() - el), 0);
      timerRef.current = setTimeout(() => {
        setStep("key");
        fail(e.message || "This key is invalid, expired or not for this email");
      }, wait);
      return;
    }
    // keep the validating spinner for at least 1.2s
    const start = Date.now();
    const wait = Math.max(1200 - (Date.now() - start), 0);
    timerRef.current = setTimeout(
      () => {
        setInfo({
          plan_name: data.plan_name || "Standard",
          access_days: data.access_days ?? null,
          permanent: data.permanent,
          features: data.features || [],
          bound_email: data.bound_email || null,
        });
        setEmail(data.bound_email || "");
        setStep("validated");
      },
      wait
    );
  }

  async function activate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("Enter a valid email.");
    }
    if (password.length < 8) return fail("Password must be at least 8 characters.");
    setStep("activating");
    setError("");
    try {
      const res = await fetch("/api/auth/key-redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem", key, email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "This key is invalid, expired or not for this email");
      if (data.needsVerify) {
        router.replace(`/verify-email?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      // verified -> create a session (auto sign-in) then go to dashboard
      const sb = createClient();
      const { error: se } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (se) {
        router.replace(`/verify-email?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      setStep("welcome");
      timerRef.current = setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 1800);
    } catch (e: any) {
      setStep("activate");
      fail(e.message || "This key is invalid, expired or not for this email");
    }
  }

  return (
    <div className="relative">
      {/* ---------- STEP 1: enter key ---------- */}
      {step === "key" && (
        <div key={errTick} className={error ? "animate-shake" : ""}>
          <div className="rounded-2xl border border-[var(--border)] bg-white/[0.03] p-4">
            <h3 className="text-base font-semibold">Enter your access key</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Paste the key you received (WZ-XXXX-XXXX-XXXX).
            </p>
            <Input
              value={key}
              onChange={(e) => setKey(formatAccessKey(e.target.value))}
              placeholder="WZ-XXXX-XXXX-XXXX"
              autoComplete="off"
              className="mt-3 font-mono tracking-widest"
              aria-label="Access key"
            />
            {error && (
              <p role="alert" className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <Button full className="mt-3" onClick={validateKey}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* ---------- STEP 2: validate popup ---------- */}
      <AnimatePresence>
        {(step === "validating" || step === "validated") && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[#0d0d18] p-6 text-center shadow-2xl"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {step === "validating" ? (
                <div className="flex flex-col items-center">
                  <div className="relative h-16 w-16">
                    <span className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/20" />
                    <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--accent)]" />
                    <span className="absolute inset-0 rounded-full border-2 border-transparent border-b-[var(--accent-2)]" style={{ animation: "spin 1.4s linear infinite reverse" }} />
                  </div>
                  <p className="mt-4 text-sm font-medium">Validating your key...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="auth-check-pop flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/15">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path className="auth-checkmark-stroke" d="m4 12.5 5 5L20 6.5" />
                    </svg>
                  </div>
                  <p className="mt-3 text-base font-bold">You have a valid key</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Plan: {info?.plan_name}</p>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    Access: {info?.permanent ? "Permanent access" : `${info?.access_days} day${info?.access_days === 1 ? "" : "s"}`}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Works until {info ? formatAccessUntil(info.permanent ? null : dateFromNow(info.access_days)) : "—"} once activated
                  </p>
                  {info && info.features.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {info.features.map((f) => (
                        <span key={f} className="rounded-full border border-[var(--border)] bg-white/[0.04] px-2.5 py-1 text-xs">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button full className="mt-5" onClick={() => setStep("activate")}>
                    Continue
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ---------- STEP 3: activate (email + password) ---------- */}
      {step === "activate" && (
        <div>
          {error && (
            <div key={errTick} className="animate-shake">
              <p role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            </div>
          )}
          <div className="rounded-2xl border border-[var(--border)] bg-white/[0.03] p-4">
            <h3 className="text-base font-semibold">Activate your access</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {info?.bound_email
                ? "Your key is linked to this email. It can't be changed."
                : "This email will be bound to your key on first use."}
            </p>
            <Input
              type="email"
              label="Email"
              value={email}
              disabled={!!info?.bound_email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-3"
            />
            <div className="mt-3">
              <PasswordInput
                label="Password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              {password && (
                <div className="mt-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-1 flex-1 rounded-full bg-white/[0.08]">
                        <div
                          className="h-full rounded-full transition-[width] duration-200"
                          style={{
                            width: i < strength.score ? "100%" : "0%",
                            background: strength.score >= 4 ? "var(--success)" : strength.score >= 2 ? "var(--accent)" : "var(--danger)",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Strength: {strength.label}</p>
                </div>
              )}
            </div>
            <Button full className="mt-4" onClick={activate}>
              Activate my access
            </Button>
            <button
              type="button"
              onClick={() => setStep("validated")}
              className="mt-3 w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              ← Back to key details
            </button>
          </div>
        </div>
      )}

      {/* ---------- STEP 4: animated welcome ---------- */}
      <AnimatePresence>
        {step === "activating" && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="flex flex-col items-center" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <div className="relative h-16 w-16">
                <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--accent)]" />
              </div>
              <p className="mt-4 text-sm font-medium">Setting up your account...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === "welcome" && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="flex flex-col items-center" initial={{ scale: 0.85 }} animate={{ scale: 1 }}>
              <div className="auth-check-pop flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success)]/15">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path className="auth-checkmark-stroke" d="m4 12.5 5 5L20 6.5" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-bold">Welcome to Wazeo!</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Taking you to your dashboard…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

