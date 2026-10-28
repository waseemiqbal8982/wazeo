import { createClient } from "@/lib/supabase/server";

// Comma-separated list of emails that are allowed to access the admin area.
// Read from the ADMIN_EMAILS environment variable (server-only).
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

// Returns:
//   - true  => current user is an allowed admin (email in ADMIN_EMAILS + role admin)
//   - false => user is signed in but NOT an allowed admin
//   - null  => no user signed in
export async function isAdminUser(): Promise<boolean | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  if (!isAllowedAdminEmail(user.email)) return false;
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return prof?.role === "admin";
}

// Admin OR support. Used to open the /admin area for both roles, while
// sensitive actions still call isAdminUser() (admin-only).
export async function isAdminOrSupport(): Promise<boolean | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  if (!isAllowedAdminEmail(user.email)) return false;
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return prof?.role === "admin" || prof?.role === "support";
}

// Returns the caller's admin-listed role, or null.
export async function getAdminRole(): Promise<"admin" | "support" | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  if (!isAllowedAdminEmail(user.email)) return null;
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return prof?.role === "support" ? "support" : prof?.role === "admin" ? "admin" : null;
}
