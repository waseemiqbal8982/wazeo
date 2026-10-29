"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SocialLoginProps {
  next?: string;
}

type Provider = "google" | "twitter" | "github";

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "twitter", label: "X (Twitter)" },
  { id: "github", label: "GitHub" },
];

const BrandIcon = ({ provider }: { provider: Provider }) => {
  if (provider === "google") {
    return (
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    );
  }
  if (provider === "twitter") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .319.216.694.824.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
};

interface ProviderConfig {
  configured: boolean;
  enabled: boolean;
}

export function SocialLogin({ next = "/dashboard" }: SocialLoginProps) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [config, setConfig] = useState<Record<string, ProviderConfig>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/meta/oauth")
      .then((r) => r.json())
      .then((d) => setConfig(d || {}))
      .catch(() => {});
  }, []);

  async function signInWith(provider: Provider) {
    setError("");
    setBusy(provider);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) {
        const msg = /not enabled/i.test(error.message)
          ? `${provider} sign-in is not enabled yet.`
          : error.message;
        setError(msg);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const visibleProviders = PROVIDERS.filter((p) => {
    const c = config[p.id];
    return !!c && c.enabled && c.configured;
  });

  return (
    <div>
      {visibleProviders.length > 0 && (
        <div className="flex items-center justify-center gap-4">
          {visibleProviders.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={!!busy}
              onClick={() => signInWith(p.id)}
              title={`Continue with ${p.label}`}
              aria-label={`Continue with ${p.label}`}
              className="group relative flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-white/[0.03] text-[var(--text)] transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.03]"
            >
              {busy === p.id ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]" />
              ) : (
                <BrandIcon provider={p.id} />
              )}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {visibleProviders.length > 0 && (
        <div className="mt-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)]">or continue with email</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
      )}
    </div>
  );
}
