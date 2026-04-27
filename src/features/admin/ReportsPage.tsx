import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import Papa from "papaparse";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "../../services/api/client";
import { Card } from "../../shared/components/ui/card";
import { money } from "../../shared/utils/calc";

export function ReportsPage() {
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [fromDate, setFromDate] = useState(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
  const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [search, setSearch] = useState("");
  const [scheduleFrequency, setScheduleFrequency] = useState<"weekly" | "monthly">("weekly");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [emailTo, setEmailTo] = useState("finance@demo.com");
  const [emailSubject, setEmailSubject] = useState("Timesheet Report");
  const [mockMessage, setMockMessage] = useState<string | null>(null);

  const employees = useQuery({ queryKey: ["employees"], queryFn: apiClient.employees });
  const attendance = useQuery({ queryKey: ["attendance"], queryFn: apiClient.attendance });

  const rows = useMemo(() => {
    const from = dayjs(fromDate).startOf("day");
    const to = dayjs(toDate).endOf("day");
    const q = search.trim().toLowerCase();
    return (attendance.data ?? []).filter((row) => {
      const employeeOk = employeeFilter === "all" ? true : row.employeeName === employeeFilter;
      const date = dayjs(row.clockInAt);
      const dateOk = (date.isAfter(from) || date.isSame(from)) && (date.isBefore(to) || date.isSame(to));
      const searchOk = !q || row.employeeName.toLowerCase().includes(q);
      return employeeOk && dateOk && searchOk;
    });
  }, [attendance.data, employeeFilter, fromDate, toDate, search]);

  const total = rows.reduce((sum, row) => sum + row.payableAmount, 0);
  const approvedCount = rows.filter((r) => r.approvalStatus === "approved").length;
  const pendingCount = rows.filter((r) => r.approvalStatus === "pending").length;

  if (employees.isLoading || attendance.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    );
  }

  const downloadCsv = () => {
    const csv = Papa.unparse(
      rows.map((r) => ({
        employee: r.employeeName,
        clockIn: r.clockInAt,
        clockOut: r.clockOutAt ?? "",
        workedHours: r.workedHours,
        payableAmount: r.payableAmount,
        approvalStatus: r.approvalStatus,
        notes: r.notes,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "timesheet-report.csv";
    link.click();
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.text("Timesheet Report", 14, 14);
    doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 20);
    doc.text(`Employee: ${employeeFilter === "all" ? "All" : employeeFilter}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [["Employee", "Clock In", "Clock Out", "Hours", "Payable", "Approval"]],
      body: rows.map((r) => [r.employeeName, r.clockInAt, r.clockOutAt ?? "-", String(r.workedHours), String(r.payableAmount), r.approvalStatus]),
    });
    doc.text(`Total Payable: ${money(total)}`, 14, 280);
    doc.save("timesheet-report.pdf");
  };

  return (
    <div className="space-y-4">
      {mockMessage && <div className="chip-success rounded-lg border px-3 py-2 text-sm">{mockMessage}</div>}

      <Card className="space-y-3">
        <h3 className="font-semibold">Report Filters</h3>
        <div className="grid gap-2 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">From</label>
            <input
              type="date"
              className="h-8 w-full rounded-lg border border-border bg-card px-2 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">To</label>
            <input
              type="date"
              className="h-8 w-full rounded-lg border border-border bg-card px-2 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Employee</label>
            <select
              className="h-8 w-full rounded-lg border border-border bg-card px-2 text-sm"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
            >
              <option value="all">All employees</option>
              {(employees.data ?? []).map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Quick Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input className="h-8 pl-8" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold">Download Reports</h3>
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div className="rounded-lg border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-card px-3 py-2">
            <p className="text-muted-foreground">Matched Entries</p>
            <p className="font-semibold text-foreground">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-accent/25 bg-gradient-to-br from-accent/[0.1] to-card px-3 py-2">
            <p className="text-muted-foreground">Approved / Pending</p>
            <p className="font-semibold text-foreground">{approvedCount} / {pendingCount}</p>
          </div>
          <div className="rounded-lg border chip-success px-3 py-2">
            <p className="text-muted-foreground">Total Payable</p>
            <p className="font-semibold text-foreground">{money(total)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadCsv}>Download CSV</Button>
          <Button variant="outline" onClick={downloadPdf}>Download PDF</Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Scheduled Reports (Mock)</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Frequency</label>
              <select
                className="h-8 w-full rounded-lg border border-border bg-card px-2 text-sm"
                value={scheduleFrequency}
                onChange={(e) => setScheduleFrequency(e.target.value as "weekly" | "monthly")}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Time</label>
              <input
                type="time"
                className="h-8 w-full rounded-lg border border-border bg-card px-2 text-sm"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setScheduleEnabled((v) => !v);
              setMockMessage(`Scheduled report ${scheduleEnabled ? "disabled" : "enabled"} (${scheduleFrequency} at ${scheduleTime}) [mock].`);
            }}
          >
            {scheduleEnabled ? "Disable Schedule" : "Enable Schedule"}
          </Button>
        </Card>

        <Card className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Email Report (Mock)</h3>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Recipient Email</label>
            <Input className="h-8" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Subject</label>
            <Input className="h-8" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() =>
              setMockMessage(`Report email queued to ${emailTo} with subject "${emailSubject}" [mock feature].`)
            }
          >
            Send Email Report
          </Button>
        </Card>
      </div>
    </div>
  );
}
