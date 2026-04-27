import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { apiClient } from "../../services/api/client";
import type { AttendanceRow } from "../../services/api/client";
import { DataTable } from "../../shared/components/DataTable";
import { useAuthStore } from "../auth/store";
import { money } from "../../shared/utils/calc";
import { summarizeCalendarDay } from "../../shared/utils/shift";
import type { AttendanceEntry } from "../../shared/types/domain";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function statusPill(label: string, tone: "default" | "success" | "warning" | "danger" | "muted") {
  const tones: Record<typeof tone, string> = {
    default: "chip-info",
    success: "chip-success",
    warning: "chip-warning",
    danger: "chip-error",
    muted: "chip-muted",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", tones[tone])}>
      {label}
    </span>
  );
}

export function MyTimesheetPage() {
  const user = useAuthStore((s) => s.user)!;
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const attendance = useQuery({ queryKey: ["my-attendance", user.id], queryFn: () => apiClient.myAttendance(user.id) });
  const allRows = attendance.data ?? [];
  const now = dayjs();
  const rows = useMemo(
    () =>
      allRows.filter((row) =>
        viewMode === "weekly" ? dayjs(row.clockInAt).isAfter(now.subtract(7, "day")) : dayjs(row.clockInAt).isAfter(now.subtract(1, "month"))
      ),
    [allRows, viewMode, now]
  );
  const totalPayable = rows.reduce((sum, row) => sum + row.payableAmount, 0);
  const totalHours = rows.reduce((sum, row) => sum + row.workedHours, 0);

  const rawEntries: AttendanceEntry[] = rows.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    clockInAt: r.clockInAt,
    clockOutAt: r.clockOutAt,
    breakMinutes: r.breakMinutes,
    breakStartAt: r.breakStartAt,
    approvalStatus: r.approvalStatus,
    notes: r.notes,
  }));

  const last7 = Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, "day").startOf("day"));
  const daily = last7.map((d) => {
    const s = summarizeCalendarDay(d, rawEntries);
    return { date: d, ...s };
  });

  const columns: ColumnDef<AttendanceRow>[] = [
    { header: "Date", cell: ({ row }) => dayjs(row.original.clockInAt).format("DD MMM YYYY") },
    { header: "Clock in", cell: ({ row }) => dayjs(row.original.clockInAt).format("hh:mm A") },
    {
      header: "Clock out",
      cell: ({ row }) => (row.original.clockOutAt ? dayjs(row.original.clockOutAt).format("hh:mm A") : statusPill("Open", "warning")),
    },
    {
      header: "Break",
      cell: ({ row }) => (
        <div className="text-xs leading-snug">
          <div className="font-medium text-foreground">{row.original.breakMinutes}m logged</div>
          {row.original.onBreak && <div className="text-warning">{statusPill("On break", "warning")}</div>}
        </div>
      ),
    },
    { header: "Hours", cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.workedHours.toFixed(2)}</span> },
    { header: "Payable", cell: ({ row }) => money(row.original.payableAmount) },
    {
      header: "Approval",
      cell: ({ row }) => {
        const s = row.original.approvalStatus;
        if (s === "approved") return statusPill("Approved", "success");
        if (s === "rejected") return statusPill("Rejected", "danger");
        return statusPill("Pending", "warning");
      },
    },
    {
      header: "Notes",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.notes || "—"}</span>,
    },
    {
      header: "Late",
      cell: ({ row }) =>
        row.original.isLate ? statusPill(`+${row.original.lateByMinutes}m`, "danger") : statusPill("—", "muted"),
    },
    {
      header: "Duration check",
      cell: ({ row }) => {
        if (row.original.durationIssue === "short") return statusPill("Short shift", "warning");
        if (row.original.durationIssue === "long") return statusPill("Long shift", "warning");
        return statusPill("OK", "success");
      },
    },
    {
      header: "Shift status",
      cell: ({ row }) => {
        const s = row.original.shiftStatus;
        if (s === "present") return statusPill("Present", "success");
        if (s === "half_day") return statusPill("Half-day", "warning");
        if (s === "in_progress") return statusPill("In progress", "default");
        return statusPill("Absent", "muted");
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={cn("rounded-md border px-3 py-1.5 text-sm", viewMode === "weekly" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}
          onClick={() => setViewMode("weekly")}
        >
          Weekly view
        </button>
        <button
          className={cn("rounded-md border px-3 py-1.5 text-sm", viewMode === "monthly" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}
          onClick={() => setViewMode("monthly")}
        >
          Monthly view
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/[0.1] to-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">Totals (this view)</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Hours <span className="font-semibold text-foreground tabular-nums">{totalHours.toFixed(2)}</span>
            {" · "}
            Payable <span className="font-semibold text-foreground">{money(totalPayable)}</span>
          </p>
        </div>
        <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">Daily view</p>
          <p className="mt-1 text-sm text-muted-foreground">Last 7 calendar days · weekends greyed when empty</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border/80 bg-secondary/65 px-4 py-3">
          <h3 className="text-sm font-semibold">Daily status</h3>
        </div>
        <div className="divide-y divide-border">
          {daily.map((d) => (
            <div key={d.date.format("YYYY-MM-DD")} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span className="font-medium text-foreground">{d.date.format("ddd, DD MMM")}</span>
              <div className="flex items-center gap-2">
                {d.status === "weekend" && statusPill("Weekend", "muted")}
                {d.status === "absent" && statusPill("Absent", "danger")}
                {d.status === "half_day" && statusPill("Half-day", "warning")}
                {d.status === "present" && statusPill("Present", "success")}
                {d.status === "in_progress" && statusPill("In progress", "default")}
                <span className="text-xs text-muted-foreground tabular-nums">{d.totalHours.toFixed(2)}h</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Shift log</h3>
        {attendance.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 rounded-lg" />
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : (
          <DataTable columns={columns} data={rows} />
        )}
      </div>
    </div>
  );
}
