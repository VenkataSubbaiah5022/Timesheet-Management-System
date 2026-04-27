import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Paperclip, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "../../shared/components/ui/card";
import { apiClient } from "../../services/api/client";
import type { LeaveRow } from "../../shared/types/domain";
import { useAuthStore } from "../auth/store";
import { useWorkspaceSettingsStore } from "../../services/workspaceSettingsStore";

type Draft = {
  id?: string;
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  attachmentName: string | null;
  attachmentDataUrl: string | null;
};

function emptyDraft(defaultType: string): Draft {
  return {
    type: defaultType,
    fromDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    toDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    reason: "",
    attachmentName: null,
    attachmentDataUrl: null,
  };
}

function badge(status: LeaveRow["status"]) {
  const tone: Record<LeaveRow["status"], string> = {
    pending: "chip-warning",
    approved: "chip-success",
    rejected: "chip-error",
    cancelled: "chip-muted",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${tone[status]}`}>{status}</span>;
}

export function LeaveManagementPage() {
  const user = useAuthStore((s) => s.user)!;
  const queryClient = useQueryClient();
  const isReviewer = user.role === "admin" || user.role === "manager";
  const leaveTypes = useWorkspaceSettingsStore((s) => s.settings.leave.types).filter(Boolean);
  const defaultType = leaveTypes[0] ?? "Annual";
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultType));
  const [formError, setFormError] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<LeaveRow["status"] | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromFilter, setFromFilter] = useState(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
  const [toFilter, setToFilter] = useState(dayjs().add(60, "day").format("YYYY-MM-DD"));
  const [search, setSearch] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [monthCursor, setMonthCursor] = useState(dayjs().startOf("month"));

  const allLeaves = useQuery({ queryKey: ["leaves"], queryFn: () => apiClient.leaves() });
  const myLeaves = useQuery({ queryKey: ["my-leaves", user.id], queryFn: () => apiClient.myLeaves(user.id) });
  const leaveBalance = useQuery({ queryKey: ["leave-balance", user.id], queryFn: () => apiClient.leaveBalance(user.id) });

  const applyLeave = useMutation({
    mutationFn: async () => {
      if (!draft.type.trim()) throw new Error("Please select leave type.");
      if (!draft.reason.trim() || draft.reason.trim().length < 5) {
        throw new Error("Reason must be at least 5 characters.");
      }
      if (draft.id) {
        return apiClient.updateLeave(user.id, draft.id, {
          type: draft.type,
          fromDate: draft.fromDate,
          toDate: draft.toDate,
          reason: draft.reason,
          attachmentName: draft.attachmentName,
          attachmentDataUrl: draft.attachmentDataUrl,
        });
      }
      return apiClient.applyLeave(user.id, {
        type: draft.type,
        fromDate: draft.fromDate,
        toDate: draft.toDate,
        reason: draft.reason,
        attachmentName: draft.attachmentName,
        attachmentDataUrl: draft.attachmentDataUrl,
      });
    },
    onSuccess: () => {
      setFormError(null);
      setDraft(emptyDraft(defaultType));
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["my-leaves", user.id] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance", user.id] });
    },
    onError: (err) => setFormError((err as Error).message),
  });

  const cancelLeave = useMutation({
    mutationFn: (leaveId: string) => apiClient.cancelLeave(user.id, leaveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["my-leaves", user.id] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance", user.id] });
    },
  });

  const reviewLeave = useMutation({
    mutationFn: (vars: { leaveId: string; status: "approved" | "rejected"; reviewerComment: string }) =>
      apiClient.reviewLeave(user.id, vars),
    onSuccess: () => {
      setReviewComment("");
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
    },
  });

  const source = isReviewer ? allLeaves.data ?? [] : myLeaves.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dayjs(fromFilter).startOf("day");
    const to = dayjs(toFilter).endOf("day");
    return source.filter((l) => {
      const employeeOk = isReviewer ? (employeeFilter === "all" ? true : l.employeeName === employeeFilter) : true;
      const statusOk = statusFilter === "all" ? true : l.status === statusFilter;
      const typeOk = typeFilter === "all" ? true : l.type === typeFilter;
      const qOk = !q || l.employeeName.toLowerCase().includes(q) || l.reason.toLowerCase().includes(q);
      const d = dayjs(l.fromDate);
      const dateOk = (d.isAfter(from) || d.isSame(from)) && (d.isBefore(to) || d.isSame(to));
      return employeeOk && statusOk && typeOk && qOk && dateOk;
    });
  }, [source, isReviewer, employeeFilter, statusFilter, typeFilter, search, fromFilter, toFilter]);

  const monthDays = useMemo(() => {
    const start = monthCursor.startOf("month");
    const startOffset = start.day();
    const first = start.subtract(startOffset, "day");
    return Array.from({ length: 42 }, (_, i) => first.add(i, "day"));
  }, [monthCursor]);

  const leavesForCalendar = isReviewer ? filtered : myLeaves.data ?? [];

  const onAttachment = (file: File | null) => {
    if (!file) return;
    if (file.size > 280 * 1024) {
      setFormError("Attachment should be under ~250KB for this demo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === "string" ? reader.result : null;
      setDraft((d) => ({ ...d, attachmentName: file.name, attachmentDataUrl: data }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h2 className="text-lg font-semibold text-foreground">{draft.id ? "Edit Leave Request" : "Apply Leave"}</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Type</label>
            <select
              className="h-8 w-full rounded-lg border border-border bg-card px-2 text-sm"
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
            >
              {leaveTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Attachment (optional)</label>
            <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2 text-sm">
              <Paperclip className="h-4 w-4" />
              <span className="truncate">{draft.attachmentName ?? "Upload proof (medical, etc.)"}</span>
              <input type="file" className="hidden" onChange={(e) => onAttachment(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">From</label>
            <Input type="date" value={draft.fromDate} onChange={(e) => setDraft((d) => ({ ...d, fromDate: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">To</label>
            <Input type="date" value={draft.toDate} onChange={(e) => setDraft((d) => ({ ...d, toDate: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Reason</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
              value={draft.reason}
              onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
              placeholder="Reason for leave..."
            />
          </div>
        </div>
        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => applyLeave.mutate()} disabled={applyLeave.isPending}>
            {applyLeave.isPending ? "Saving..." : draft.id ? "Update request" : "Apply leave"}
          </Button>
          {draft.id ? (
            <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft(defaultType))}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="text-base font-semibold text-foreground">Filters</h3>
        <div className="grid gap-2 md:grid-cols-6">
          {isReviewer ? (
            <select
              className="h-8 rounded-lg border border-border bg-card px-2 text-sm"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
            >
              <option value="all">All employees</option>
              {[...new Set(source.map((s) => s.employeeName))].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          ) : null}
          <select
            className="h-8 rounded-lg border border-border bg-card px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="h-8 rounded-lg border border-border bg-card px-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            {leaveTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Input type="date" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} />
          <Input type="date" value={toFilter} onChange={(e) => setToFilter(e.target.value)} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2 p-4">
          <h3 className="text-sm font-semibold text-foreground">Leave balance</h3>
          <p className="text-xs text-muted-foreground">Current year (paid policy)</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-card px-2 py-1">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold text-foreground">{leaveBalance.data?.total ?? 0}</p>
            </div>
            <div className="rounded-lg border border-accent/25 bg-gradient-to-br from-accent/[0.09] to-card px-2 py-1">
              <p className="text-xs text-muted-foreground">Used</p>
              <p className="font-semibold text-foreground">{leaveBalance.data?.used ?? 0}</p>
            </div>
            <div className="rounded-lg border chip-success px-2 py-1">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="font-semibold text-foreground">{leaveBalance.data?.remaining ?? 0}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Pending: {leaveBalance.data?.pending ?? 0} day(s)</p>
        </Card>

        <Card className="space-y-2 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Leave history</h3>
            <p className="text-xs text-muted-foreground">{filtered.length} records</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/70">
                <tr>
                  <th className="px-2 py-2 text-left">Employee</th>
                  <th className="px-2 py-2 text-left">Type</th>
                  <th className="px-2 py-2 text-left">Range</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Reason</th>
                  <th className="px-2 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const ownPending = row.employeeUserId === user.id && row.status === "pending";
                  return (
                    <tr key={row.id} className="border-t border-border/70">
                      <td className="px-2 py-2 text-foreground">{row.employeeName}</td>
                      <td className="px-2 py-2 text-muted-foreground">{row.type}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {dayjs(row.fromDate).format("DD MMM")} - {dayjs(row.toDate).format("DD MMM")}
                      </td>
                      <td className="px-2 py-2">{badge(row.status)}</td>
                      <td className="max-w-[260px] truncate px-2 py-2 text-muted-foreground">{row.reason}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {ownPending ? (
                            <>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() =>
                                  setDraft({
                                    id: row.id,
                                    type: row.type,
                                    fromDate: dayjs(row.fromDate).format("YYYY-MM-DD"),
                                    toDate: dayjs(row.toDate).format("YYYY-MM-DD"),
                                    reason: row.reason,
                                    attachmentName: row.attachmentName,
                                    attachmentDataUrl: row.attachmentDataUrl,
                                  })
                                }
                              >
                                Edit
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => cancelLeave.mutate(row.id)}>
                                Cancel
                              </Button>
                            </>
                          ) : null}
                          {isReviewer && row.status === "pending" ? (
                            <>
                              <Button size="xs" variant="outline" onClick={() => reviewLeave.mutate({ leaveId: row.id, status: "approved", reviewerComment: reviewComment })}>
                                Approve
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => reviewLeave.mutate({ leaveId: row.id, status: "rejected", reviewerComment: reviewComment })}>
                                Reject
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground">
                      No leave records match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {isReviewer ? (
            <Input
              placeholder="Reviewer comment (optional, used on approve/reject)"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          ) : null}
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4" /> Monthly leave calendar
          </h3>
          <div className="flex items-center gap-2">
            <Button size="xs" variant="outline" onClick={() => setMonthCursor((m) => m.subtract(1, "month"))}>
              Prev
            </Button>
            <p className="text-xs text-muted-foreground">{monthCursor.format("MMMM YYYY")}</p>
            <Button size="xs" variant="outline" onClick={() => setMonthCursor((m) => m.add(1, "month"))}>
              Next
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-1 py-0.5 text-center font-medium">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((d) => {
            const inMonth = d.month() === monthCursor.month();
            const leavesForDay = leavesForCalendar.filter((l) =>
              (d.isAfter(dayjs(l.fromDate).subtract(1, "day"), "day") || d.isSame(dayjs(l.fromDate), "day")) &&
              (d.isBefore(dayjs(l.toDate).add(1, "day"), "day") || d.isSame(dayjs(l.toDate), "day"))
            );
            return (
              <div
                key={d.toISOString()}
                className={`min-h-16 rounded-md border p-1 ${
                  inMonth
                    ? "border-border bg-card"
                    : "border-border/60 bg-secondary/60 text-muted-foreground"
                }`}
              >
                <p className="text-[10px]">{d.date()}</p>
                <div className="mt-1 space-y-0.5">
                  {leavesForDay.slice(0, 2).map((l) => (
                    <p key={`${l.id}-${d.date()}`} className="truncate rounded bg-primary/10 px-1 text-[10px] text-primary">
                      {isReviewer ? l.employeeName : l.type}
                    </p>
                  ))}
                  {leavesForDay.length > 2 ? <p className="text-[10px] text-muted-foreground">+{leavesForDay.length - 2} more</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

