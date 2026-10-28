import { redirect, notFound } from "next/navigation";
import { isAdminUser } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await isAdminUser();
  if (ok === null) redirect("/sign-in");
  if (ok !== true) notFound(); // 404 for everyone not on the admin allowlist.

  return <AdminShell>{children}</AdminShell>;
}
