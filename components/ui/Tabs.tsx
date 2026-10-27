"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-xl border border-[var(--border)] bg-white/[0.03] p-1",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex h-9 flex-1 items-center justify-center rounded-lg text-sm font-medium transition-colors duration-200",
              active ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-lg bg-[var(--accent-soft)]"
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
