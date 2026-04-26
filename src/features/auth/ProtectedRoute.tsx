import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import type { Role } from "../../shared/types/domain";
import { roleHome } from "./routes";
import { useAuthStore } from "./store";

export function ProtectedRoute({ roles, children }: PropsWithChildren<{ roles: Role[] }>) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return <>{children}</>;
}
