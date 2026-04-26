import type { PropsWithChildren } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";
import { Button } from "../../shared/components/ui/button";
import { cn } from "../../shared/lib/utils";

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/employees", label: "Employees" },
  { to: "/admin/attendance", label: "Attendance" },
  { to: "/admin/reports", label: "Reports" },
];
const employeeLinks = [
  { to: "/employee/clock", label: "Clock" },
  { to: "/employee/timesheet", label: "My Timesheet" },
];

export function AppLayout({ children }: PropsWithChildren) {
  const { user, setUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const links = user?.role === "admin" ? adminLinks : employeeLinks;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full border-b border-slate-200 bg-white p-3 md:w-64 md:border-b-0 md:border-r">
        <h1 className="mb-3 text-lg font-bold">Timesheet</h1>
        <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                location.pathname === link.to ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-6">
        <header className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
          <div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-xs uppercase text-slate-500">{user?.role}</p>
          </div>
          <Button
            onClick={() => {
              setUser(null);
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </header>
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
