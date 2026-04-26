export type Role = "admin" | "manager" | "employee";

export interface NotificationPrefs {
  emailApprovals: boolean;
  emailWeeklyDigest: boolean;
  pushBrowser: boolean;
}

export function defaultNotificationPrefs(): NotificationPrefs {
  return {
    emailApprovals: true,
    emailWeeklyDigest: false,
    pushBrowser: true,
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordMock: string;
  phone: string;
  avatarDataUrl: string | null;
  lastLoginAt: string | null;
  notificationPrefs: NotificationPrefs;
  /** Mock: bumped when user revokes other sessions. */
  mockSessionEpoch: number;
}

export interface Employee {
  id: string;
  userId: string;
  status: "active" | "inactive";
  hourlyRate: number;
  joinedAt: string;
}

export interface AttendanceEntry {
  id: string;
  employeeId: string;
  clockInAt: string;
  clockOutAt: string | null;
  /** Cumulative paid break minutes (completed break segments). */
  breakMinutes: number;
  /** When non-null, employee is currently on break for this open session. */
  breakStartAt: string | null;
  /** Approval status for payroll/manager workflow. */
  approvalStatus: "pending" | "approved" | "rejected";
  /** Optional employee/admin notes attached to this entry. */
  notes: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  avatarDataUrl: string | null;
  lastLoginAt: string | null;
  notificationPrefs: NotificationPrefs;
  mockSessionEpoch: number;
}

export interface ProfilePayload extends SessionUser {
  employeeJoinedAt: string | null;
  hourlyRate: number | null;
}
