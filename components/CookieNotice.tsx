"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

const KEY = "wazeo-cookie-consent";

export function CookieNotice() {
  const [state, setState] = useState<"loading" | "show" | "accepted" | "declined">("loading");

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setState(v === "accepted" ? "accepted" : v === "declined" ? "declined" : "show");
    } catch {
      setState("show");
    }
  }, []);

  if (state !== "show") return null;

  const choose = (val: "accepted" | "declined") => {
    try {
      localStorage.setItem(KEY, val);
    } catch {}
    setState(val);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-[var(--border-strong)] bg-[#12121f] p-5 shadow-2xl md:left-auto md:right-4 md:mx-0"
        role="dialog"
        aria-label="Cookie notice"
      >
        <p className="text-sm text-[var(--text)]">
          We use cookies to keep you signed in, remember your language and currency, and store your
          preferences. See our{" "}
          <Link href="/privacy" className="text-[var(--accent)]">privacy policy</Link>.
        </p>
        <div className="mt-4 flex gap-2">
          <Button size="sm" full onClick={() => choose("accepted")}>Accept</Button>
          <Button size="sm" variant="outline" full onClick={() => choose("declined")}>Decline</Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
