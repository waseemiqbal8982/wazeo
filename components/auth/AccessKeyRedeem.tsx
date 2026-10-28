"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, countryName } from "@/lib/countries";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { passwordStrength } from "@/lib/validation";

export function AccessKeyRedeem() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [detected, setDetected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errTick, setErrTick] = useState(0);
  const [support, setSupport] = useState<{ whatsapp?: string; telegram?: string }>({});

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
    fetch("/api/meta/support")
      .then((r) => r.json())
      .then((d) => setSupport({ whatsapp: d?.whatsapp || "", telegram: d?.telegram || "" }))
      .catch(() => {});
  }, []);

  const strength = passwordStrength(password);
  const wa = (support.whatsapp || "").replace(/[^0-9]/g, "");
  const tg = (support.telegram || "").replace(/^@/, "").trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^WZ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key.trim())) {
      setError("Enter a valid WZ-XXXX-XXXX-XXXX access key.");
      setErrTick((c) => c + 1);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email (must match the key's email).");
      setErrTick((c) => c + 1);
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      setErrTick((c) => c + 1);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setErrTick((c) => c + 1);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/key-redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          email: email.trim(),
          username,
          password,
          country: country.slice(0, 2).toUpperCase() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "This key is invalid, expired or not for this email.");
        setErrTick((c) => c + 1);
        return;
      }
      router.replace(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setErrTick((c) => c + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div key={errTick} className={error ? "animate-shake" : ""}>
          {error && (
            <p role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <Input
            label="Access key"
            placeholder="WZ-XXXX-XXXX-XXXX"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            autoComplete="off"
          />
          <div className="h-3" />
          <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Input label="Username" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <div>
            <Input
              label="Country"
              list="key-countries"
              placeholder="e.g. PK, IN, BD…"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            />
            {detected && (
              <p className="-mt-1 mb-1 text-xs text-[var(--text-muted)]">
                Detected: {countryName(detected)}. Change if wrong.
              </p>
            )}
            <datalist id="key-countries">
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </datalist>
          </div>
          <Input label="Phone (optional)" placeholder="+92…" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          <div>
            <PasswordInput label="Choose a password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
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

          <Button full loading={loading} type="submit">
            Redeem key
          </Button>
        </div>
      </form>

      {(wa || tg) && (
        <div className="mt-5 border-t border-[var(--border)] pt-4 text-center">
          <p className="text-sm text-[var(--text-muted)]">No key yet? Request one from support:</p>
          <div className="mt-2 flex justify-center gap-2">
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                WhatsApp
              </a>
            )}
            {tg && (
              <a href={`https://t.me/${tg}`} target="_blank" rel="noreferrer" className="rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                Telegram
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

