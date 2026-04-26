import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "../../services/api/client";
import type { AttendanceRow } from "../../services/api/client";
import { DataTable } from "../../shared/components/DataTable";
import { money } from "../../shared/utils/calc";

export function AttendancePage() {
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const attendance = useQuery({ queryKey: ["attendance"], queryFn: apiClient.attendance });
  const rows = useMemo(
    () => (attendance.data ?? []).filter((r) => (employeeFilter === "all" ? true : r.employeeName === employeeFilter)),
    [attendance.data, employeeFilter]
  );

  const columns: ColumnDef<AttendanceRow>[] = [
    { header: "Employee", accessorKey: "employeeName" },
    { header: "Clock In", cell: ({ row }) => dayjs(row.original.clockInAt).format("DD MMM YYYY, hh:mm A") },
    { header: "Clock Out", cell: ({ row }) => row.original.clockOutAt ? dayjs(row.original.clockOutAt).format("DD MMM YYYY, hh:mm A") : "Open" },
    { header: "Hours", accessorKey: "workedHours" },
    { header: "Payable", cell: ({ row }) => money(row.original.payableAmount) },
  ];

  return (
    <div className="space-y-3">
      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
        <option value="all">All employees</option>
        {[...new Set((attendance.data ?? []).map((r) => r.employeeName))].map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      <DataTable columns={columns} data={rows} />
    </div>
  );
}
