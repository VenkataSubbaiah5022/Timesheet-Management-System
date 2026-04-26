import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { apiClient } from "../../services/api/client";
import type { AttendanceRow } from "../../services/api/client";
import { DataTable } from "../../shared/components/DataTable";
import { useAuthStore } from "../auth/store";
import { money } from "../../shared/utils/calc";

export function MyTimesheetPage() {
  const user = useAuthStore((s) => s.user)!;
  const attendance = useQuery({ queryKey: ["my-attendance", user.id], queryFn: () => apiClient.myAttendance(user.id) });
  const totalPayable = (attendance.data ?? []).reduce((sum, row) => sum + row.payableAmount, 0);
  const totalHours = (attendance.data ?? []).reduce((sum, row) => sum + row.workedHours, 0);

  const columns: ColumnDef<AttendanceRow>[] = [
    { header: "Date", cell: ({ row }) => dayjs(row.original.clockInAt).format("DD MMM YYYY") },
    { header: "Clock In", cell: ({ row }) => dayjs(row.original.clockInAt).format("hh:mm A") },
    { header: "Clock Out", cell: ({ row }) => row.original.clockOutAt ? dayjs(row.original.clockOutAt).format("hh:mm A") : "Open" },
    { header: "Hours", accessorKey: "workedHours" },
    { header: "Payable", cell: ({ row }) => money(row.original.payableAmount) },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
        Total hours: <b>{totalHours.toFixed(2)}</b> | Estimated payable: <b>{money(totalPayable)}</b>
      </div>
      <DataTable columns={columns} data={attendance.data ?? []} />
    </div>
  );
}
