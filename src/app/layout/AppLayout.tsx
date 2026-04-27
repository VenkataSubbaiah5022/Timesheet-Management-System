import { useMemo, useState, type PropsWithChildren } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "../../components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger } from "../../components/ui/sidebar";
import { useAuthStore } from "../../features/auth/store";
import { appBasePath } from "../../features/auth/routes";
import { NotificationsContent } from "../../features/notifications/NotificationsContent";
import { CommandPalette } from "../../features/command/CommandPalette";
import { Bell } from "lucide-react";
import { appendActivity } from "../../services/activityLog";

type HeaderMeta = { title: string; subtitle: string };
type Crumb = { label: string; href: string };

function headerMeta(pathname: string): HeaderMeta {
  if (pathname.endsWith("/dashboard")) return { title: "Dashboard", subtitle: "Overview of timesheet and payroll" };
  if (pathname.endsWith("/employees")) return { title: "Employees", subtitle: "Manage team members and default rates" };
  if (pathname.endsWith("/attendance")) return { title: "Attendance", subtitle: "Review sessions, approvals, and overrides" };
  if (pathname.endsWith("/reports")) return { title: "Reports", subtitle: "Generate payroll and productivity insights" };
  if (pathname.endsWith("/activity")) return { title: "Activity Log", subtitle: "Audit key actions across the workspace" };
  if (pathname.endsWith("/profile")) return { title: "Profile", subtitle: "Manage your identity and account security" };
  if (pathname.endsWith("/notifications")) return { title: "Notifications", subtitle: "Track operational alerts and updates" };
  if (pathname.endsWith("/settings")) return { title: "Settings", subtitle: "Configure policy, modules, and preferences" };
  if (pathname.endsWith("/clock")) return { title: "Time Clock", subtitle: "Clock in, breaks, and live work status" };
  if (pathname.endsWith("/timesheet")) return { title: "My Timesheet", subtitle: "Review your logged sessions and totals" };
  if (pathname.endsWith("/leaves")) return { title: "Leave Management", subtitle: "Track leave policy and leave workflows" };
  return { title: "Workspace", subtitle: "Timesheet management operations" };
}

function breadcrumbs(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [];
  let acc = "";
  return parts.map((part) => {
    acc += `/${part}`;
    const label = part
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, href: acc };
  });
}

export function AppLayout({ children }: PropsWithChildren) {
  const { user, setUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const meta = useMemo(() => headerMeta(location.pathname), [location.pathname]);
  const crumbs = useMemo(() => breadcrumbs(location.pathname), [location.pathname]);
  const basePath = user ? appBasePath(user.role) : "/employee";
  const onLogout = () => {
    appendActivity({ action: "Signed out", detail: user?.email });
    setUser(null);
    navigate("/login");
  };

  return (
    <SidebarProvider defaultOpen>
      <CommandPalette />
      <AppSidebar onLogout={onLogout} />
      <SidebarRail />
      <SidebarInset className="bg-background">
        <header className="glass-header sticky top-0 z-20 flex items-center justify-between px-4 py-3 shadow-premium md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="text-foreground" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{meta.title}</p>
              <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                {crumbs.map((c, idx) => (
                  <span key={c.href} className="inline-flex items-center gap-1">
                    {idx > 0 ? <span>/</span> : null}
                    <span className="truncate">{c.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
              aria-label="Search shortcut"
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
              }}
            >
              Search
              <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">K</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Open notifications"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="size-4" />
            </Button>
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </header>
        <main className="p-4 text-foreground md:p-6">
          <div key={location.pathname} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
            {children ?? <Outlet />}
          </div>
        </main>

        <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <NotificationsContent compact className="flex-1" />
            <div className="p-4 pt-0">
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate(`${basePath}/notifications`)}>
                Open notification center
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </SidebarInset>
    </SidebarProvider>
  );
}
