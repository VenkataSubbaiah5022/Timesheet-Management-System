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

  const pieColors = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1"];

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Dashboard Filters</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">From</label>
            <input
              type="date"
              className="h-8 w-full rounded-lg border border-slate-300 px-2 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">To</label>
            <input
              type="date"
              className="h-8 w-full rounded-lg border border-slate-300 px-2 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">Employee</label>
            <select
              className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
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
          <div className="self-end text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filteredRows.length}</span> entries
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-sm text-slate-500">Total Employees</p><p className="text-2xl font-bold">{employees.data?.length ?? 0}</p></Card>
        <Card><p className="text-sm text-slate-500">Total Hours</p><p className="text-2xl font-bold">{totals.hours.toFixed(2)}</p></Card>
        <Card><p className="text-sm text-slate-500">Total Payable</p><p className="text-2xl font-bold">{money(totals.payable)}</p></Card>
        <Card><p className="text-sm text-slate-500">Overtime Hours</p><p className="text-2xl font-bold">{totals.overtimeHours.toFixed(2)}</p></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 h-80">
          <h3 className="mb-3 font-semibold">Hours Trend</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#0f172a" strokeWidth={2} dot={false} />
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
              <Tooltip formatter={(v) => money(Number(v ?? 0))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Top Performer</p>
          <p className="text-lg font-semibold text-slate-900">{topPerformer?.employee ?? "—"}</p>
          <p className="text-xs text-slate-500">{topPerformer ? `${topPerformer.hours.toFixed(2)}h in selected period` : "No data for selected filters"}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Overtime Cost</p>
          <p className="text-lg font-semibold text-amber-700">{money(totals.overtimeCost)}</p>
          <p className="text-xs text-slate-500">Calculated at 1.5x hourly rate above 8h/day</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Cost Breakdown</p>
          <p className="text-xs text-slate-500 mt-1">Regular: <span className="font-semibold text-slate-900">{money(regularCost)}</span></p>
          <p className="text-xs text-slate-500">Overtime: <span className="font-semibold text-slate-900">{money(totals.overtimeCost)}</span></p>
          <p className="text-xs text-slate-500">Total: <span className="font-semibold text-slate-900">{money(totals.payable)}</span></p>
        </Card>
      </div>
    </div>
  );
}
