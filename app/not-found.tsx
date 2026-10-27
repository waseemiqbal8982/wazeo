import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <Logo size={48} className="mb-6" />
      <h1 className="text-6xl font-extrabold">404</h1>
      <p className="mt-3 text-[var(--text-muted)]">This page doesn’t exist.</p>
      <Link href="/" className="mt-6">
        <Button>Back home</Button>
      </Link>
    </div>
  );
}
