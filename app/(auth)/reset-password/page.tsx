"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        setError("This reset link is invalid or expired.");
      });
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Could not update password.");
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="glass-glow p-6 text-center sm:p-8">
        <Logo size={40} className="mx-auto mb-4" />
        <h1 className="text-lg font-semibold">Password updated</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">You can now sign in with your new password.</p>
        <Button full className="mt-5" onClick={() => router.replace("/sign-in")}>
          Sign in
        </Button>
      </Card>
    );
  }

  return (
    <Card className="glass-glow p-6 sm:p-8">
      <div className="mb-6 text-center">
        <Logo size={40} className="mx-auto mb-3" />
        <h1 className="text-lg font-semibold">Choose a new password</h1>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="New password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <Input label="Confirm password" type="password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} />
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button full loading={loading} type="submit">
          Update password
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/sign-in" className="text-[var(--text-muted)] hover:text-[var(--accent)]">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
