import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Clock3,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldUser,
  UserRound,
  Users,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { appBasePath } from "../features/auth/routes";
import { useAuthStore } from "../features/auth/store";
import { selectUnreadCount, useNotificationsStore } from "../features/notifications/store";
import { useWorkspaceSettingsStore } from "../services/workspaceSettingsStore";
import type { Role } from "../shared/types/domain";
import type { FeatureFlags } from "../shared/types/workspace";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";

type MenuItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  feature?: keyof FeatureFlags;
};

type MenuSection = {
  label: "Management" | "Analytics" | "Settings";
  items: MenuItem[];
};

function navSections(role: Role, unread: number): MenuSection[] {
  const p = appBasePath(role);

  if (role === "employee") {
    return [
      {
        label: "Management",
        items: [
          { to: `${p}/clock`, label: "Clock In / Out", icon: Clock3 },
          { to: `${p}/timesheet`, label: "My Timesheet", icon: ReceiptText },
          { to: `${p}/leaves`, label: "Leave Management", icon: BriefcaseBusiness, badge: "New", feature: "moduleLeaves" },
        ],
      },
      {
        label: "Analytics",
        items: [{ to: `${p}/timesheet`, label: "Work Insights", icon: BarChart3, feature: "moduleReports" }],
      },
      {
        label: "Settings",
        items: [
          { to: `${p}/profile`, label: "Profile", icon: UserRound },
          {
            to: `${p}/notifications`,
            label: "Notifications",
            icon: Bell,
            badge: unread > 0 ? String(unread > 9 ? "9+" : unread) : undefined,
          },
          { to: `${p}/settings`, label: "Settings", icon: Settings },
        ],
      },
    ];
  }

  const management: MenuItem[] =
    role === "admin"
      ? [
          { to: `${p}/dashboard`, label: "Dashboard", icon: LayoutDashboard, feature: "moduleDashboard" },
          { to: `${p}/employees`, label: "Employees", icon: Users, feature: "moduleEmployees" },
          { to: `${p}/attendance`, label: "Attendance", icon: Clock3, feature: "moduleAttendance" },
          {
            to: `${p}/leaves`,
            label: "Leave Management",
            icon: BriefcaseBusiness,
            badge: "New",
            feature: "moduleLeaves",
          },
        ]
      : [
          { to: `${p}/dashboard`, label: "Dashboard", icon: LayoutDashboard, feature: "moduleDashboard" },
          { to: `${p}/attendance`, label: "Attendance", icon: Clock3, feature: "moduleAttendance" },
          {
            to: `${p}/leaves`,
            label: "Leave Management",
            icon: BriefcaseBusiness,
            badge: "New",
            feature: "moduleLeaves",
          },
        ];

  return [
    { label: "Management", items: management },
    {
      label: "Analytics",
      items: [
        { to: `${p}/reports`, label: "Reports", icon: BarChart3, feature: "moduleReports" },
        { to: `${p}/activity`, label: "Activity Log", icon: ScrollText, feature: "moduleActivityLog" },
      ],
    },
    {
      label: "Settings",
      items: [
        { to: `${p}/profile`, label: "Profile", icon: UserRound },
        {
          to: `${p}/notifications`,
          label: "Notifications",
          icon: Bell,
          badge: unread > 0 ? String(unread > 9 ? "9+" : unread) : undefined,
        },
        { to: `${p}/settings`, label: "Settings", icon: Settings },
      ],
    },
  ];
}

export function AppSidebar({ onLogout }: { onLogout: () => void }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const unread = useNotificationsStore(selectUnreadCount);
  const features = useWorkspaceSettingsStore((s) => s.settings.features);
  const rawSections = user ? navSections(user.role, unread) : navSections("employee", unread);
  const sections = rawSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.feature || features[item.feature]),
    }))
    .filter((section) => section.items.length > 0);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isRouteActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Sidebar collapsible="icon" variant="floating" className="pt-2">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <ShieldUser className="h-5 w-5 text-sidebar-foreground/80" />
          {!collapsed && <p className="font-semibold text-sidebar-foreground">Timesheet Pro</p>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={`${section.label}-${item.label}`}>
                    <SidebarMenuButton
                      asChild
                      isActive={isRouteActive(item.to)}
                      tooltip={item.label}
                      className="rounded-full border border-transparent data-[active=true]:border-primary/35 data-[active=true]:bg-primary/12 data-[active=true]:text-primary data-[active=true]:shadow-premium"
                    >
                      <NavLink to={item.to}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                        {!collapsed && item.badge && (
                          <span className="ml-auto rounded-full bg-sidebar-accent px-2 py-0.5 text-[10px] font-semibold text-sidebar-accent-foreground">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="glass-panel rounded-xl border border-sidebar-border/70 p-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`${appBasePath(user?.role ?? "employee")}/profile`)}
                className="flex size-8 items-center justify-center rounded-full border border-sidebar-border/70 bg-sidebar text-xs font-semibold text-sidebar-foreground"
                aria-label="Open profile"
              >
                {(user?.name ?? "U")
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </button>
              <Button type="button" size="icon-xs" variant="ghost" onClick={onLogout} aria-label="Logout">
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sidebar-border/70 bg-sidebar text-xs font-semibold text-sidebar-foreground">
                  {user?.avatarDataUrl ? (
                    <img src={user.avatarDataUrl} alt="" className="size-full object-cover" />
                  ) : (
                    (user?.name ?? "U")
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-sidebar-foreground/60">{user?.role}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Button type="button" size="xs" variant="ghost" onClick={() => navigate(`${appBasePath(user?.role ?? "employee")}/profile`)}>
                  Profile
                </Button>
                <Button type="button" size="xs" variant="ghost" onClick={onLogout}>
                  <LogOut className="mr-1 size-3.5" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
