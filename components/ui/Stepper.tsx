"use client";

import { cn } from "@/lib/utils";

export type StepStatus = "done" | "current" | "upcoming";

export interface Step {
  label: string;
  status: StepStatus;
  hint?: string;
}

interface StepperProps {
  steps: Step[];
  vertical?: boolean;
  className?: string;
}

export function Stepper({ steps, vertical, className }: StepperProps) {
  return (
    <ol className={cn(vertical ? "space-y-0" : "flex items-center", className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const done = step.status === "done";
        const current = step.status === "current";
        return (
          <li key={step.label} className={cn(!vertical && "flex flex-1 items-center", vertical && "flex gap-3")}>
            <div className={cn("flex items-center", !vertical && "flex-1")}>
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-colors",
                    done && "border-[var(--accent)] bg-[var(--accent)] text-white",
                    current && "border-[var(--accent)] text-[var(--accent)]",
                    step.status === "upcoming" && "border-[var(--border-strong)] text-[var(--text-muted)]"
                  )}
                >
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="text-center">
                  <p className={cn("text-xs font-medium", current ? "text-[var(--text)]" : "text-[var(--text-muted)]")}>
                    {step.label}
                  </p>
                  {step.hint && <p className="text-[10px] text-[var(--text-muted)]/70">{step.hint}</p>}
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded-full",
                    vertical ? "hidden" : "",
                    done ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                  )}
                />
              )}
            </div>
            {vertical && !isLast && <div className={cn("ml-[13px] w-0.5 self-stretch rounded-full", done ? "bg-[var(--accent)]" : "bg-[var(--border)]")} />}
          </li>
        );
      })}
    </ol>
  );
}
