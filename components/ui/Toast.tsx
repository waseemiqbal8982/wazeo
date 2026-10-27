"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastVariant = "default" | "success" | "danger";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastApi {
  toast: (t: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const tone: Record<ToastVariant, string> = {
  default: "border-[var(--border-strong)]",
  success: "border-emerald-500/40",
  danger: "border-red-500/40",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((t: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, variant: t.variant || "default", title: t.title, description: t.description }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto w-full max-w-sm rounded-xl border bg-[#151526] p-3 shadow-xl ${tone[t.variant]}`}
            >
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{t.description}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
