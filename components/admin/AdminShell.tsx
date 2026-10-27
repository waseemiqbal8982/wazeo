"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { AdminSidebar, ADMIN_LINKS } from "./AdminSidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  const crumbs = useMemo(() => {
    const match = ADMIN_LINKS.find((l) => pathname === l.href || pathname.startsWith(l.href + "/"));
    return match ? match.label : "Admin";
  }, [pathname]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return ADMIN_LINKS.filter((l) => l.label.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className={cn("flex min-h-screen", collapsed ? "lg:pl-16" : "lg:pl-60")}>
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[#0b0b14]/85 px-4 backdrop-blur-xl">
          <span className="text-sm font-medium text-[var(--text-muted)]">{crumbs}</span>
          <button onClick={() => setSearchOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.03] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:border-[var(--accent)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Search <kbd className="rounded bg-white/[0.06] px-1 text-[10px]">Ctrl K</kbd>
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">{children}</main>
      </div>

      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search admin">
        <div className="space-y-3">
          <Input autoFocus placeholder="Type to find a page…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Koi page nahi mila.</p>
            ) : (
              results.map((r) => (
                <Link key={r.href} href={r.href} onClick={() => { setSearchOpen(false); setQ(""); }}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-white/[0.05]">
                  {r.label}
                </Link>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
