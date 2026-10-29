"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Status {
  show: boolean;
  message: string;
  tone: "warning" | "danger";
}

/** Thin banner shown only when maintenance mode or a provider issue is active. */
export function StatusStrip() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const sb = createClient();
        const { data: rows } = await sb.from("settings").select("key, value").in("key", ["maintenance_mode", "maintenance_message", "provider_issue"]);
        const map: Record<string, string> = {};
        (rows || []).forEach((r) => { map[r.key] = r.value; });

        if (map.maintenance_mode === "true") {
          const message = map.maintenance_message || "We are performing scheduled maintenance. New orders may be delayed.";
          if (active) setStatus({ show: true, message, tone: "warning" });
          return;
        }
        if (map.provider_issue === "true") {
          if (active) setStatus({ show: true, message: "A delivery provider is currently having issues. Some orders may be slower than usual.", tone: "danger" });
          return;
        }
        if (active) setStatus(null);
      } catch {
        if (active) setStatus(null);
      }
    })();
    return () => { active = false; };
  }, []);

  if (!status || !status.show) return null;

  return (
    <div
      className={`fixed inset-x-0 top-16 z-40 px-4 py-2 text-center text-xs font-medium ${
        status.tone === "danger"
          ? "bg-[var(--danger)]/15 text-[var(--danger)]"
          : "bg-[var(--warning)]/15 text-[var(--warning)]"
      }`}
      role="status"
    >
      {status.message}
    </div>
  );
}
