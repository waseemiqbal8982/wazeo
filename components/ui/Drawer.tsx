"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: "right" | "left";
  children: React.ReactNode;
}

export function Drawer({ open, onClose, title, side = "right", children }: DrawerProps) {
  const isRight = side === "right";
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "absolute top-0 flex h-full w-full max-w-sm flex-col border-[var(--border)] bg-[var(--surface)] shadow-pop",
              isRight ? "right-0 border-l" : "left-0 border-r"
            )}
            initial={{ x: isRight ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: isRight ? "100%" : "-100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              {title && <h3 className="text-base font-semibold">{title}</h3>}
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
