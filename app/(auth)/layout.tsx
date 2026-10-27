"use client";

import { usePathname } from "next/navigation";
import AuthVisual from "@/components/auth/AuthVisual";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const split = pathname === "/sign-in" || pathname === "/sign-up";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent-2), transparent 70%)" }}
      />

      {split ? (
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-4 sm:p-6 lg:min-h-screen lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:p-8">
          <div className="order-1 lg:order-none">
            <AuthVisual />
          </div>
          <div className="order-2 w-full lg:order-none">{children}</div>
        </div>
      ) : (
        <div className="relative flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">{children}</div>
        </div>
      )}
    </div>
  );
}
