import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Clock3,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldUser,
  UserRound,
  Users,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { appBasePath } from "../features/auth/routes";
import { useAuthStore } from "../features/auth/store";
import { selectUnreadCount, useNotificationsStore } from "../features/notifications/store";
import { useWorkspaceSettingsStore } from "../services/workspaceSettingsStore";
import type { Role } from "../shared/types/domain";
import type { FeatureFlags } from "../shared/types/workspace";
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

export function AppSidebar() {
  const user = useAuthStore((s) => s.user);
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
    <Sidebar collapsible="icon">
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
                    <SidebarMenuButton asChild isActive={isRouteActive(item.to)} tooltip={item.label}>
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
        <p className="text-xs uppercase tracking-wide text-sidebar-foreground/60">
          {collapsed ? user?.role?.slice(0, 1) : `${user?.role} panel`}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
