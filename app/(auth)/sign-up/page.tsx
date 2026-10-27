"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COUNTRIES, countryName } from "@/lib/countries";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { passwordStrength } from "@/lib/validation";
import { useI18n } from "@/lib/i18n";

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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referral, setReferral] = useState("");
  const [country, setCountry] = useState("");
  const [detected, setDetected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errTick, setErrTick] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/meta/country")
      .then((r) => r.json())
      .then((d) => {
        if (d?.country) {
          setDetected(d.country);
          setCountry((c) => c || d.country);
        }
      })
      .catch(() => {});
  }, []);

  const strength = passwordStrength(password);

  const fail = (msg: string) => {
    setError(msg);
    setErrTick((c) => c + 1);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (username.length < 3) return fail(t("auth.error.username_short"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(t("auth.error.email_invalid"));
    if (password.length < 8) return fail(t("auth.error.password_short"));
    if (password !== confirm) return fail(t("auth.error.password_mismatch"));

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, referral: referral || undefined, country: country || undefined }),
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

  if (done) {
    return (
      <Card className="glass-glow p-6 text-center sm:p-8">
        <Checkmark />
        <div className="mb-4 flex justify-center">
          <Logo size={36} />
        </div>
        <h1 className="text-lg font-semibold">{t("auth.signup_success_title")}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("auth.signup_success_body").replace("{email}", email)}
        </p>
        <Button variant="outline" full className="mt-5" onClick={() => router.replace("/sign-in")}>
          {t("auth.go_signin")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="glass-glow p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={40} showText textClassName="text-2xl" />
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t("auth.signup.title")}</p>
      </div>

      <div key={errTick} className={error ? "animate-shake" : ""}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label={t("auth.username")}
            placeholder={t("auth.ph.username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <Input
            label={t("auth.email")}
            type="email"
            placeholder={t("auth.ph.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <div>
            <Input
              label={t("auth.country")}
              list="countries"
              placeholder={t("auth.ph.country")}
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            />
            {detected && (
              <p className="-mt-1 mb-1 text-xs text-[var(--text-muted)]">
                Detected: {countryName(detected)}. Change if wrong.
              </p>
            )}
            <datalist id="countries">
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </datalist>
          </div>
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
                          background:
                            strength.score >= 4
                              ? "var(--success)"
                              : strength.score >= 2
                                ? "var(--accent)"
                                : "var(--danger)",
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
          <Input
            label={t("auth.referral")}
            placeholder={t("auth.ph.referral")}
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
          />

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

      <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
        {t("auth.existing_account")}{" "}
        <Link href="/sign-in" className="font-medium text-[var(--accent)]">
          {t("auth.signin_link")}
        </Link>
      </p>
    </Card>
  );
}

