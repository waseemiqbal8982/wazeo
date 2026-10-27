"use client";

import { createContext, useContext } from "react";

export interface User {
  id: string;
  username: string | null;
  role: string | null;
  balance: number;
  theme: string | null;
}

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/dashboard/new-order", label: "New Order", icon: "M12 5v14M5 12h14" },
  { href: "/dashboard/orders", label: "Orders", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/dashboard/add-funds", label: "Add Funds", icon: "M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" },
  { href: "/dashboard/tickets", label: "Tickets", icon: "M4 6h16v10H8l-4 4V6z" },
  { href: "/dashboard/services", label: "Services", icon: "M4 7h16M4 12h16M4 17h16" },
  { href: "/dashboard/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6z" },
] as const;

export const MOBILE = [0, 1, 2, 3, 6];

interface ShellCtx {
  balance: number;
  setBalance: (n: number) => void;
}

export const ShellCtx = createContext<ShellCtx>({ balance: 0, setBalance: () => {} });

export const useShell = () => useContext(ShellCtx);
