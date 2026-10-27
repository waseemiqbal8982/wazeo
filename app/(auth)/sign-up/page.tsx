"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COUNTRIES, countryName } from "@/lib/countries";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { passwordStrength } from "@/lib/validation";

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referral, setReferral] = useState("");
  const [country, setCountry] = useState("");
  const [detected, setDetected] = useState("");

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const strength = passwordStrength(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (username.length < 3) return setError("Username must be at least 3 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, referral: referral || undefined, country: country || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign up failed.");
        return;
      }
      if (data.needsConfirm) {
        setDone(true);
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
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
        <h1 className="text-lg font-semibold">Almost there!</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          We sent a verification link to <span className="text-[var(--text)]">{email}</span>.
          Please check your inbox and click it to verify your email, then sign in.
        </p>
        <Button variant="outline" full className="mt-5" onClick={() => router.replace("/sign-in")}>
          Go to sign in
        </Button>
      </Card>
    );
  }

  return (
    <Card className="glass-glow p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={40} showText textClassName="text-2xl" />
        <p className="mt-2 text-sm text-[var(--text-muted)]">Create your free account</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Username" placeholder="e.g. growthpro" value={username}
          onChange={(e) => setUsername(e.target.value)} />
        <Input label="Email" type="email" placeholder="you@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <div>
          <Input label="Country" list="countries" placeholder="Select your country" value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))} />
          {detected && (
            <p className="-mt-1 mb-1 text-xs text-[var(--text-muted)]">
              Detected: {countryName(detected)}. Change if wrong.
            </p>
          )}
          <datalist id="countries">
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </datalist>
        </div>
        <div>
          <Input label="Password" type="password" placeholder="Min 8 characters" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
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
        <Input label="Confirm password" type="password" placeholder="Repeat password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} />
        <Input label="Referral code (optional)" placeholder="e.g. X7K2Q9" value={referral}
          onChange={(e) => setReferral(e.target.value)} />
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button full loading={loading} type="submit">
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-[var(--accent)]">Sign in</Link>
      </p>
    </Card>
  );
}
