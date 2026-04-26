/**
 * Static thresholds for shift summaries (present / short / long).
 * Expected start, grace, and auto clock-out are driven by **workspace settings**
 * (`getAttendanceRuntime` → Settings page) so admins can tune policy without redeploying.
 */
export const EXPECTED_START_HOUR = 9;
export const EXPECTED_START_MINUTE = 0;
export const LATE_GRACE_MINUTES = 15;

/** Auto clock-out if still open after this many hours from clock-in. */
export const AUTO_CLOCKOUT_HOURS = 12;

/** Worked hours thresholds (net, after breaks). */
export const PRESENT_MIN_HOURS = 6;
export const MIN_SHIFT_WARNING_HOURS = 0.25;
export const MAX_SHIFT_WARNING_HOURS = 12;
