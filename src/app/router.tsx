import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { AdminDashboardPage } from "../features/admin/AdminDashboardPage";
import { AttendancePage } from "../features/admin/AttendancePage";
import { EmployeesPage } from "../features/admin/EmployeesPage";
import { ReportsPage } from "../features/admin/ReportsPage";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { ClockPage } from "../features/employee/ClockPage";
import { MyTimesheetPage } from "../features/employee/MyTimesheetPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { FeatureGate } from "../features/settings/FeatureGate";
import { SettingsPage } from "../features/settings/SettingsPage";
import { ActivityLogsPage } from "../features/shared/ActivityLogsPage";
import { SimpleInfoPage } from "../features/shared/SimpleInfoPage";

const adminShell = (
  <ProtectedRoute roles={["admin"]}>
    <AppLayout />
  </ProtectedRoute>
);

const managerShell = (
  <ProtectedRoute roles={["manager"]}>
    <AppLayout />
  </ProtectedRoute>
);

const employeeShell = (
  <ProtectedRoute roles={["employee"]}>
    <AppLayout />
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/admin",
    element: adminShell,
    children: [
      {
        path: "dashboard",
        element: (
          <FeatureGate feature="moduleDashboard">
            <AdminDashboardPage />
          </FeatureGate>
        ),
      },
      {
        path: "employees",
        element: (
          <FeatureGate feature="moduleEmployees">
            <EmployeesPage />
          </FeatureGate>
        ),
      },
      {
        path: "attendance",
        element: (
          <FeatureGate feature="moduleAttendance">
            <AttendancePage />
          </FeatureGate>
        ),
      },
      {
        path: "reports",
        element: (
          <FeatureGate feature="moduleReports">
            <ReportsPage />
          </FeatureGate>
        ),
      },
      {
        path: "activity",
        element: (
          <FeatureGate feature="moduleActivityLog">
            <ActivityLogsPage />
          </FeatureGate>
        ),
      },
      {
        path: "leaves",
        element: (
          <FeatureGate feature="moduleLeaves">
            <SimpleInfoPage title="Leave Management" description="Approve or reject employee leave requests, and monitor upcoming absences." />
          </FeatureGate>
        ),
      },
      { path: "profile", element: <ProfilePage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
    ],
  },
  {
    path: "/manager",
    element: managerShell,
    children: [
      {
        path: "dashboard",
        element: (
          <FeatureGate feature="moduleDashboard">
            <AdminDashboardPage />
          </FeatureGate>
        ),
      },
      {
        path: "attendance",
        element: (
          <FeatureGate feature="moduleAttendance">
            <AttendancePage />
          </FeatureGate>
        ),
      },
      {
        path: "reports",
        element: (
          <FeatureGate feature="moduleReports">
            <ReportsPage />
          </FeatureGate>
        ),
      },
      {
        path: "activity",
        element: (
          <FeatureGate feature="moduleActivityLog">
            <ActivityLogsPage />
          </FeatureGate>
        ),
      },
      {
        path: "leaves",
        element: (
          <FeatureGate feature="moduleLeaves">
            <SimpleInfoPage title="Leave Management" description="Review team leave requests and upcoming absences." />
          </FeatureGate>
        ),
      },
      { path: "profile", element: <ProfilePage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { index: true, element: <Navigate to="/manager/dashboard" replace /> },
    ],
  },
  {
    path: "/employee",
    element: employeeShell,
    children: [
      { path: "clock", element: <ClockPage /> },
      { path: "timesheet", element: <MyTimesheetPage /> },
      {
        path: "leaves",
        element: (
          <FeatureGate feature="moduleLeaves">
            <SimpleInfoPage title="Leave Management" description="Apply for leave, view request history, and track approval status." />
          </FeatureGate>
        ),
      },
      { path: "profile", element: <ProfilePage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { index: true, element: <Navigate to="/employee/clock" replace /> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
