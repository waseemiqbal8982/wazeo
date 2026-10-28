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

export default function SignInPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [next, setNext] = useState("/dashboard");
  const [banned, setBanned] = useState(false);
  const [state, formAction, pending] = useActionState(signIn, undefined);
  const [errTick, setErrTick] = useState(0);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setNext(p.get("next") || "/dashboard");
    setBanned(p.get("error") === "banned");
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
          <PasswordInput
            name="password"
            label={t("auth.password")}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <Button full loading={pending} type="submit">
            {pending ? t("auth.signin_progress") : t("auth.signin_button")}
          </Button>
        </form>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-[var(--text-muted)] hover:text-[var(--accent)]">
          {t("auth.forgot")}
        </Link>
        <Link href="/sign-up" className="font-medium text-[var(--accent)] hover:brightness-110">
          {t("auth.create_link")}
        </Link>
      </div>
    </Card>
  );
}
