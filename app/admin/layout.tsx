import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/settings", label: "Settings" },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[#0b0b14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-lg font-bold">Admin</h1>
          <nav className="flex gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]")}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/dashboard" className="shrink-0 text-sm text-[var(--accent)]">Back to store</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    </div>
  );
}
