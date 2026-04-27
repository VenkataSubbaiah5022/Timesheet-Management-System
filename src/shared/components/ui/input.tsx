import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow,background-color] duration-150 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/18",
        className
      )}
      {...props}
    />
  );
}
