import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
        className
      )}
      {...props}
    />
  );
}
