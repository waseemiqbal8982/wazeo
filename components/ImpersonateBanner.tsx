"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Clearly visible banner shown whenever an admin is impersonating a user.
// Exit clears the flag and signs out of the impersonated session.
export function ImpersonateBanner() {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )wazeo-impersonating=([^;]*)/);
    setTarget(m ? decodeURIComponent(m[1]) : null);
  }, []);

  if (!target) return null;

  async function exit() {
    setBusy(true);
    try {
      await fetch("/api/admin/users/impersonate/exit", { method: "POST" });
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[300] flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm backdrop-blur">
      <p className="font-medium text-amber-200">
        ⚠️ You are impersonating <span className="font-bold">{target}</span>
      </p>
      <button
        type="button"
        onClick={exit}
        disabled={busy}
        className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100 hover:bg-amber-400/20 disabled:opacity-60"
      >
        {busy ? "Exiting…" : "Exit impersonation"}
      </button>
    </div>
  );
}
