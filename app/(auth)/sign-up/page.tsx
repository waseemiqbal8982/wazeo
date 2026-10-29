"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { OtpInput } from "@/components/auth/OtpInput";
import { passwordStrength } from "@/lib/validation";
import { useI18n } from "@/lib/i18n";
import { Tabs } from "@/components/ui/Tabs";
import { AccessKeyRedeem } from "@/components/auth/AccessKeyRedeem";

const Checkmark = () => (
  <div className="auth-check-pop mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/15">
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--success)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path className="auth-checkmark-stroke" d="m4 12.5 5 5L20 6.5" />
    </svg>
  </div>
);

export default function SignUpPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errTick, setErrTick] = useState(0);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<"signup" | "key">("signup");

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpTick, setOtpTick] = useState(0);
  const [verified, setVerified] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [formStart] = useState(() => Date.now());
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    if (!done) return;
    setResendIn(60);
    setExpiresIn(300);
    const id = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
      setExpiresIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [done]);

  const strength = passwordStrength(password);

  const fail = (msg: string) => {
    setError(msg);
    setErrTick((c) => c + 1);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(t("auth.error.email_invalid"));
    if (password.length < 8) return fail(t("auth.error.password_short"));
    if (password !== confirm) return fail(t("auth.error.password_mismatch"));
    if (!terms) return fail(t("auth.error.terms_required"));

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, website: honeypot, form_start: formStart }),
      });
      const data = await res.json();
      if (!res.ok) {
        fail(data.error || t("auth.error.network"));
        return;
      }
      if (data.needsConfirm) setDone(true);
      else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch {
      fail(t("auth.error.network"));
    } finally {
      setLoading(false);
    }
  }

  const verifyCode = useCallback(async () => {
    if (otp.length < 6 || verifying) return;
    setVerifying(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || t("auth.error.otp_generic"));
        setOtpTick((c) => c + 1);
        setOtp("");
        return;
      }
      setVerified(true);
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 900);
    } catch {
      setOtpError(t("auth.error.network"));
      setOtpTick((c) => c + 1);
      setOtp("");
    } finally {
      setVerifying(false);
    }
  }, [otp, verifying, email, t, router]);

  useEffect(() => {
    if (done && otp.length === 6 && !verifying) void verifyCode();
  }, [otp, done, verifying, verifyCode]);

  const resend = useCallback(async () => {
    if (resendBusy || resendIn > 0) return;
    setResendBusy(true);
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || t("auth.error.network"));
        setOtpTick((c) => c + 1);
        return;
      }
      setOtp("");
      setOtpError("");
      setResendIn(60);
    } catch {
      setOtpError(t("auth.error.network"));
      setOtpTick((c) => c + 1);
    } finally {
      setResendBusy(false);
    }
  }, [email, resendBusy, resendIn, t]);

  const changeEmail = () => {
    setDone(false);
    setOtp("");
    setOtpError("");
    setVerified(false);
    setResendIn(0);
  };


  if (done) {
    return (
      <Card className="glass-glow p-6 text-center sm:p-8">
        <div key={otpTick} className={otpError || verified ? "animate-shake" : ""}>
          {verified ? (
            <>
              <Checkmark />
              <h1 className="text-lg font-semibold">{t("auth.otp_success_title")}</h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {t("auth.otp_success_body")}
              </p>
              <div className="mt-5 flex justify-center">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]" />
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex justify-center">
                <Logo size={36} />
              </div>
              <h1 className="text-lg font-semibold">{t("auth.check_email_title")}</h1>
              <p className="mb-5 mt-2 text-sm text-[var(--text-muted)]">
                {t("auth.check_email_body").replace("{email}", email)}
              </p>

              <OtpInput
                value={otp}
                onChange={(v) => { setOtp(v); if (otpError) setOtpError(""); }}
                disabled={verifying}
                error={!!otpError}
                autoFocus
              />

              {expiresIn <= 0 && !verified && (
                <p role="alert" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                  This code has expired. Request a new one below.
                </p>
              )}

              {otpError && (
                <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {otpError}
                </p>
              )}

              <div className="mt-5 flex flex-col items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={resendIn > 0 || resendBusy}
                  onClick={resend}
                >
                  {resendIn > 0
                    ? t("auth.resend_in").replace("{s}", String(resendIn))
                    : t("auth.resend_code")}
                </Button>
                <button
                  type="button"
                  onClick={changeEmail}
                  className="text-xs text-[var(--text-muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
                >
                  {t("auth.wrong_email")}
                </button>
              </div>
            </>
          )}
        </div>
      </Card>
    );
  }


  return (
    <Card className="glass-glow p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={40} showText textClassName="text-2xl" />
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t("auth.signup.title")}</p>
      </div>

      <Tabs
        tabs={[
          { id: "signup", label: "Email" },
          { id: "key", label: "Access Key" },
        ]}
        value={mode}
        onChange={(m) => setMode(m as "signup" | "key")}
        className="mb-6"
      />

      {mode === "key" ? (
        <AccessKeyRedeem />
      ) : (
      <div key={errTick} className={error ? "animate-shake" : ""}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="hp-website">Website</label>
            <input
              id="hp-website"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
          <Input
            label={t("auth.email")}
            type="email"
            placeholder={t("auth.ph.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <div>
            <PasswordInput
              label={t("auth.password")}
              placeholder={t("auth.ph.password")}
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
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t("auth.strength")}: {strength.label}
                </p>
              </div>
            )}
          </div>
          <PasswordInput
            label={t("auth.confirm_password")}
            placeholder={t("auth.ph.confirm")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <label className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="text-[var(--accent)] hover:underline">Terms</Link>{" "}
              and{" "}
              <Link href="/refund-policy" className="text-[var(--accent)] hover:underline">Refund Policy</Link>.
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <Button full loading={loading} type="submit">
            {t("auth.create_account")}
          </Button>
        </form>
      </div>
      )}

      <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
        {t("auth.existing_account")}{" "}
        <Link href="/sign-in" className="font-medium text-[var(--accent)]">
          {t("auth.signin_link")}
        </Link>
      </p>
    </Card>
  );
}

