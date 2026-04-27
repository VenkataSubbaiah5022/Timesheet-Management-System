import { cn } from "@/lib/utils";
import type { Role } from "../../shared/types/domain";

const styles: Record<Role, string> = {
  admin: "border-primary/25 bg-primary/[0.1] text-primary",
  manager: "chip-info",
  employee: "chip-success",
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
