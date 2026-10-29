import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminSecurity } from "@/components/admin/AdminSecurity";

export const metadata = { title: "Admin · Settings" };

export default function Page() {
  return (
    <div className="space-y-5">
      <AdminSettings />
      <AdminSecurity />
    </div>
  );
}
