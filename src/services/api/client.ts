import dayjs from "dayjs";
import type { AttendanceEntry, Employee, SessionUser } from "../../shared/types/domain";
import { calcPayable, calcWorkedHours } from "../../shared/utils/calc";
import { readDb, writeDb } from "../adapters/mock/db";

const wait = async () => new Promise((resolve) => setTimeout(resolve, 120));
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export interface AttendanceRow extends AttendanceEntry {
  employeeName: string;
  hourlyRate: number;
  workedHours: number;
  payableAmount: number;
}

export const apiClient = {
  async login(email: string, password: string): Promise<SessionUser> {
    await wait();
    const db = readDb();
    const user = db.users.find((u) => u.email === email && u.passwordMock === password);
    if (!user) throw new Error("Invalid credentials");
    return { id: user.id, name: user.name, role: user.role, email: user.email };
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
      db.users.push({ id: userId, name: input.name, email: input.email, role: "employee", passwordMock: "emp123" });
      db.employees.push({ id: id("e"), userId, hourlyRate: input.hourlyRate, status: input.status, joinedAt: dayjs().toISOString() });
    }
    writeDb(db);
  },

  async attendance(): Promise<AttendanceRow[]> {
    await wait();
    const db = readDb();
    return db.attendance.map((entry) => {
      const employee = db.employees.find((e) => e.id === entry.employeeId)!;
      const user = db.users.find((u) => u.id === employee.userId)!;
      return {
        ...entry,
        employeeName: user.name,
        hourlyRate: employee.hourlyRate,
        workedHours: calcWorkedHours(entry),
        payableAmount: calcPayable(entry, employee),
      };
    });
  },

  async myAttendance(userId: string): Promise<AttendanceRow[]> {
    const db = readDb();
    const employee = db.employees.find((e) => e.userId === userId);
    if (!employee) return [];
    const rows = await this.attendance();
    return rows.filter((r) => r.employeeId === employee.id);
  },

  async clockIn(userId: string): Promise<void> {
    await wait();
    const db = readDb();
    const employee = db.employees.find((e) => e.userId === userId);
    if (!employee) throw new Error("Employee not found");
    const openEntry = db.attendance.find((a) => a.employeeId === employee.id && !a.clockOutAt);
    if (openEntry) throw new Error("Already clocked in");
    db.attendance.push({
      id: id("a"),
      employeeId: employee.id,
      clockInAt: dayjs().toISOString(),
      clockOutAt: null,
      breakMinutes: 0,
    });
    writeDb(db);
  },

  async clockOut(userId: string): Promise<void> {
    await wait();
    const db = readDb();
    const employee = db.employees.find((e) => e.userId === userId);
    if (!employee) throw new Error("Employee not found");
    const openEntry = db.attendance.find((a) => a.employeeId === employee.id && !a.clockOutAt);
    if (!openEntry) throw new Error("No active session");
    openEntry.clockOutAt = dayjs().toISOString();
    openEntry.breakMinutes = 30;
    writeDb(db);
  },
};
