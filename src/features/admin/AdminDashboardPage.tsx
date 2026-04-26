import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiClient } from "../../services/api/client";
import { Card } from "../../shared/components/ui/card";
import { money } from "../../shared/utils/calc";

export function AdminDashboardPage() {
  const employees = useQuery({ queryKey: ["employees"], queryFn: apiClient.employees });
  const attendance = useQuery({ queryKey: ["attendance"], queryFn: apiClient.attendance });

  const totals = (attendance.data ?? []).reduce(
    (acc, row) => {
      acc.hours += row.workedHours;
      acc.payable += row.payableAmount;
      return acc;
    },
    { hours: 0, payable: 0 }
  );

  const chartData = Object.values(
    (attendance.data ?? []).reduce<Record<string, { employee: string; payable: number }>>((acc, row) => {
      if (!acc[row.employeeName]) acc[row.employeeName] = { employee: row.employeeName, payable: 0 };
      acc[row.employeeName].payable += row.payableAmount;
      return acc;
    }, {})
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-sm text-slate-500">Total Employees</p><p className="text-2xl font-bold">{employees.data?.length ?? 0}</p></Card>
        <Card><p className="text-sm text-slate-500">Total Hours</p><p className="text-2xl font-bold">{totals.hours.toFixed(2)}</p></Card>
        <Card><p className="text-sm text-slate-500">Total Payable</p><p className="text-2xl font-bold">{money(totals.payable)}</p></Card>
        <Card><p className="text-sm text-slate-500">Avg Hours/Employee</p><p className="text-2xl font-bold">{(totals.hours / Math.max(employees.data?.length ?? 1, 1)).toFixed(2)}</p></Card>
      </div>
      <Card className="h-80">
        <h3 className="mb-3 font-semibold">Payable by Employee</h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="employee" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="payable" fill="#0f172a" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
