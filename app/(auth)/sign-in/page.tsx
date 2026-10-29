"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { signIn } from "../actions";
import { useI18n } from "@/lib/i18n";
import { AccessKeyRedeem } from "@/components/auth/AccessKeyRedeem";
import { SocialLogin } from "@/components/auth/SocialLogin";
import {
  STAY_SIGNED_IN_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/sessionCookie";

const STAY_ON = `max-age=${SESSION_MAX_AGE}; path=/; samesite=lax`;
const STAY_OFF = "max-age=0; path=/; samesite=lax";

function setStaySignedIn(on: boolean) {
  try {
    document.cookie = `${STAY_SIGNED_IN_COOKIE}=${on ? "1" : "0"}; ${on ? STAY_ON : STAY_OFF}`;
  } catch {}
}

export default function SignInPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [next, setNext] = useState("/dashboard");
  const [banned, setBanned] = useState(false);
  const [state, formAction, pending] = useActionState(signIn, undefined);
  const [errTick, setErrTick] = useState(0);
  const [mode, setMode] = useState<"signin" | "key">("signin");
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setNext(p.get("next") || "/dashboard");
    setBanned(p.get("error") === "banned");
  }, []);

  useEffect(() => {
    fetch("/api/meta/oauth")
      .then((r) => r.json())
      .then((d) => setEmailEnabled(d?.emailPassword !== false))
      .catch(() => {});
  }, []);

  // If a session already exists (e.g. after a middleware bounce), go straight
  // to the app instead of being stuck on the login page.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.auth.getUser();
        if (!alive || !data?.user) return;
        const { data: prof } = await sb.from("profiles").select("role").eq("id", data.user.id).single();
        router.replace(prof?.role === "admin" ? "/admin" : next);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [router, next]);

  useEffect(() => {
    if (state?.error) setErrTick((c) => c + 1);
  }, [state]);

  useEffect(() => {
    if (state?.verify) {
      router.replace(`/verify-email?email=${encodeURIComponent(state.email || "")}`);
    } else if (state?.ok && state?.dest) {
      router.replace(state.dest);
      router.refresh();
    }
  }, [state, router]);

  const showError = banned || !!state?.error;

  return (
    <Card className="glass-glow p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={40} showText textClassName="text-2xl" />
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t("auth.login.title")}</p>
      </div>

      {mode === "key" ? (
        <>
          <AccessKeyRedeem />
          {emailEnabled && (
            <div className="mt-4 text-center text-sm">
              <button type="button" onClick={() => setMode("signin")} className="font-medium text-[var(--accent)] hover:brightness-110">
                ← Use email &amp; password instead
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* 1. Sign-in form first (hidden when email+password is disabled) */}
          {emailEnabled && (
            <div key={errTick} className={showError ? "animate-shake" : ""}>
              {showError && (
                <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {state?.error || t("auth.error.banned")}
                </div>
              )}
              <form action={formAction} className="space-y-4" noValidate>
                <input type="hidden" name="next" value={next} />
                <Input
                  name="email"
                  label={t("auth.email")}
                  type="email"
                  placeholder={t("auth.ph.email")}
                  autoComplete="email"
                  required
                />
                <div>
                  <PasswordInput
                    name="password"
                    label={t("auth.password")}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <div className="mt-2 flex justify-end text-sm">
                    <Link href="/forgot-password" className="text-[var(--text-muted)] hover:text-[var(--accent)]">
                      {t("auth.forgot")}
                    </Link>
                  </div>
                </div>
                <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    name="stay_signed_in"
                    defaultChecked
                    onChange={(e) => setStaySignedIn(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] bg-white/[0.03] accent-[var(--accent)]"
                  />
                  {t("auth.stay_signed_in")}
                </label>
                <Button full loading={pending} type="submit">
                  {pending ? t("auth.signin_progress") : t("auth.signin_button")}
                </Button>
              </form>
            </div>
          )}
          {!emailEnabled && !state?.error && (
            <p className="text-sm text-[var(--text-muted)]">Email &amp; password sign-in is currently disabled.</p>
          )}

          {/* 2. Round social buttons */}
          <div className="mt-6">
            <SocialLogin next={next} />
          </div>

          {/* 3. Two clear options */}
          <div className="mt-6 space-y-2.5 border-t border-[var(--border)] pt-5">
            {emailEnabled && (
              <Link
                href="/sign-up"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 text-sm font-medium text-[var(--accent)] transition-colors hover:brightness-110"
              >
                Create an account
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMode("key")}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              I have an access key
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
