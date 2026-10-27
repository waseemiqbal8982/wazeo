"use client";

import { createClient } from "@/lib/supabase/client";

export async function audit(action: string, details?: Record<string, unknown>) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action,
      details: details ?? {},
    });
  } catch {
    // audit must never break admin actions
  }
}
