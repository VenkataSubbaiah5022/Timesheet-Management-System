import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, RotateCcw, Save, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getAppEnvironment } from "../../config/env";
import { MOCK_DB_KEY } from "../../services/adapters/mock/db";
import { appendActivity } from "../../services/activityLog";
import { apiClient } from "../../services/api/client";
import { useWorkspaceSettingsStore } from "../../services/workspaceSettingsStore";
import { mergeWorkspaceSettings, type WorkspaceSettings } from "../../shared/types/workspace";
import { Card } from "../../shared/components/ui/card";
import { useAuthStore } from "../auth/store";
import { COMMON_TIMEZONES } from "./commonTimezones";
import { settingsSchema, toWorkspaceSettings, type WorkspaceFormValues } from "./settingsSchema";

function settingsToForm(s: WorkspaceSettings): WorkspaceFormValues {
  return mergeWorkspaceSettings(s) as WorkspaceFormValues;
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)!;
  const canEditWorkspace = user.role === "admin" || user.role === "manager";
  const settings = useWorkspaceSettingsStore((s) => s.settings);
  const setSettings = useWorkspaceSettingsStore((s) => s.setSettings);
  const resetFactory = useWorkspaceSettingsStore((s) => s.resetToFactory);
  const queryClient = useQueryClient();
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(settingsSchema) as Resolver<WorkspaceFormValues>,
    defaultValues: settingsToForm(settings),
  });

  useEffect(() => {
    form.reset(settingsToForm(settings));
  }, [settings, form]);

  const env = getAppEnvironment(settings.useLiveApi);
  const currentTz = form.watch("timezone");
  const zoneOptions = useMemo(() => {
    const z = new Set<string>([...COMMON_TIMEZONES]);
    if (currentTz) z.add(currentTz);
    return [...z].sort((a, b) => a.localeCompare(b));
  }, [currentTz]);

  const onSave = form.handleSubmit((values) => {
    const next = toWorkspaceSettings(values);
    setSettings(next);
    appendActivity({
      action: "Workspace settings saved",
      detail: "Policies, hours, and modules",
      notify: { title: "Settings saved", body: "Workspace configuration was updated." },
    });
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
    queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
  });

  const onRevert = () => {
    form.reset(settingsToForm(useWorkspaceSettingsStore.getState().settings));
  };

  const onFactoryReset = () => {
    if (!window.confirm("Reset all workspace settings to factory defaults? This cannot be undone.")) return;
    resetFactory();
    form.reset(settingsToForm(useWorkspaceSettingsStore.getState().settings));
    appendActivity({ action: "Workspace settings factory reset" });
  };

  const exportFullBackup = () => {
    const payload = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      settings: useWorkspaceSettingsStore.getState().settings,
      mockDatabaseJson: localStorage.getItem(MOCK_DB_KEY),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `timesheet-workspace-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setBackupMsg("Backup file downloaded.");
    window.setTimeout(() => setBackupMsg(null), 4000);
  };

  const importBackup = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const parsed = JSON.parse(text) as { version?: number; settings?: WorkspaceSettings; mockDatabaseJson?: string | null };
      if (parsed.version !== 1 || !parsed.settings) throw new Error("Invalid backup file (expected version 1 with settings).");
      if (!window.confirm("Replace workspace settings with this backup? Optionally restore the mock database if present.")) {
        return;
      }
      setSettings(mergeWorkspaceSettings(parsed.settings));
      if (typeof parsed.mockDatabaseJson === "string" && parsed.mockDatabaseJson.length > 0) {
        if (window.confirm("Also overwrite the in-browser mock database from this backup?")) {
          localStorage.setItem(MOCK_DB_KEY, parsed.mockDatabaseJson);
          window.location.reload();
          return;
        }
      }
      form.reset(settingsToForm(useWorkspaceSettingsStore.getState().settings));
    },
    onError: (e) => setRestoreError((e as Error).message),
    onSuccess: () => {
      setRestoreError(null);
      setBackupMsg("Restore completed. Refresh if you replaced the database.");
      window.setTimeout(() => setBackupMsg(null), 5000);
    },
  });

  const exportPersonal = useMutation({
    mutationFn: async () => {
      const [profile, rows] = await Promise.all([apiClient.getProfile(user.id), apiClient.myAttendance(user.id)]);
      const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), profile, myAttendance: rows }, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `timesheet-my-data-${user.id}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
  });

  const disabled = !canEditWorkspace;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace policies, appearance, and operational toggles.</p>
        {!canEditWorkspace ? (
          <p className="mt-2 text-xs text-warning">
            Organization policies are read-only. You can still use appearance, personal export, and environment info below.
          </p>
        ) : null}
      </div>

      <form className="space-y-6" onSubmit={onSave}>
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-medium text-foreground">Working hours</h2>
          <p className="text-xs text-muted-foreground">Office window for reference (policies and future validations).</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Weekday start</label>
              <div className="flex gap-2">
                <Input type="number" disabled={disabled} className="min-w-0" {...form.register("workingHours.weekdayStartHour")} />
                <Input type="number" disabled={disabled} className="min-w-0" {...form.register("workingHours.weekdayStartMinute")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Weekday end</label>
              <div className="flex gap-2">
                <Input type="number" disabled={disabled} className="min-w-0" {...form.register("workingHours.weekdayEndHour")} />
                <Input type="number" disabled={disabled} className="min-w-0" {...form.register("workingHours.weekdayEndMinute")} />
              </div>
            </div>
          </div>
          {form.formState.errors.workingHours ? (
            <p className="text-xs text-destructive">{form.formState.errors.workingHours.weekdayEndHour?.message}</p>
          ) : null}
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-medium text-foreground">Timezone</h2>
          <select
            disabled={disabled}
            className="h-8 w-full max-w-md rounded-lg border border-border bg-card px-2 text-sm"
            {...form.register("timezone")}
          >
            {zoneOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Used for labels and future scheduling; times in the app still follow your browser clock in this demo.</p>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-medium text-foreground">Defaults</h2>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Default hourly rate (new employees)</label>
            <Input type="number" disabled={disabled} className="max-w-xs" {...form.register("defaults.defaultHourlyRate")} />
            {form.formState.errors.defaults?.defaultHourlyRate ? (
              <p className="text-xs text-destructive">{form.formState.errors.defaults.defaultHourlyRate.message}</p>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-medium text-foreground">Attendance rules</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Expected start (day)</label>
              <div className="flex gap-2">
                <Input type="number" disabled={disabled} {...form.register("attendance.expectedStartHour")} />
                <Input type="number" disabled={disabled} {...form.register("attendance.expectedStartMinute")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Late grace (minutes)</label>
              <Input type="number" disabled={disabled} {...form.register("attendance.lateGraceMinutes")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Auto clock-out after (hours open)</label>
              <Input type="number" disabled={disabled} className="max-w-xs" {...form.register("attendance.autoClockoutHours")} />
            </div>
          </div>
          {form.formState.errors.attendance ? (
            <p className="text-xs text-destructive">Check attendance numeric fields.</p>
          ) : null}
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-medium text-foreground">Leave policy</h2>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Max leave days / year</label>
            <Input type="number" disabled={disabled} className="max-w-xs" {...form.register("leave.maxDaysPerYear")} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Leave types (one per line)</label>
            <textarea
              disabled={disabled}
              rows={4}
              className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm text-foreground outline-none"
              value={form.watch("leave.types").join("\n")}
              onChange={(e) => {
                const types = e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean);
                form.setValue("leave.types", types.length ? types : [""], { shouldDirty: true, shouldValidate: true });
              }}
            />
            {form.formState.errors.leave?.types ? (
              <p className="text-xs text-destructive">{form.formState.errors.leave.types.message as string}</p>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-medium text-foreground">Feature toggles</h2>
          <p className="text-xs text-muted-foreground">Hide modules from the sidebar. Dashboard should stay on for a usable home.</p>
          {(["moduleDashboard", "moduleEmployees", "moduleAttendance", "moduleLeaves", "moduleReports", "moduleActivityLog"] as const).map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/80 bg-secondary/55 px-3 py-2"
            >
              <span className="text-sm capitalize text-foreground">{key.replace("module", "").replace(/([A-Z])/g, " $1")}</span>
              <input
                type="checkbox"
                disabled={disabled || key === "moduleDashboard"}
                className="size-4 rounded border-border accent-primary"
                checked={form.watch(`features.${key}`)}
                onChange={(e) => form.setValue(`features.${key}`, e.target.checked, { shouldDirty: true })}
              />
            </label>
          ))}
          {form.formState.errors.features ? (
            <p className="text-xs text-destructive">Adjust feature toggles (dashboard must stay on).</p>
          ) : null}
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-medium text-foreground">Workspace notifications</h2>
          <p className="text-xs text-muted-foreground">Channel preferences for payroll digests and in-app alerts (mock).</p>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <span className="text-sm text-foreground">Email payroll digest</span>
            <input
              type="checkbox"
              disabled={disabled}
              className="size-4 accent-primary"
              checked={form.watch("workspaceNotifications.emailPayrollDigest")}
              onChange={(e) => form.setValue("workspaceNotifications.emailPayrollDigest", e.target.checked, { shouldDirty: true })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <span className="text-sm text-foreground">In-app approval alerts</span>
            <input
              type="checkbox"
              disabled={disabled}
              className="size-4 accent-primary"
              checked={form.watch("workspaceNotifications.inAppApprovalAlerts")}
              onChange={(e) => form.setValue("workspaceNotifications.inAppApprovalAlerts", e.target.checked, { shouldDirty: true })}
            />
          </label>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-medium text-foreground">Environment (API-ready)</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/70 py-1">
              <dt className="text-muted-foreground">Mode</dt>
              <dd className="font-mono text-foreground">{env.mode}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/70 py-1">
              <dt className="text-muted-foreground">VITE_API_BASE_URL</dt>
              <dd className="max-w-[55%] truncate font-mono text-xs text-foreground">{env.apiBaseUrl || "(empty)"}</dd>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-muted-foreground">Data layer</dt>
              <dd className="text-foreground">{env.useMockDataLayer ? "Mock (local)" : "Live (when wired)"}</dd>
            </div>
          </dl>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <span className="text-sm text-foreground">Prefer live API when URL is configured</span>
            <input
              type="checkbox"
              disabled={disabled}
              className="size-4 accent-primary"
              checked={form.watch("useLiveApi")}
              onChange={(e) => form.setValue("useLiveApi", e.target.checked, { shouldDirty: true })}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            `getAppEnvironment()` in `src/config/env.ts` centralizes reads. `apiClient` can branch on this when you connect a backend.
          </p>
        </Card>

        {canEditWorkspace ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Save settings
                </>
              )}
            </Button>
            <Button type="button" variant="outline" disabled={!form.formState.isDirty} onClick={onRevert}>
              <RotateCcw className="mr-2 size-4" />
              Revert form
            </Button>
            <Button type="button" variant="destructive" onClick={onFactoryReset}>
              Reset to factory defaults
            </Button>
          </div>
        ) : null}
      </form>

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-medium text-foreground">Backup & restore (mock)</h2>
        <p className="text-xs text-muted-foreground">Exports workspace settings and the in-browser database JSON. Restoring the DB reloads the app.</p>
        {canEditWorkspace ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={exportFullBackup}>
              <Download className="mr-2 size-4" />
              Download full backup
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importBackup.isPending}>
              <Upload className="mr-2 size-4" />
              Restore from file…
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) importBackup.mutate(f);
              }}
            />
          </div>
        ) : null}
        <Separator />
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Personal export</p>
          <Button type="button" variant="outline" size="sm" disabled={exportPersonal.isPending} onClick={() => exportPersonal.mutate()}>
            <Download className="mr-2 size-4" />
            Download my profile & attendance (JSON)
          </Button>
        </div>
        {restoreError ? <p className="text-sm text-destructive">{restoreError}</p> : null}
        {backupMsg ? <p className="text-sm text-success">{backupMsg}</p> : null}
        {importBackup.isError ? <p className="text-sm text-destructive">{(importBackup.error as Error).message}</p> : null}
      </Card>
    </div>
  );
}
