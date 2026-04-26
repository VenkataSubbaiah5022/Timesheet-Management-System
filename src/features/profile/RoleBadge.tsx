import { cn } from "@/lib/utils";
import type { Role } from "../../shared/types/domain";

const styles: Record<Role, string> = {
  admin: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-200",
  manager: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-100",
  employee: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100",
};

const labels: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        styles[role],
        className
      )}
    >
      {labels[role]}
    </span>
  );
}
