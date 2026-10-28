"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./Logo";

// Maintenance gate: when admin enables maintenance mode, non-admin
// visitors see a full-screen maintenance screen. Admins pass through.
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [state, setState] = useState<"loading" | "ok" | "maint">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: row } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "maintenance_mode")
          .maybeSingle();
        const on = row?.value === "true";
        if (on) {
          const { data: { user } } = await supabase.auth.getUser();
          let isAdmin = false;
          if (user) {
            const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
            isAdmin = prof?.role === "admin";
          }
          if (active) {
            if (!isAdmin) {
              const { data: msg } = await supabase.from("settings").select("value").eq("key", "maintenance_message").maybeSingle();
              setMessage(msg?.value || "We are performing scheduled maintenance. Please check back soon.");
              setState("maint");
              return;
            }
          }
        }
        if (active) setState("ok");
      } catch {
        if (active) setState("ok");
      }
    })();
    return () => { active = false; };
  }, []);

  if (state === "maint") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex w-fit items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <Logo size={40} />
          </div>
          <h1 className="mt-5 text-2xl font-bold">We&apos;ll be right back</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">{message}</p>
          <div className="mt-6 flex justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
