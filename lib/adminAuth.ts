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
