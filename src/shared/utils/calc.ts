import dayjs from "dayjs";
import type { AttendanceEntry, Employee } from "../types/domain";
import { netWorkedHours } from "./shift";

/** Net hours for a closed shift (payroll). Open shifts return 0 until clock-out. */
export function calcWorkedHours(entry: AttendanceEntry): number {
  if (!entry.clockOutAt) return 0;
  return netWorkedHours(entry, dayjs(entry.clockOutAt));
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
