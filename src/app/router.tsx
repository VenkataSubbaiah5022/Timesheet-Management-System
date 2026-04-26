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

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/admin",
    element: (
      <ProtectedRoute role="admin">
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard", element: <AdminDashboardPage /> },
      { path: "employees", element: <EmployeesPage /> },
      { path: "attendance", element: <AttendancePage /> },
      { path: "reports", element: <ReportsPage /> },
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
    ],
  },
  {
    path: "/employee",
    element: (
      <ProtectedRoute role="employee">
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "clock", element: <ClockPage /> },
      { path: "timesheet", element: <MyTimesheetPage /> },
      { index: true, element: <Navigate to="/employee/clock" replace /> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
