export type Role = "admin" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordMock: string;
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
  breakMinutes: number;
}

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  email: string;
}
