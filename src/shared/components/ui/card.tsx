import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white p-4 text-slate-900 shadow-sm dark:border-slate-800/50 dark:bg-card dark:text-card-foreground",
        className
      )}
      {...props}
    />
  );
}
