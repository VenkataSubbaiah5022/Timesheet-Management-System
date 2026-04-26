import dayjs from "dayjs";
import type { AttendanceEntry, Employee, User } from "../../../shared/types/domain";

interface MockDb {
  users: User[];
  employees: Employee[];
  attendance: AttendanceEntry[];
}

const DB_KEY = "timesheet-db-v1";

const seedDb: MockDb = {
  users: [
    {
      id: "u-admin",
      name: "Admin User",
      email: "admin@demo.com",
      role: "admin",
      passwordMock: "admin123",
    },
    {
      id: "u-emp-1",
      name: "Arjun Patel",
      email: "arjun@demo.com",
      role: "employee",
      passwordMock: "emp123",
    },
    {
      id: "u-emp-2",
      name: "Neha Sharma",
      email: "neha@demo.com",
      role: "employee",
      passwordMock: "emp123",
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
    },
    {
      id: "a-2",
      employeeId: "e-2",
      clockInAt: dayjs().subtract(1, "day").hour(10).minute(0).toISOString(),
      clockOutAt: dayjs().subtract(1, "day").hour(19).minute(10).toISOString(),
      breakMinutes: 30,
    },
  ],
};

export function readDb(): MockDb {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    localStorage.setItem(DB_KEY, JSON.stringify(seedDb));
    return seedDb;
  }
  return JSON.parse(raw) as MockDb;
}

export function writeDb(next: MockDb): void {
  localStorage.setItem(DB_KEY, JSON.stringify(next));
}
