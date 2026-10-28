import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/dashboard/AppShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  if (!user.email_confirmed_at) redirect("/verify-email");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/sign-in");

  if (profile.banned) {
    await supabase.auth.signOut();
    redirect("/sign-in?error=banned");
  }

  return (
    <AppShell
      user={{
        id: user.id,
        username: profile.username,
        role: profile.role,
        balance: Number(profile.balance || 0),
        theme: profile.theme,
        email: profile.email,
        country: profile.country,
        currency: profile.currency,
      }}
    >
      {children}
    </AppShell>
  );
}
