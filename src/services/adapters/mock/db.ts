import dayjs from "dayjs";
import {
  defaultNotificationPrefs,
  type AttendanceEntry,
  type Employee,
  type LeaveRequest,
  type Role,
  type User,
} from "../../../shared/types/domain";

export interface MockDb {
  users: User[];
  employees: Employee[];
  attendance: AttendanceEntry[];
  leaves: LeaveRequest[];
}

export const MOCK_DB_KEY = "timesheet-db-v2";

function normalizeUserLoose(raw: Record<string, unknown>): User {
  const prefsRaw = raw.notificationPrefs;
  const mergedPrefs =
    typeof prefsRaw === "object" && prefsRaw !== null && !Array.isArray(prefsRaw)
      ? { ...defaultNotificationPrefs(), ...(prefsRaw as Record<string, boolean>) }
      : defaultNotificationPrefs();
  return {
    id: String(raw.id),
    name: String(raw.name),
    email: String(raw.email),
    role: raw.role as Role,
    passwordMock: String(raw.passwordMock),
    phone: typeof raw.phone === "string" ? raw.phone : "",
    avatarDataUrl: typeof raw.avatarDataUrl === "string" ? raw.avatarDataUrl : null,
    lastLoginAt: typeof raw.lastLoginAt === "string" ? raw.lastLoginAt : null,
    notificationPrefs: {
      emailApprovals: Boolean(mergedPrefs.emailApprovals),
      emailWeeklyDigest: Boolean(mergedPrefs.emailWeeklyDigest),
      pushBrowser: Boolean(mergedPrefs.pushBrowser),
    },
    mockSessionEpoch: typeof raw.mockSessionEpoch === "number" ? raw.mockSessionEpoch : 0,
  };
}

const seedDb: MockDb = {
  users: [
    {
      id: "u-admin",
      name: "Admin User",
      email: "admin@demo.com",
      role: "admin",
      passwordMock: "admin123",
      phone: "+1 (555) 010-1000",
      avatarDataUrl: null,
      lastLoginAt: null,
      notificationPrefs: defaultNotificationPrefs(),
      mockSessionEpoch: 0,
    },
    {
      id: "u-emp-1",
      name: "Arjun Patel",
      email: "arjun@demo.com",
      role: "employee",
      passwordMock: "emp123",
      phone: "+91 98765 43210",
      avatarDataUrl: null,
      lastLoginAt: null,
      notificationPrefs: defaultNotificationPrefs(),
      mockSessionEpoch: 0,
    },
    {
      id: "u-emp-2",
      name: "Neha Sharma",
      email: "neha@demo.com",
      role: "employee",
      passwordMock: "emp123",
      phone: "+91 91234 56780",
      avatarDataUrl: null,
      lastLoginAt: null,
      notificationPrefs: defaultNotificationPrefs(),
      mockSessionEpoch: 0,
    },
    {
      id: "u-manager",
      name: "Riya Kapoor",
      email: "manager@demo.com",
      role: "manager",
      passwordMock: "manager123",
      phone: "+1 (555) 010-2200",
      avatarDataUrl: null,
      lastLoginAt: null,
      notificationPrefs: defaultNotificationPrefs(),
      mockSessionEpoch: 0,
    },
  ],
  employees: [
    { id: "e-1", userId: "u-emp-1", status: "active", hourlyRate: 350, joinedAt: dayjs().subtract(10, "month").toISOString() },
    { id: "e-2", userId: "u-emp-2", status: "active", hourlyRate: 420, joinedAt: dayjs().subtract(6, "month").toISOString() },
  ],
  attendance: [
    {
      id: "a-1",
      employeeId: "e-1",
      clockInAt: dayjs().subtract(1, "day").hour(9).minute(5).toISOString(),
      clockOutAt: dayjs().subtract(1, "day").hour(18).minute(0).toISOString(),
      breakMinutes: 45,
      breakStartAt: null,
      approvalStatus: "pending",
      notes: "",
    },
    {
      id: "a-2",
      employeeId: "e-2",
      clockInAt: dayjs().subtract(1, "day").hour(10).minute(0).toISOString(),
      clockOutAt: dayjs().subtract(1, "day").hour(19).minute(10).toISOString(),
      breakMinutes: 30,
      breakStartAt: null,
      approvalStatus: "pending",
      notes: "",
    },
  ],
  leaves: [
    {
      id: "l-1",
      employeeId: "e-1",
      type: "Sick",
      fromDate: dayjs().add(2, "day").startOf("day").toISOString(),
      toDate: dayjs().add(3, "day").startOf("day").toISOString(),
      reason: "Flu recovery and rest.",
      attachmentName: "medical-note.pdf",
      attachmentDataUrl: null,
      status: "pending",
      appliedAt: dayjs().subtract(1, "day").toISOString(),
      updatedAt: dayjs().subtract(1, "day").toISOString(),
      reviewedByUserId: null,
      reviewerComment: "",
    },
    {
      id: "l-2",
      employeeId: "e-2",
      type: "Annual",
      fromDate: dayjs().subtract(10, "day").startOf("day").toISOString(),
      toDate: dayjs().subtract(8, "day").startOf("day").toISOString(),
      reason: "Family travel.",
      attachmentName: null,
      attachmentDataUrl: null,
      status: "approved",
      appliedAt: dayjs().subtract(15, "day").toISOString(),
      updatedAt: dayjs().subtract(13, "day").toISOString(),
      reviewedByUserId: "u-admin",
      reviewerComment: "Approved. Enjoy your break.",
    },
  ],
};

function normalizeAttendance(entries: AttendanceEntry[]): AttendanceEntry[] {
  return entries.map((e) => ({
    ...e,
    breakStartAt: e.breakStartAt ?? null,
    breakMinutes: typeof e.breakMinutes === "number" ? e.breakMinutes : 0,
    approvalStatus: e.approvalStatus ?? "pending",
    notes: e.notes ?? "",
  }));
}

function normalizeLeaves(entries: LeaveRequest[]): LeaveRequest[] {
  return entries.map((l) => ({
    ...l,
    attachmentName: l.attachmentName ?? null,
    attachmentDataUrl: l.attachmentDataUrl ?? null,
    status: l.status ?? "pending",
    reviewedByUserId: l.reviewedByUserId ?? null,
    reviewerComment: l.reviewerComment ?? "",
  }));
}

function mergeMissingSeedUsers(parsed: MockDb): MockDb {
  const emails = new Set(parsed.users.map((u) => u.email));
  const additions = seedDb.users.filter((u) => !emails.has(u.email));
  if (additions.length === 0) return parsed;
  return { ...parsed, users: [...parsed.users, ...additions] };
}

export function readDb(): MockDb {
  const raw = localStorage.getItem(MOCK_DB_KEY);
  if (!raw) {
    const initial: MockDb = {
      ...seedDb,
      attendance: seedDb.attendance.map((a) => ({ ...a })),
      leaves: seedDb.leaves.map((l) => ({ ...l })),
      users: seedDb.users.map((u) => ({ ...u, notificationPrefs: { ...u.notificationPrefs } })),
    };
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(initial));
    return initial;
  }
  const parsed = JSON.parse(raw) as MockDb;
  parsed.attendance = normalizeAttendance(parsed.attendance ?? []);
  parsed.leaves = normalizeLeaves(parsed.leaves ?? []);
  parsed.users = (parsed.users ?? []).map((u) => normalizeUserLoose(u as unknown as Record<string, unknown>));
  const merged = mergeMissingSeedUsers(parsed);
  if (merged !== parsed) writeDb(merged);
  return merged;
}

export function writeDb(next: MockDb): void {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(next));
}
