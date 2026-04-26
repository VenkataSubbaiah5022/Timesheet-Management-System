import { useState, type PropsWithChildren } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppSidebar } from "../../components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger } from "../../components/ui/sidebar";
import { useAuthStore } from "../../features/auth/store";
import { NotificationsContent } from "../../features/notifications/NotificationsContent";
import { ThemeToggle } from "../../features/theme/ThemeToggle";
import { Bell } from "lucide-react";
import { appendActivity } from "../../services/activityLog";

export function AppLayout({ children }: PropsWithChildren) {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarRail />
      <SidebarInset className="bg-background p-4 md:p-6">
        <header className="mb-4 flex items-center justify-between rounded-lg border border-slate-200/90 bg-white p-3 shadow-sm dark:border-slate-800/50 dark:bg-card">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="text-foreground" />
            {user?.avatarDataUrl ? (
              <img src={user.avatarDataUrl} alt="" className="size-9 shrink-0 rounded-full border border-slate-200/90 object-cover dark:border-slate-800/50" />
            ) : null}
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{user?.name}</p>
              <p className="text-xs uppercase text-muted-foreground">{user?.role}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Open notifications"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                appendActivity({ action: "Signed out", detail: user?.email });
                setUser(null);
                navigate("/login");
              }}
            >
              Logout
            </Button>
          </div>
        </header>
        <main className="text-foreground">
          {children ?? <Outlet />}
        </main>

        <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <NotificationsContent compact className="flex-1" />
          </SheetContent>
        </Sheet>
      </SidebarInset>
    </SidebarProvider>
  );
}
