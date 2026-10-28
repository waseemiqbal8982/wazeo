"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const ADMIN_GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  { title: "Main", items: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/tickets", label: "Tickets" },
  ] },
  { title: "Catalog", items: [
    { href: "/admin/services", label: "Services & Categories" },
    { href: "/admin/providers", label: "Providers" },
  ] },
  { title: "Finance", items: [
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/coupons", label: "Coupons & Loyalty" },
  ] },
  { title: "Content", items: [
    { href: "/admin/announcements", label: "Announcements" },
    { href: "/admin/cms", label: "Pages & FAQ" },
  ] },
  { title: "Manage", items: [
    { href: "/admin/keys", label: "Access Keys" },
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/translations", label: "Translations" },
    { href: "/admin/system", label: "System" },
  ] },
];

export const ADMIN_LINKS = ADMIN_GROUPS.flatMap((g) => g.items);

export function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-[var(--border)] bg-[#0d0d18]/85 backdrop-blur-xl transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-[var(--border)] px-3", collapsed && "justify-center")}>
        <span className={cn("text-lg font-bold", collapsed && "hidden")}>Wazeo</span>
        <button onClick={onToggle} className={cn("rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/[0.05]", !collapsed && "ml-auto")} aria-label="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {ADMIN_GROUPS.map((g) => (
          <div key={g.title} className="mb-3">
            {!collapsed && (
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{g.title}</p>
            )}
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors duration-200",
                      collapsed && "justify-center",
                      active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text)]"
                    )}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border)] p-2">
        <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text)]">
          ← Back to store
        </Link>
      </div>
    </aside>
  );
}
