import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "../../services/api/client";
import { Card } from "../../shared/components/ui/card";
import { money } from "../../shared/utils/calc";

export function AdminDashboardPage() {
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [fromDate, setFromDate] = useState(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
  const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));

  const employees = useQuery({ queryKey: ["employees"], queryFn: apiClient.employees });
  const attendance = useQuery({ queryKey: ["attendance"], queryFn: apiClient.attendance });

  const filteredRows = useMemo(() => {
    const from = dayjs(fromDate).startOf("day");
    const to = dayjs(toDate).endOf("day");
    return (attendance.data ?? []).filter((row) => {
      const byEmployee = employeeFilter === "all" ? true : row.employeeName === employeeFilter;
      const date = dayjs(row.clockInAt);
      const byDate = (date.isAfter(from) || date.isSame(from)) && (date.isBefore(to) || date.isSame(to));
      return byEmployee && byDate;
    });
  }, [attendance.data, employeeFilter, fromDate, toDate]);

  const totals = filteredRows.reduce(
    (acc, row) => {
      acc.hours += row.workedHours;
      acc.payable += row.payableAmount;
      if (row.workedHours > 8) {
        const overtimeHours = row.workedHours - 8;
        acc.overtimeHours += overtimeHours;
        acc.overtimeCost += overtimeHours * row.hourlyRate * 1.5;
      }
      return acc;
    },
    { hours: 0, payable: 0, overtimeHours: 0, overtimeCost: 0 }
  );

  const regularCost = Math.max(totals.payable - totals.overtimeCost, 0);

  const byEmployee = Object.values(
    filteredRows.reduce<Record<string, { employee: string; payable: number; hours: number }>>((acc, row) => {
      if (!acc[row.employeeName]) acc[row.employeeName] = { employee: row.employeeName, payable: 0, hours: 0 };
      acc[row.employeeName].payable += row.payableAmount;
      acc[row.employeeName].hours += row.workedHours;
      return acc;
    }, {})
  );

  const topPerformer = byEmployee
    .slice()
    .sort((a, b) => b.hours - a.hours)[0];

  const trendData = Object.values(
    filteredRows.reduce<Record<string, { date: string; hours: number }>>((acc, row) => {
      const key = dayjs(row.clockInAt).format("DD MMM");
      if (!acc[key]) acc[key] = { date: key, hours: 0 };
      acc[key].hours += row.workedHours;
      return acc;
    }, {})
  );

  const pieData = byEmployee.map((item) => ({
    name: item.employee,
    value: Number(item.payable.toFixed(2)),
  }));

  const pieColors = ["var(--accent)", "var(--info)", "var(--success)", "var(--warning)", "var(--sidebar-accent)"];
  const tooltipCard = ({ label, value }: { label: string; value: string }) => (
    <div className="glass-panel rounded-lg border px-3 py-2 shadow-premium">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );

  if (employees.isLoading || attendance.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Dashboard Filters</h2>
        <div className="grid gap-2 md:grid-cols-4">
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
          <div className="self-end text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredRows.length}</span> entries
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.04] to-card">
          <p className="text-sm text-muted-foreground">Total Employees</p>
          <p className="text-2xl font-bold text-foreground">{employees.data?.length ?? 0}</p>
        </Card>
        <Card className="border-border bg-gradient-to-br from-secondary to-card">
          <p className="text-sm text-muted-foreground">Total Hours</p>
          <p className="text-2xl font-bold text-foreground">{totals.hours.toFixed(2)}</p>
        </Card>
        <Card className="border-accent/25 bg-gradient-to-br from-accent/[0.11] to-card">
          <p className="text-sm text-muted-foreground">Total Payable</p>
          <p className="text-2xl font-bold text-foreground">{money(totals.payable)}</p>
        </Card>
        <Card className="border-border bg-gradient-to-br from-secondary to-card">
          <p className="text-sm text-muted-foreground">Overtime Hours</p>
          <p className="text-2xl font-bold text-foreground">{totals.overtimeHours.toFixed(2)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 h-80">
          <h3 className="mb-3 font-semibold">Hours Trend</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={trendData}>
              <defs>
                <linearGradient id="hoursStroke" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--accent)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length
                    ? tooltipCard({ label: String(label), value: `${Number(payload[0]?.value ?? 0).toFixed(2)} hours` })
                    : null
                }
              />
              <Line type="monotone" dataKey="hours" stroke="url(#hoursStroke)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-80">
          <h3 className="mb-3 font-semibold">Payroll Distribution</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={95} label>
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => money(Number(v ?? 0))}
                content={({ active, payload }) =>
                  active && payload?.length
                    ? tooltipCard({
                        label: String(payload[0]?.name ?? "Value"),
                        value: money(Number(payload[0]?.value ?? 0)),
                      })
                    : null
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Top Performer</p>
          <p className="text-lg font-semibold text-foreground">{topPerformer?.employee ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{topPerformer ? `${topPerformer.hours.toFixed(2)}h in selected period` : "No data for selected filters"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Overtime Cost</p>
          <p className="text-lg font-semibold text-warning">{money(totals.overtimeCost)}</p>
          <p className="text-xs text-muted-foreground">Calculated at 1.5x hourly rate above 8h/day</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Cost Breakdown</p>
          <p className="text-xs text-muted-foreground mt-1">Regular: <span className="font-semibold text-foreground">{money(regularCost)}</span></p>
          <p className="text-xs text-muted-foreground">Overtime: <span className="font-semibold text-foreground">{money(totals.overtimeCost)}</span></p>
          <p className="text-xs text-muted-foreground">Total: <span className="font-semibold text-foreground">{money(totals.payable)}</span></p>
        </Card>
      </div>
    </div>
  );
}
