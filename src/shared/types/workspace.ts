/** Workspace-level configuration (mock persistence — API-ready shape). */

export interface WorkingHoursConfig {
  weekdayStartHour: number;
  weekdayStartMinute: number;
  weekdayEndHour: number;
  weekdayEndMinute: number;
}

export interface AttendancePolicyConfig {
  expectedStartHour: number;
  expectedStartMinute: number;
  lateGraceMinutes: number;
  autoClockoutHours: number;
}

export interface LeavePolicyConfig {
  maxDaysPerYear: number;
  types: string[];
}

export interface FeatureFlags {
  moduleDashboard: boolean;
  moduleEmployees: boolean;
  moduleAttendance: boolean;
  moduleLeaves: boolean;
  moduleReports: boolean;
  moduleActivityLog: boolean;
}

export interface WorkspaceNotificationSettings {
  emailPayrollDigest: boolean;
  inAppApprovalAlerts: boolean;
}

export interface WorkspaceSettings {
  timezone: string;
  workingHours: WorkingHoursConfig;
  defaults: { defaultHourlyRate: number };
  attendance: AttendancePolicyConfig;
  leave: LeavePolicyConfig;
  features: FeatureFlags;
  workspaceNotifications: WorkspaceNotificationSettings;
  /** Preference for a future HTTP adapter (mock UI only for now). */
  useLiveApi: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  moduleDashboard: true,
  moduleEmployees: true,
  moduleAttendance: true,
  moduleLeaves: true,
  moduleReports: true,
  moduleActivityLog: true,
};

export function defaultWorkspaceSettings(): WorkspaceSettings {
  let tz = "UTC";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    /* ignore */
  }
  return {
    timezone: tz,
    workingHours: {
      weekdayStartHour: 9,
      weekdayStartMinute: 0,
      weekdayEndHour: 18,
      weekdayEndMinute: 0,
    },
    defaults: { defaultHourlyRate: 350 },
    attendance: {
      expectedStartHour: 9,
      expectedStartMinute: 0,
      lateGraceMinutes: 15,
      autoClockoutHours: 12,
    },
    leave: {
      maxDaysPerYear: 24,
      types: ["Annual", "Sick", "Casual", "Unpaid"],
    },
    features: { ...DEFAULT_FEATURE_FLAGS },
    workspaceNotifications: {
      emailPayrollDigest: true,
      inAppApprovalAlerts: true,
    },
    useLiveApi: false,
  };
}

export function mergeWorkspaceSettings(partial: unknown): WorkspaceSettings {
  const base = defaultWorkspaceSettings();
  if (!partial || typeof partial !== "object") return base;
  const p = partial as Record<string, unknown>;
  const wh = (typeof p.workingHours === "object" && p.workingHours !== null ? p.workingHours : {}) as Partial<WorkingHoursConfig>;
  const att = (typeof p.attendance === "object" && p.attendance !== null ? p.attendance : {}) as Partial<AttendancePolicyConfig>;
  const lv = (typeof p.leave === "object" && p.leave !== null ? p.leave : {}) as Partial<LeavePolicyConfig>;
  const ft = (typeof p.features === "object" && p.features !== null ? p.features : {}) as Partial<FeatureFlags>;
  const wn = (typeof p.workspaceNotifications === "object" && p.workspaceNotifications !== null
    ? p.workspaceNotifications
    : {}) as Partial<WorkspaceNotificationSettings>;
  const defs = (typeof p.defaults === "object" && p.defaults !== null ? p.defaults : {}) as Partial<{ defaultHourlyRate: number }>;
  return {
    timezone: typeof p.timezone === "string" ? p.timezone : base.timezone,
    workingHours: { ...base.workingHours, ...wh },
    defaults: { ...base.defaults, ...defs },
    attendance: { ...base.attendance, ...att },
    leave: {
      maxDaysPerYear: typeof lv.maxDaysPerYear === "number" ? lv.maxDaysPerYear : base.leave.maxDaysPerYear,
      types: Array.isArray(lv.types) ? lv.types.filter((x): x is string => typeof x === "string") : base.leave.types,
    },
    features: { ...base.features, ...ft },
    workspaceNotifications: { ...base.workspaceNotifications, ...wn },
    useLiveApi: typeof p.useLiveApi === "boolean" ? p.useLiveApi : base.useLiveApi,
  };
}
