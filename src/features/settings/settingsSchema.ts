import { z } from "zod";
import type { WorkspaceSettings } from "../../shared/types/workspace";

const hour = z.coerce.number().int().min(0).max(23);
const minute = z.coerce.number().int().min(0).max(59);

export const settingsSchema = z
  .object({
    timezone: z.string().min(2, "Pick a timezone."),
    workingHours: z.object({
      weekdayStartHour: hour,
      weekdayStartMinute: minute,
      weekdayEndHour: hour,
      weekdayEndMinute: minute,
    }),
    defaults: z.object({
      defaultHourlyRate: z.coerce.number().min(1, "Rate must be at least 1.").max(99999),
    }),
    attendance: z.object({
      expectedStartHour: hour,
      expectedStartMinute: minute,
      lateGraceMinutes: z.coerce.number().int().min(0, "Grace cannot be negative.").max(180),
      autoClockoutHours: z.coerce.number().min(1).max(48),
    }),
    leave: z.object({
      maxDaysPerYear: z.coerce.number().int().min(0).max(365),
      types: z.array(z.string().min(1)).min(1, "Add at least one leave type."),
    }),
    features: z.object({
      moduleDashboard: z.boolean(),
      moduleEmployees: z.boolean(),
      moduleAttendance: z.boolean(),
      moduleLeaves: z.boolean(),
      moduleReports: z.boolean(),
      moduleActivityLog: z.boolean(),
    }),
    workspaceNotifications: z.object({
      emailPayrollDigest: z.boolean(),
      inAppApprovalAlerts: z.boolean(),
    }),
    useLiveApi: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const start = data.workingHours.weekdayStartHour * 60 + data.workingHours.weekdayStartMinute;
    const end = data.workingHours.weekdayEndHour * 60 + data.workingHours.weekdayEndMinute;
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time.",
        path: ["workingHours", "weekdayEndHour"],
      });
    }
    if (!data.features.moduleDashboard) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dashboard must remain enabled for navigation.",
        path: ["features", "moduleDashboard"],
      });
    }
    const enabled = Object.values(data.features).filter(Boolean).length;
    if (enabled === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enable at least one module.", path: ["features"] });
    }
  });

export type WorkspaceFormValues = z.infer<typeof settingsSchema>;

export function toWorkspaceSettings(values: WorkspaceFormValues): WorkspaceSettings {
  return values as unknown as WorkspaceSettings;
}
