import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "hover-lift rounded-xl border border-border/85 bg-card p-4 text-card-foreground shadow-premium",
        className
      )}
      {...props}
    />
  );
}
