"use client";

import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  interactive?: boolean;
}

export function Card({ glow, interactive, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5",
        glow && "glass-glow",
        interactive &&
          "card-tilt transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_var(--glow)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
