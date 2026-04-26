import { getWorkspaceSettings } from "../../services/workspaceSettingsStore";
import {
  MAX_SHIFT_WARNING_HOURS,
  MIN_SHIFT_WARNING_HOURS,
  PRESENT_MIN_HOURS,
} from "../constants/attendance";

/** Resolved attendance policy for late / auto clock-out (from workspace + static thresholds). */
export function getAttendanceRuntime() {
  const a = getWorkspaceSettings().attendance;
  return {
    expectedStartHour: a.expectedStartHour,
    expectedStartMinute: a.expectedStartMinute,
    lateGraceMinutes: a.lateGraceMinutes,
    autoClockoutHours: a.autoClockoutHours,
    presentMinHours: PRESENT_MIN_HOURS,
    minShiftWarningHours: MIN_SHIFT_WARNING_HOURS,
    maxShiftWarningHours: MAX_SHIFT_WARNING_HOURS,
  };
}
