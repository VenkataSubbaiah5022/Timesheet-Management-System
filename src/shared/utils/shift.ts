import dayjs from "dayjs";
import type { AttendanceEntry } from "../types/domain";
import { getAttendanceRuntime } from "./attendanceRuntime";

export type DurationIssue = "none" | "short" | "long";
export type ShiftDayStatus = "present" | "half_day" | "in_progress" | "absent";
export type CalendarDayStatus = "present" | "half_day" | "absent" | "in_progress" | "weekend";

export function effectiveBreakMinutes(entry: AttendanceEntry, asOf: dayjs.Dayjs = dayjs()): number {
  let total = entry.breakMinutes;
  if (entry.breakStartAt) {
    total += Math.max(asOf.diff(dayjs(entry.breakStartAt), "minute"), 0);
  }
  return total;
}

/** Net worked hours; pass `asOf` for open sessions (live). */
export function netWorkedHours(entry: AttendanceEntry, asOf: dayjs.Dayjs = dayjs()): number {
  const end = entry.clockOutAt ? dayjs(entry.clockOutAt) : asOf;
  const gross = end.diff(dayjs(entry.clockInAt), "minute");
  const netMins = Math.max(gross - effectiveBreakMinutes(entry, asOf), 0);
  return Number((netMins / 60).toFixed(2));
}

export function getLateInfo(clockInAt: string): { isLate: boolean; lateByMinutes: number } {
  const rt = getAttendanceRuntime();
  const clockIn = dayjs(clockInAt);
  const expected = clockIn
    .startOf("day")
    .hour(rt.expectedStartHour)
    .minute(rt.expectedStartMinute)
    .second(0)
    .millisecond(0);
  const deadline = expected.add(rt.lateGraceMinutes, "minute");
  if (clockIn.isAfter(deadline)) {
    return { isLate: true, lateByMinutes: clockIn.diff(deadline, "minute") };
  }
  return { isLate: false, lateByMinutes: 0 };
}

export function getDurationIssue(workedHours: number, isClosed: boolean): DurationIssue {
  const rt = getAttendanceRuntime();
  if (!isClosed) return "none";
  if (workedHours < rt.minShiftWarningHours) return "short";
  if (workedHours > rt.maxShiftWarningHours) return "long";
  return "none";
}

export function getShiftDayStatus(entry: AttendanceEntry, workedHours: number): ShiftDayStatus {
  const rt = getAttendanceRuntime();
  if (!entry.clockOutAt) return "in_progress";
  if (workedHours >= rt.presentMinHours) return "present";
  if (workedHours > 0) return "half_day";
  return "absent";
}

export function autoClockOutIfStale(entry: AttendanceEntry, now: dayjs.Dayjs = dayjs()): AttendanceEntry {
  const rt = getAttendanceRuntime();
  if (entry.clockOutAt) return entry;
  const start = dayjs(entry.clockInAt);
  const hoursOpen = now.diff(start, "hour", true);
  if (hoursOpen < rt.autoClockoutHours) return entry;

  const clockOutAt = start.add(rt.autoClockoutHours, "hour");
  let breakMinutes = entry.breakMinutes;
  let breakStartAt: string | null = entry.breakStartAt;

  if (breakStartAt) {
    const br = dayjs(breakStartAt);
    if (br.isBefore(clockOutAt)) {
      breakMinutes += clockOutAt.diff(br, "minute");
    }
    breakStartAt = null;
  }

  return {
    ...entry,
    clockOutAt: clockOutAt.toISOString(),
    breakMinutes,
    breakStartAt,
  };
}

export function summarizeCalendarDay(
  date: dayjs.Dayjs,
  entries: AttendanceEntry[],
  now: dayjs.Dayjs = dayjs()
): { totalHours: number; status: CalendarDayStatus } {
  const d = date.startOf("day");
  const dayEntries = entries.filter((e) => dayjs(e.clockInAt).isSame(d, "day"));
  const dow = d.day();
  const isWeekend = dow === 0 || dow === 6;
  if (isWeekend && dayEntries.length === 0) {
    return { totalHours: 0, status: "weekend" };
  }
  if (dayEntries.length === 0) {
    return { totalHours: 0, status: "absent" };
  }
  const hasOpen = dayEntries.some((e) => !e.clockOutAt);
  if (hasOpen) {
    const total = dayEntries.reduce((sum, e) => sum + netWorkedHours(e, now), 0);
    return { totalHours: Number(total.toFixed(2)), status: "in_progress" };
  }
  const totalHours = Number(
    dayEntries.reduce((sum, e) => sum + netWorkedHours(e, now), 0).toFixed(2)
  );
  const rt = getAttendanceRuntime();
  if (totalHours >= rt.presentMinHours) return { totalHours, status: "present" };
  if (totalHours > 0) return { totalHours, status: "half_day" };
  return { totalHours, status: "absent" };
}
