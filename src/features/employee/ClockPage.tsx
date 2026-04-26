import dayjs from "dayjs";
import { Coffee, LogIn, LogOut, Timer } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../services/api/client";
import { useAuthStore } from "../auth/store";
import { getAttendanceRuntime } from "../../shared/utils/attendanceRuntime";
import { getLateInfo } from "../../shared/utils/shift";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ClockPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user)!;
  const attendance = useQuery({ queryKey: ["my-attendance", user.id], queryFn: () => apiClient.myAttendance(user.id) });
  const open = (attendance.data ?? []).find((a) => !a.clockOutAt);
  const hasOpen = Boolean(open);
  const onBreak = Boolean(open?.onBreak);

  const clockIn = useMutation({
    mutationFn: () => apiClient.clockIn(user.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-attendance", user.id] }),
  });
  const clockOut = useMutation({
    mutationFn: () => apiClient.clockOut(user.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-attendance", user.id] }),
  });
  const startBreak = useMutation({
    mutationFn: () => apiClient.startBreak(user.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-attendance", user.id] }),
  });
  const endBreak = useMutation({
    mutationFn: () => apiClient.endBreak(user.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-attendance", user.id] }),
  });

  const late = open ? getLateInfo(open.clockInAt) : { isLate: false, lateByMinutes: 0 };
  const err = (clockIn.error || clockOut.error || startBreak.error || endBreak.error) as Error | undefined;
  const rt = getAttendanceRuntime();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200/90 bg-white dark:border-slate-800/50 dark:bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Time clock</h2>
            <p className="text-sm text-muted-foreground">
              Expected start {String(rt.expectedStartHour).padStart(2, "0")}:
              {String(rt.expectedStartMinute).padStart(2, "0")} · Grace {rt.lateGraceMinutes}m · Auto clock-out after{" "}
              {rt.autoClockoutHours}h open
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 dark:border-slate-800/50 dark:bg-muted/40 px-3 py-2 text-sm">
            <Timer className="size-4 text-muted-foreground" />
            <span className="font-medium tabular-nums">{dayjs().format("DD MMM YYYY, hh:mm:ss A")}</span>
          </div>
        </div>

        {open && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200/80 bg-white dark:border-slate-800/50 dark:bg-background p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Session</p>
              <p className="mt-1 text-sm font-semibold">{onBreak ? "On break" : "Working"}</p>
              <p className="text-xs text-muted-foreground">In since {dayjs(open.clockInAt).format("hh:mm A")}</p>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white dark:border-slate-800/50 dark:bg-background p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Live net hours</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{open.workedHours.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Break bank {open.breakMinutes}m logged</p>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white dark:border-slate-800/50 dark:bg-background p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Punctuality</p>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold",
                  late.isLate ? "text-destructive" : "text-emerald-600"
                )}
              >
                {late.isLate ? `Late by ${late.lateByMinutes}m` : "On time"}
              </p>
              <p className="text-xs text-muted-foreground">Compared to policy start</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => clockIn.mutate()} disabled={hasOpen || clockIn.isPending} size="default">
            <LogIn className="size-4" /> Clock in
          </Button>
          <Button variant="secondary" onClick={() => clockOut.mutate()} disabled={!hasOpen || clockOut.isPending}>
            <LogOut className="size-4" /> Clock out
          </Button>
          <Button variant="outline" onClick={() => startBreak.mutate()} disabled={!hasOpen || onBreak || startBreak.isPending}>
            <Coffee className="size-4" /> Start break
          </Button>
          <Button variant="outline" onClick={() => endBreak.mutate()} disabled={!hasOpen || !onBreak || endBreak.isPending}>
            End break
          </Button>
        </div>

        {err && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {err.message}
          </p>
        )}
      </div>
    </div>
  );
}
