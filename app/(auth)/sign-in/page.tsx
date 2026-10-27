"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { signIn } from "../actions";

export default function SignInPage() {
  const router = useRouter();
  const [next, setNext] = useState("/dashboard");
  const [banned, setBanned] = useState(false);
  const [state, formAction, pending] = useActionState(signIn, undefined);

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
    return () => { alive = false; };
  }, [router, next]);

  useEffect(() => {
    if (state?.ok && state?.dest) {
      router.replace(state.dest);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Card className="glass-glow p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={40} showText textClassName="text-2xl" />
        <p className="mt-2 text-sm text-[var(--text-muted)]">Welcome back — sign in to continue</p>
      </div>

      {(banned || state?.error) && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {state?.error || "Your account has been banned. Contact support."}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Input name="email" label="Email" type="email" placeholder="you@example.com" autoComplete="email" required />
        <Input name="password" label="Password" type="password" placeholder="••••••••" autoComplete="current-password" required />
        <Button full loading={pending} type="submit">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-[var(--text-muted)] hover:text-[var(--accent)]">
          Forgot password?
        </Link>
        <Link href="/sign-up" className="font-medium text-[var(--accent)] hover:brightness-110">
          Create account
        </Link>
      </div>
    </Card>
  );
}
