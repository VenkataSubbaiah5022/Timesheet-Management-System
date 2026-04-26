import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import type { Role } from "../../shared/types/domain";
import { useAuthStore } from "./store";

export function ProtectedRoute({ role, children }: PropsWithChildren<{ role: Role }>) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/employee/clock"} replace />;
  return <>{children}</>;
}
