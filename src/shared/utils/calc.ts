import dayjs from "dayjs";
import type { AttendanceEntry, Employee } from "../types/domain";

export function calcWorkedHours(entry: AttendanceEntry): number {
  if (!entry.clockOutAt) return 0;
  const start = dayjs(entry.clockInAt);
  const end = dayjs(entry.clockOutAt);
  const mins = Math.max(end.diff(start, "minute") - entry.breakMinutes, 0);
  return Number((mins / 60).toFixed(2));
}

export function calcPayable(entry: AttendanceEntry, employee: Employee): number {
  return Number((calcWorkedHours(entry) * employee.hourlyRate).toFixed(2));
}

export function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
