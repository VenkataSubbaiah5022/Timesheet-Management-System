import { useMemo, useState, type PropsWithChildren } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "../../components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger } from "../../components/ui/sidebar";
import { useAuthStore } from "../../features/auth/store";
import { appBasePath } from "../../features/auth/routes";
import { NotificationsContent } from "../../features/notifications/NotificationsContent";
import { Bell } from "lucide-react";
import { appendActivity } from "../../services/activityLog";

type HeaderMeta = { title: string; subtitle: string };

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

export function AppLayout({ children }: PropsWithChildren) {
  const { user, setUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const meta = useMemo(() => headerMeta(location.pathname), [location.pathname]);
  const basePath = user ? appBasePath(user.role) : "/employee";
  const onLogout = () => {
    appendActivity({ action: "Signed out", detail: user?.email });
    setUser(null);
    navigate("/login");
  };

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar onLogout={onLogout} />
      <SidebarRail />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/90 bg-card/95 px-4 py-3 shadow-sm backdrop-blur-sm md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="text-foreground" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{meta.title}</p>
              <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
          {children ?? <Outlet />}
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
