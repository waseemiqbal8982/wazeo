"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";

export default function SignInPage() {
  const router = useRouter();
  const [next, setNext] = useState("/dashboard");
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setNext(p.get("next") || "/dashboard");
    setBanned(p.get("error") === "banned");
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Email and password are required.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="glass-glow p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={40} showText textClassName="text-2xl" />
        <p className="mt-2 text-sm text-[var(--text-muted)]">Welcome back — sign in to continue</p>
      </div>

      {banned && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          Your account has been banned. Contact support.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button full loading={loading} type="submit">
          Sign in
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
