"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAV, MOBILE } from "./shell-context";

export function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[var(--border)] bg-[#0d0d18]/90 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
      {MOBILE.map((idx) => {
        const item = NAV[idx];
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-medium transition-colors duration-200",
              active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
            )}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
