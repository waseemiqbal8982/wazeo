import { redirect, notFound } from "next/navigation";
import { isAdminUser } from "@/lib/adminAuth";
import { AppShell } from "@/components/shell/AppShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await isAdminUser();
  if (ok === null) redirect("/sign-in");
  if (ok !== true) notFound(); // 404 for everyone not on the admin allowlist.

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  return (
    <AppShell
      mode="admin"
      user={{
        id: user?.id || "",
        username: profile?.username || null,
        role: "admin",
        balance: Number(profile?.balance || 0),
        theme: profile?.theme || null,
        email: profile?.email || null,
        country: profile?.country || null,
        currency: profile?.currency || null,
      }}
    >
      {children}
    </AppShell>
  );
}
