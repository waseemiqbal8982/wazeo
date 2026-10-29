"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

/** "Share Wazeo" using the signed-in user's referral link. */
export function ShareWazeo() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const sb = createClient();
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) return;
      const { data: prof } = await sb
        .from("profiles")
        .select("referral_code")
        .eq("id", me.user.id)
        .maybeSingle();
      const code = prof?.referral_code || "";
      const url = `${window.location.origin}/r/${code}`;
      if (navigator.share) {
        await navigator.share({ title: "Wazeo", text: "Grow on Instagram, TikTok and YouTube with gradual delivery.", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Referral link copied", variant: "success" });
      }
    } catch {
      toast({ title: "Could not share", variant: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.03] px-3 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text)]"
      aria-label="Share Wazeo"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
      <span className="hidden xl:inline">Share</span>
    </button>
  );
}
