"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ShellCtx, User } from "./shell-context";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const [balance, setBalance] = useState(user.balance);

  return (
    <ShellCtx.Provider value={{ balance, setBalance }}>
      <div className="flex min-h-screen">
        <Sidebar user={user} pathname={pathname} />
        <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
          <TopBar user={user} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-24 lg:px-6 lg:pb-8">
            {children}
          </main>
        </div>
        <MobileNav pathname={pathname} />
      </div>
    </ShellCtx.Provider>
  );
}
