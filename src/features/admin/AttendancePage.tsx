import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { PencilLine, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "../../services/api/client";
import type { AttendanceRow } from "../../services/api/client";
import { DataTable } from "../../shared/components/DataTable";
import { money } from "../../shared/utils/calc";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Card } from "../../shared/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function pill(label: string, tone: "default" | "success" | "warning" | "danger" | "muted") {
  const tones: Record<typeof tone, string> = {
    default: "chip-info",
    success: "chip-success",
    warning: "chip-warning",
    danger: "chip-error",
    muted: "chip-muted",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", tones[tone])}>{label}</span>
  );
}

export function AttendancePage() {
  const queryClient = useQueryClient();
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "half_day" | "in_progress" | "absent">("all");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editBreak, setEditBreak] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const pageSize = 8;
  const attendance = useQuery({ queryKey: ["attendance"], queryFn: apiClient.attendance });
  const setApproval = useMutation({
    mutationFn: ({ entryId, status }: { entryId: string; status: "pending" | "approved" | "rejected" }) =>
      apiClient.setEntryApproval(entryId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
  const saveOverride = useMutation({
    mutationFn: apiClient.overrideAttendance,
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
    },
  });

  const filteredRows = useMemo(() => {
    const data = attendance.data ?? [];
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      const empOk = employeeFilter === "all" ? true : r.employeeName === employeeFilter;
      const searchOk = !q || r.employeeName.toLowerCase().includes(q);
      const statusOk = statusFilter === "all" ? true : r.shiftStatus === statusFilter;
      return empOk && searchOk && statusOk;
    });
  }, [attendance.data, employeeFilter, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);

  const lateCount = filteredRows.filter((r) => r.isLate).length;
  const openCount = filteredRows.filter((r) => !r.clockOutAt).length;
  const presentCount = filteredRows.filter((r) => r.shiftStatus === "present").length;
  const halfDayCount = filteredRows.filter((r) => r.shiftStatus === "half_day").length;
  const absentCount = filteredRows.filter((r) => r.shiftStatus === "absent").length;

  const columns: ColumnDef<AttendanceRow>[] = [
    { header: "Employee", accessorKey: "employeeName" },
    {
      header: "Clock in",
      cell: ({ row }) => (
        <div>
          <div>{dayjs(row.original.clockInAt).format("DD MMM YYYY, hh:mm A")}</div>
          {row.original.isLate && (
            <div className="mt-0.5 text-xs text-destructive">Late +{row.original.lateByMinutes}m</div>
          )}
        </div>
      ),
    },
    {
      header: "Clock out",
      cell: ({ row }) => (row.original.clockOutAt ? dayjs(row.original.clockOutAt).format("DD MMM, hh:mm A") : pill("Open", "warning")),
    },
    {
      header: "Break",
      cell: ({ row }) => (
        <div className="text-xs">
          <span className="font-medium">{row.original.breakMinutes}m</span>
          {row.original.onBreak && <span className="ml-2">{pill("On break", "warning")}</span>}
        </div>
      ),
    },
    { header: "Hours", cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.workedHours.toFixed(2)}</span> },
    { header: "Payable", cell: ({ row }) => money(row.original.payableAmount) },
    {
      header: "Duration",
      cell: ({ row }) => {
        if (row.original.durationIssue === "short") return pill("Short", "warning");
        if (row.original.durationIssue === "long") return pill("Long", "warning");
        return pill("OK", "success");
      },
    },
    {
      header: "Day status",
      cell: ({ row }) => {
        const s = row.original.shiftStatus;
        if (s === "present") return pill("Present", "success");
        if (s === "half_day") return pill("Half-day", "warning");
        if (s === "in_progress") return pill("In progress", "default");
        return pill("Absent", "muted");
      },
    },
    {
      header: "Approval",
      cell: ({ row }) => {
        const s = row.original.approvalStatus;
        if (s === "approved") return pill("Approved", "success");
        if (s === "rejected") return pill("Rejected", "danger");
        return pill("Pending", "warning");
      },
    },
    {
      header: "Notes",
      cell: ({ row }) => {
        const isEditing = editingId === row.original.id;
        if (isEditing) {
          return (
            <textarea
              className="w-52 rounded-md border border-border bg-card p-2 text-xs"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          );
        }
        return <span className="text-xs text-muted-foreground">{row.original.notes || "—"}</span>;
      },
    },
    {
      header: "Actions",
      meta: {
        headerClassName: "sticky right-0 z-10 bg-secondary/90 backdrop-blur-sm",
        cellClassName: "sticky right-0 z-10 bg-card",
      },
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id;
        return (
          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <input
                  className="rounded border border-border bg-card px-2 py-1 text-xs"
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                />
                <input
                  className="rounded border border-border bg-card px-2 py-1 text-xs"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                />
                <input
                  type="number"
                  className="w-20 rounded border border-border bg-card px-2 py-1 text-xs"
                  value={editBreak}
                  onChange={(e) => setEditBreak(Number(e.target.value))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    saveOverride.mutate({
                      entryId: item.id,
                      clockInAt: dayjs(editClockIn).toISOString(),
                      clockOutAt: editClockOut ? dayjs(editClockOut).toISOString() : null,
                      breakMinutes: editBreak,
                      notes: editNotes,
                    })
                  }
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(item.id);
                    setEditClockIn(dayjs(item.clockInAt).format("YYYY-MM-DD HH:mm"));
                    setEditClockOut(item.clockOutAt ? dayjs(item.clockOutAt).format("YYYY-MM-DD HH:mm") : "");
                    setEditBreak(item.breakMinutes);
                    setEditNotes(item.notes || "");
                  }}
                >
                  <PencilLine className="h-3.5 w-3.5" /> Override
                </Button>
                <Button size="sm" variant="outline" onClick={() => setApproval.mutate({ entryId: item.id, status: "approved" })}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setApproval.mutate({ entryId: item.id, status: "rejected" })}>
                  Reject
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Attendance</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-card px-3 py-2 text-sm">
            <p className="text-muted-foreground">Open sessions</p>
            <p className="font-semibold text-foreground">{openCount}</p>
          </div>
          <div className="rounded-lg border chip-error px-3 py-2 text-sm">
            <p className="text-muted-foreground">Late clock-ins</p>
            <p className="font-semibold text-error">{lateCount}</p>
          </div>
          <div className="rounded-lg border chip-success px-3 py-2 text-sm">
            <p className="text-muted-foreground">Present</p>
            <p className="font-semibold text-success">{presentCount}</p>
          </div>
          <div className="rounded-lg border chip-warning px-3 py-2 text-sm">
            <p className="text-muted-foreground">Half-day</p>
            <p className="font-semibold text-warning">{halfDayCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/65 px-3 py-2 text-sm">
            <p className="text-muted-foreground">Absent</p>
            <p className="font-semibold text-foreground">{absentCount}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-secondary/70 p-3">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredRows.length}</span> attendance logs
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-52 pl-8"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="h-8 rounded-lg border border-border bg-card px-3 text-sm"
              value={employeeFilter}
              onChange={(e) => {
                setEmployeeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All employees</option>
              {[...new Set((attendance.data ?? []).map((r) => r.employeeName))].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-lg border border-border bg-card px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "present" | "half_day" | "in_progress" | "absent");
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="present">Present</option>
              <option value="half_day">Half-day</option>
              <option value="in_progress">In progress</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        {attendance.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 rounded-lg" />
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={rows} />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
