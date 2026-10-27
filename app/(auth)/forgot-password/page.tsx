"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Failed to send reset link.");
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="glass-glow p-6 text-center sm:p-8">
        <Logo size={40} className="mx-auto mb-4" />
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          If an account exists for that email, we’ve sent a password reset link.
        </p>
        <Button variant="outline" full className="mt-5" onClick={() => setSent(false)}>
          Try another email
        </Button>
      </Card>
    );
  }

  return (
    <Card className="glass-glow p-6 sm:p-8">
      <div className="mb-6 text-center">
        <Logo size={40} className="mx-auto mb-3" />
        <h1 className="text-lg font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Enter your email and we’ll send you a reset link.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email" type="email" placeholder="you@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button full loading={loading} type="submit">
          Send reset link
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
