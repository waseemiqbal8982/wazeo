"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authErrorMessage } from "@/lib/authMessages";
import { rateLimit } from "@/lib/rateLimit";
import { headers } from "next/headers";

export async function signIn(_prevState: unknown, formData: FormData) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`signin:${ip}`, 6, 60_000);
  if (!rl.ok) {
    return { error: "Too many attempts. Please wait a moment." };
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: authErrorMessage(error) };
  }

  let dest = next;
  if (data.user) {
    // ENFORCE verification: unverified users get sent to verification.
    if (!data.user.email_confirmed_at) {
      return { verify: true, email };
    }
    // Ensure a profile row exists (root-cause fix for the sign-in loop).
    try {
      const admin = createAdminClient();
      const { data: existing } = await admin.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
      if (!existing) {
        const { data: au } = await admin.auth.admin.getUserById(data.user.id);
        const username = au?.user?.user_metadata?.username || `user_${data.user.id.slice(0, 8)}`;
        await admin.from("profiles").upsert({ id: data.user.id, username }, { onConflict: "id" });
      }
    } catch {}
    try {
      const { data: prof } = await supabase.from("profiles").select("role, banned").eq("id", data.user.id).single();
      if (prof?.banned) {
        await supabase.auth.signOut();
        return { error: "Your account has been banned. Contact support." };
      }
      if (prof?.role === "admin") dest = "/admin";
    } catch {}
    try {
      const admin = createAdminClient();
      await admin.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
    } catch {}
  }

  return { ok: true, dest };
}
