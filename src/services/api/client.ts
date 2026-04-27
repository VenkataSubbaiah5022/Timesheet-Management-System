import dayjs from "dayjs";
import {
  defaultNotificationPrefs,
  type AttendanceEntry,
  type Employee,
  type LeaveRow,
  type LeaveStatus,
  type NotificationPrefs,
  type ProfilePayload,
  type SessionUser,
  type User,
} from "../../shared/types/domain";
import { calcPayable } from "../../shared/utils/calc";
import type { DurationIssue, ShiftDayStatus } from "../../shared/utils/shift";
import {
  autoClockOutIfStale,
  getDurationIssue,
  getLateInfo,
  getShiftDayStatus,
  netWorkedHours,
} from "../../shared/utils/shift";
import type { MockDb } from "../adapters/mock/db";
import { readDb, writeDb } from "../adapters/mock/db";
import { appendActivity } from "../activityLog";
import { getWorkspaceSettings } from "../workspaceSettingsStore";

const wait = async () => new Promise((resolve) => setTimeout(resolve, 120));
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function userToSession(u: User): SessionUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    avatarDataUrl: u.avatarDataUrl,
    lastLoginAt: u.lastLoginAt,
    notificationPrefs: u.notificationPrefs,
    mockSessionEpoch: u.mockSessionEpoch,
  };
}

function employeeDisplayName(db: MockDb, employeeId: string): string {
  const employee = db.employees.find((e) => e.id === employeeId);
  if (!employee) return employeeId;
  const user = db.users.find((u) => u.id === employee.userId);
  return user?.name ?? employeeId;
}

function persistAutoClockOuts(db: ReturnType<typeof readDb>): typeof db {
  const nextAttendance = db.attendance.map((e) => autoClockOutIfStale(e, dayjs()));
  if (JSON.stringify(nextAttendance) === JSON.stringify(db.attendance)) return db;
  const next = { ...db, attendance: nextAttendance };
  writeDb(next);
  return next;
}

function mapAttendanceRow(entry: AttendanceEntry, employee: Employee, employeeName: string) {
  const now = dayjs();
  const isClosed = Boolean(entry.clockOutAt);
  const workedHours = isClosed ? netWorkedHours(entry, dayjs(entry.clockOutAt!)) : netWorkedHours(entry, now);
  const late = getLateInfo(entry.clockInAt);
  const durationIssue: DurationIssue = getDurationIssue(workedHours, isClosed);
  const shiftStatus: ShiftDayStatus = getShiftDayStatus(entry, workedHours);
  return {
    ...entry,
    employeeName,
    hourlyRate: employee.hourlyRate,
    workedHours,
    payableAmount: calcPayable(entry, employee),
    isLate: late.isLate,
    lateByMinutes: late.lateByMinutes,
    durationIssue,
    shiftStatus,
    onBreak: Boolean(entry.breakStartAt && !entry.clockOutAt),
  };
}

export interface AttendanceRow extends AttendanceEntry {
  employeeName: string;
  hourlyRate: number;
  workedHours: number;
  payableAmount: number;
  isLate: boolean;
  lateByMinutes: number;
  durationIssue: DurationIssue;
  shiftStatus: ShiftDayStatus;
  onBreak: boolean;
}

export interface AttendanceOverrideInput {
  entryId: string;
  clockInAt: string;
  clockOutAt: string | null;
  breakMinutes: number;
  notes: string;
}

export interface ApplyLeaveInput {
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  attachmentName?: string | null;
  attachmentDataUrl?: string | null;
}

export interface ReviewLeaveInput {
  leaveId: string;
  status: "approved" | "rejected";
  reviewerComment?: string;
}

function asDay(dateIso: string) {
  return dayjs(dateIso).startOf("day");
}

function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  const aS = asDay(aFrom);
  const aE = asDay(aTo);
  const bS = asDay(bFrom);
  const bE = asDay(bTo);
  return !(aE.isBefore(bS, "day") || bE.isBefore(aS, "day"));
}

function leaveDaysInclusive(fromDate: string, toDate: string): number {
  return asDay(toDate).diff(asDay(fromDate), "day") + 1;
}

function mapLeaveRow(db: MockDb, leaveId: string): LeaveRow {
  const leave = db.leaves.find((l) => l.id === leaveId);
  if (!leave) throw new Error("Leave request not found");
  const emp = db.employees.find((e) => e.id === leave.employeeId);
  const user = emp ? db.users.find((u) => u.id === emp.userId) : null;
  return {
    ...leave,
    employeeName: user?.name ?? leave.employeeId,
    employeeUserId: user?.id ?? "",
  };
}

export const apiClient = {
  async login(email: string, password: string): Promise<SessionUser> {
    await wait();
    const db = readDb();
    const user = db.users.find((u) => u.email === email && u.passwordMock === password);
    if (!user) throw new Error("Invalid credentials");
    user.lastLoginAt = dayjs().toISOString();
    writeDb(db);
    return userToSession(user);
  },

  async getProfile(userId: string): Promise<ProfilePayload> {
    await wait();
    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    const emp = db.employees.find((e) => e.userId === userId);
    const base = userToSession(user);
    return {
      ...base,
      employeeJoinedAt: emp?.joinedAt ?? null,
      hourlyRate: emp?.hourlyRate ?? null,
    };
  },

  async updateProfile(userId: string, input: { name: string; email: string; phone: string }): Promise<SessionUser> {
    await wait();
    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    const nextEmail = input.email.trim().toLowerCase();
    const taken = db.users.some((u) => u.id !== userId && u.email.trim().toLowerCase() === nextEmail);
    if (taken) throw new Error("Another account already uses this email.");
    user.name = input.name.trim();
    user.email = input.email.trim();
    user.phone = input.phone.trim();
    writeDb(db);
    appendActivity({ action: "Profile updated", detail: user.email });
    return userToSession(user);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await wait();
    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    if (user.passwordMock !== currentPassword) throw new Error("Current password is incorrect.");
    if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      throw new Error("New password must include at least one letter and one number.");
    }
    if (newPassword === currentPassword) throw new Error("Choose a password different from your current one.");
    user.passwordMock = newPassword;
    writeDb(db);
    appendActivity({
      action: "Password changed",
      notify: { title: "Security", body: "Your password was updated." },
    });
  },

  async updateAvatar(userId: string, dataUrl: string | null): Promise<SessionUser> {
    await wait();
    const maxChars = 420_000;
    if (dataUrl && dataUrl.length > maxChars) {
      throw new Error("Image is too large. Use a smaller photo (try under ~300KB).");
    }
    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.avatarDataUrl = dataUrl;
    writeDb(db);
    appendActivity({ action: dataUrl ? "Profile photo updated" : "Profile photo removed" });
    return userToSession(user);
  },

  async updateNotificationPreferences(userId: string, prefs: Partial<NotificationPrefs>): Promise<SessionUser> {
    await wait();
    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.notificationPrefs = { ...user.notificationPrefs, ...prefs };
    writeDb(db);
    appendActivity({ action: "Notification preferences updated" });
    return userToSession(user);
  },

  async revokeAllSessionsMock(userId: string): Promise<{ mockSessionEpoch: number }> {
    await wait();
    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.mockSessionEpoch += 1;
    writeDb(db);
    appendActivity({
      action: "Revoked other sessions (mock)",
      detail: "Simulated sign-out on other devices",
      notify: { title: "Sessions", body: "Other devices were signed out (demo)." },
    });
    return { mockSessionEpoch: user.mockSessionEpoch };
  },

  async employees(): Promise<(Employee & { name: string; email: string })[]> {
    await wait();
    const db = readDb();
    return db.employees.map((emp) => {
      const user = db.users.find((u) => u.id === emp.userId)!;
      return { ...emp, name: user.name, email: user.email };
    });
  },

  async upsertEmployee(input: { id?: string; name: string; email: string; hourlyRate: number; status: "active" | "inactive" }): Promise<void> {
    await wait();
    const db = readDb();
    if (input.id) {
      const employee = db.employees.find((e) => e.id === input.id);
      if (!employee) throw new Error("Employee not found");
      employee.hourlyRate = input.hourlyRate;
      employee.status = input.status;
      const user = db.users.find((u) => u.id === employee.userId)!;
      user.name = input.name;
      user.email = input.email;
    } else {
      const userId = id("u");
      db.users.push({
        id: userId,
        name: input.name,
        email: input.email,
        role: "employee",
        passwordMock: "emp123",
        phone: "",
        avatarDataUrl: null,
        lastLoginAt: null,
        notificationPrefs: defaultNotificationPrefs(),
        mockSessionEpoch: 0,
      });
      const rate =
        input.hourlyRate > 0 ? input.hourlyRate : getWorkspaceSettings().defaults.defaultHourlyRate;
      db.employees.push({ id: id("e"), userId, hourlyRate: rate, status: input.status, joinedAt: dayjs().toISOString() });
    }
    writeDb(db);
    appendActivity({
      action: input.id ? "Employee updated" : "Employee created",
      detail: input.name,
      notify: { title: input.id ? "Employee updated" : "New employee", body: input.name },
    });
  },

  async deleteEmployee(employeeId: string): Promise<void> {
    await wait();
    const db = readDb();
    const employee = db.employees.find((e) => e.id === employeeId);
    if (!employee) throw new Error("Employee not found");
    const user = db.users.find((u) => u.id === employee.userId);
    const label = user?.name ?? employeeId;
    db.employees = db.employees.filter((e) => e.id !== employeeId);
    db.users = db.users.filter((u) => u.id !== employee.userId);
    db.attendance = db.attendance.filter((a) => a.employeeId !== employeeId);
    db.leaves = db.leaves.filter((l) => l.employeeId !== employeeId);
    writeDb(db);
    appendActivity({
      action: "Employee removed",
      detail: label,
      notify: { title: "Employee removed", body: label },
    });
  },

  async updateEmployeeStatus(employeeId: string, status: "active" | "inactive"): Promise<void> {
    await wait();
    const db = readDb();
    const employee = db.employees.find((e) => e.id === employeeId);
    if (!employee) throw new Error("Employee not found");
    employee.status = status;
    writeDb(db);
    appendActivity({
      action: `Employee marked ${status}`,
      detail: employeeDisplayName(db, employeeId),
    });
  },

  async attendance(): Promise<AttendanceRow[]> {
    await wait();
    const db = persistAutoClockOuts(readDb());
    return db.attendance.map((entry) => {
      const employee = db.employees.find((e) => e.id === entry.employeeId)!;
      const user = db.users.find((u) => u.id === employee.userId)!;
      return mapAttendanceRow(entry, employee, user.name);
    });
  },

  async myAttendance(userId: string): Promise<AttendanceRow[]> {
    const db = persistAutoClockOuts(readDb());
    const employee = db.employees.find((e) => e.userId === userId);
    if (!employee) return [];
    const rows = await this.attendance();
    return rows.filter((r) => r.employeeId === employee.id);
  },

  async clockIn(userId: string): Promise<void> {
    await wait();
    let db = persistAutoClockOuts(readDb());
    const employee = db.employees.find((e) => e.userId === userId);
    if (!employee) throw new Error("Employee not found");
    const openEntry = db.attendance.find((a) => a.employeeId === employee.id && !a.clockOutAt);
    if (openEntry) throw new Error("You already have an active session. Clock out or wait for auto clock-out.");
    db.attendance.push({
      id: id("a"),
      employeeId: employee.id,
      clockInAt: dayjs().toISOString(),
      clockOutAt: null,
      breakMinutes: 0,
      breakStartAt: null,
      approvalStatus: "pending",
      notes: "",
    });
    writeDb(db);
    appendActivity({ action: "Clock in", detail: employeeDisplayName(db, employee.id) });
  },

  async clockOut(userId: string): Promise<void> {
    await wait();
    const db = readDb();
    const employee = db.employees.find((e) => e.userId === userId);
    if (!employee) throw new Error("Employee not found");
    const openEntry = db.attendance.find((a) => a.employeeId === employee.id && !a.clockOutAt);
    if (!openEntry) throw new Error("No active session");
    const now = dayjs();
    if (openEntry.breakStartAt) {
      const br = dayjs(openEntry.breakStartAt);
      openEntry.breakMinutes += Math.max(now.diff(br, "minute"), 0);
      openEntry.breakStartAt = null;
    }
    openEntry.clockOutAt = now.toISOString();
    openEntry.approvalStatus = "pending";
    writeDb(db);
    appendActivity({ action: "Clock out", detail: employeeDisplayName(db, employee.id) });
  },

  async startBreak(userId: string): Promise<void> {
    await wait();
    const db = readDb();
    const employee = db.employees.find((e) => e.userId === userId);
    if (!employee) throw new Error("Employee not found");
    const openEntry = db.attendance.find((a) => a.employeeId === employee.id && !a.clockOutAt);
    if (!openEntry) throw new Error("Clock in before starting a break");
    if (openEntry.breakStartAt) throw new Error("A break is already in progress");
    openEntry.breakStartAt = dayjs().toISOString();
    writeDb(db);
    appendActivity({ action: "Break started", detail: employeeDisplayName(db, employee.id) });
  },

  async endBreak(userId: string): Promise<void> {
    await wait();
    const db = readDb();
    const employee = db.employees.find((e) => e.userId === userId);
    if (!employee) throw new Error("Employee not found");
    const openEntry = db.attendance.find((a) => a.employeeId === employee.id && !a.clockOutAt);
    if (!openEntry) throw new Error("No active session");
    if (!openEntry.breakStartAt) throw new Error("No break in progress");
    const br = dayjs(openEntry.breakStartAt);
    openEntry.breakMinutes += Math.max(dayjs().diff(br, "minute"), 0);
    openEntry.breakStartAt = null;
    writeDb(db);
    appendActivity({ action: "Break ended", detail: employeeDisplayName(db, employee.id) });
  },

  async setEntryApproval(entryId: string, status: "pending" | "approved" | "rejected"): Promise<void> {
    await wait();
    const db = readDb();
    const entry = db.attendance.find((a) => a.id === entryId);
    if (!entry) throw new Error("Entry not found");
    entry.approvalStatus = status;
    writeDb(db);
    const who = employeeDisplayName(db, entry.employeeId);
    appendActivity({
      action: `Timesheet ${status}`,
      detail: who,
      notify: { title: "Approval updated", body: `${who} — ${status}` },
    });
  },

  async updateEntryNotes(entryId: string, notes: string): Promise<void> {
    await wait();
    const db = readDb();
    const entry = db.attendance.find((a) => a.id === entryId);
    if (!entry) throw new Error("Entry not found");
    entry.notes = notes.trim();
    writeDb(db);
    appendActivity({
      action: "Timesheet notes updated",
      detail: employeeDisplayName(db, entry.employeeId),
    });
  },

  async overrideAttendance(input: AttendanceOverrideInput): Promise<void> {
    await wait();
    const db = readDb();
    const entry = db.attendance.find((a) => a.id === input.entryId);
    if (!entry) throw new Error("Entry not found");
    entry.clockInAt = input.clockInAt;
    entry.clockOutAt = input.clockOutAt;
    entry.breakMinutes = Math.max(input.breakMinutes, 0);
    entry.breakStartAt = null;
    entry.notes = input.notes.trim();
    entry.approvalStatus = "pending";
    writeDb(db);
    const who = employeeDisplayName(db, entry.employeeId);
    appendActivity({
      action: "Attendance overridden",
      detail: who,
      notify: { title: "Attendance overridden", body: who },
    });
  },

  async leaves(filters?: {
    employeeName?: string;
    status?: LeaveStatus | "all";
    type?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<LeaveRow[]> {
    await wait();
    const db = readDb();
    const qEmp = filters?.employeeName?.trim().toLowerCase() ?? "";
    const qType = filters?.type?.trim().toLowerCase() ?? "";
    const from = filters?.fromDate ? asDay(filters.fromDate) : null;
    const to = filters?.toDate ? asDay(filters.toDate) : null;
    return db.leaves
      .map((l) => mapLeaveRow(db, l.id))
      .filter((row) => {
        const empOk = !qEmp || row.employeeName.toLowerCase().includes(qEmp);
        const statusOk = !filters?.status || filters.status === "all" ? true : row.status === filters.status;
        const typeOk = !qType ? true : row.type.toLowerCase().includes(qType);
        const date = asDay(row.fromDate);
        const fromOk = from ? (date.isAfter(from, "day") || date.isSame(from, "day")) : true;
        const toOk = to ? (date.isBefore(to, "day") || date.isSame(to, "day")) : true;
        return empOk && statusOk && typeOk && fromOk && toOk;
      })
      .sort((a, b) => dayjs(b.appliedAt).valueOf() - dayjs(a.appliedAt).valueOf());
  },

  async myLeaves(userId: string): Promise<LeaveRow[]> {
    await wait();
    const db = readDb();
    const emp = db.employees.find((e) => e.userId === userId);
    if (!emp) return [];
    return db.leaves
      .filter((l) => l.employeeId === emp.id)
      .map((l) => mapLeaveRow(db, l.id))
      .sort((a, b) => dayjs(b.appliedAt).valueOf() - dayjs(a.appliedAt).valueOf());
  },

  async leaveBalance(userId: string): Promise<{ total: number; used: number; remaining: number; pending: number }> {
    await wait();
    const db = readDb();
    const emp = db.employees.find((e) => e.userId === userId);
    if (!emp) return { total: 0, used: 0, remaining: 0, pending: 0 };
    const total = getWorkspaceSettings().leave.maxDaysPerYear;
    const currentYear = dayjs().year();
    const mine = db.leaves.filter((l) => l.employeeId === emp.id && dayjs(l.fromDate).year() === currentYear);
    const used = mine.filter((l) => l.status === "approved").reduce((sum, l) => sum + leaveDaysInclusive(l.fromDate, l.toDate), 0);
    const pending = mine.filter((l) => l.status === "pending").reduce((sum, l) => sum + leaveDaysInclusive(l.fromDate, l.toDate), 0);
    return { total, used, remaining: Math.max(total - used, 0), pending };
  },

  async applyLeave(userId: string, input: ApplyLeaveInput): Promise<LeaveRow> {
    await wait();
    const db = readDb();
    const emp = db.employees.find((e) => e.userId === userId);
    if (!emp) throw new Error("Employee not found");
    const fromDate = asDay(input.fromDate);
    const toDate = asDay(input.toDate);
    if (toDate.isBefore(fromDate, "day")) throw new Error("End date must be on or after start date.");
    const type = input.type.trim();
    if (!type) throw new Error("Select a leave type.");
    const reason = input.reason.trim();
    if (reason.length < 5) throw new Error("Please provide a short reason (min 5 chars).");
    if ((input.attachmentDataUrl ?? "").length > 420_000) throw new Error("Attachment is too large for demo storage.");
    const overlap = db.leaves.find(
      (l) =>
        l.employeeId === emp.id &&
        (l.status === "pending" || l.status === "approved") &&
        rangesOverlap(l.fromDate, l.toDate, fromDate.toISOString(), toDate.toISOString())
    );
    if (overlap) throw new Error("This request overlaps with an existing pending/approved leave.");
    const now = dayjs().toISOString();
    const leaveId = id("l");
    db.leaves.push({
      id: leaveId,
      employeeId: emp.id,
      type,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      reason,
      attachmentName: input.attachmentName ?? null,
      attachmentDataUrl: input.attachmentDataUrl ?? null,
      status: "pending",
      appliedAt: now,
      updatedAt: now,
      reviewedByUserId: null,
      reviewerComment: "",
    });
    writeDb(db);
    const who = employeeDisplayName(db, emp.id);
    appendActivity({
      action: "Leave requested",
      detail: `${who} · ${type}`,
      notify: { title: "New leave request", body: `${who} submitted ${type} leave.` },
    });
    return mapLeaveRow(db, leaveId);
  },

  async updateLeave(userId: string, leaveId: string, input: ApplyLeaveInput): Promise<LeaveRow> {
    await wait();
    const db = readDb();
    const emp = db.employees.find((e) => e.userId === userId);
    if (!emp) throw new Error("Employee not found");
    const leave = db.leaves.find((l) => l.id === leaveId && l.employeeId === emp.id);
    if (!leave) throw new Error("Leave request not found");
    if (leave.status !== "pending") throw new Error("Only pending requests can be edited.");
    const fromDate = asDay(input.fromDate);
    const toDate = asDay(input.toDate);
    if (toDate.isBefore(fromDate, "day")) throw new Error("End date must be on or after start date.");
    const overlap = db.leaves.find(
      (l) =>
        l.id !== leave.id &&
        l.employeeId === emp.id &&
        (l.status === "pending" || l.status === "approved") &&
        rangesOverlap(l.fromDate, l.toDate, fromDate.toISOString(), toDate.toISOString())
    );
    if (overlap) throw new Error("This update overlaps with another pending/approved leave.");
    leave.type = input.type.trim();
    leave.fromDate = fromDate.toISOString();
    leave.toDate = toDate.toISOString();
    leave.reason = input.reason.trim();
    leave.attachmentName = input.attachmentName ?? leave.attachmentName;
    leave.attachmentDataUrl = input.attachmentDataUrl ?? leave.attachmentDataUrl;
    leave.updatedAt = dayjs().toISOString();
    writeDb(db);
    appendActivity({ action: "Leave request updated", detail: `${employeeDisplayName(db, emp.id)} · ${leave.type}` });
    return mapLeaveRow(db, leave.id);
  },

  async cancelLeave(userId: string, leaveId: string): Promise<void> {
    await wait();
    const db = readDb();
    const emp = db.employees.find((e) => e.userId === userId);
    if (!emp) throw new Error("Employee not found");
    const leave = db.leaves.find((l) => l.id === leaveId && l.employeeId === emp.id);
    if (!leave) throw new Error("Leave request not found");
    if (leave.status !== "pending") throw new Error("Only pending requests can be cancelled.");
    leave.status = "cancelled";
    leave.updatedAt = dayjs().toISOString();
    leave.reviewerComment = "Cancelled by employee.";
    writeDb(db);
    appendActivity({ action: "Leave request cancelled", detail: `${employeeDisplayName(db, emp.id)} · ${leave.type}` });
  },

  async reviewLeave(reviewerUserId: string, input: ReviewLeaveInput): Promise<LeaveRow> {
    await wait();
    const db = readDb();
    const reviewer = db.users.find((u) => u.id === reviewerUserId);
    if (!reviewer || (reviewer.role !== "admin" && reviewer.role !== "manager")) {
      throw new Error("Only admin or manager can review leaves.");
    }
    const leave = db.leaves.find((l) => l.id === input.leaveId);
    if (!leave) throw new Error("Leave request not found");
    if (leave.status !== "pending") throw new Error("Only pending leave requests can be reviewed.");
    leave.status = input.status;
    leave.reviewedByUserId = reviewerUserId;
    leave.reviewerComment = input.reviewerComment?.trim() ?? "";
    leave.updatedAt = dayjs().toISOString();
    writeDb(db);
    const who = employeeDisplayName(db, leave.employeeId);
    appendActivity({
      action: `Leave ${input.status}`,
      detail: `${who} · ${leave.type}`,
      notify: { title: `Leave ${input.status}`, body: `${who}'s leave was ${input.status}.` },
    });
    return mapLeaveRow(db, leave.id);
  },
};
