import dayjs from "dayjs";
import {
  defaultNotificationPrefs,
  type AttendanceEntry,
  type Employee,
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
};
