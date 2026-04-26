import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-400/30 dark:border-slate-600 dark:bg-background dark:focus-visible:border-slate-500 dark:focus-visible:ring-slate-500/30",
        className
      )}
      {...props}
    />
  );
}
