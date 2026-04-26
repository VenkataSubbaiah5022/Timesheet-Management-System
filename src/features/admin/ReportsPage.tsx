import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import Papa from "papaparse";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/api/client";
import { Button } from "../../shared/components/ui/button";
import { Card } from "../../shared/components/ui/card";
import { money } from "../../shared/utils/calc";

export function ReportsPage() {
  const attendance = useQuery({ queryKey: ["attendance"], queryFn: apiClient.attendance });
  const rows = attendance.data ?? [];
  const total = rows.reduce((sum, row) => sum + row.payableAmount, 0);

  const downloadCsv = () => {
    const csv = Papa.unparse(
      rows.map((r) => ({
        employee: r.employeeName,
        clockIn: r.clockInAt,
        clockOut: r.clockOutAt ?? "",
        workedHours: r.workedHours,
        payableAmount: r.payableAmount,
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
    autoTable(doc, {
      startY: 20,
      head: [["Employee", "Clock In", "Clock Out", "Hours", "Payable"]],
      body: rows.map((r) => [r.employeeName, r.clockInAt, r.clockOutAt ?? "-", String(r.workedHours), String(r.payableAmount)]),
    });
    doc.text(`Total Payable: ${money(total)}`, 14, 280);
    doc.save("timesheet-report.pdf");
  };

  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">Reports</h3>
      <p className="text-sm text-slate-600">Total payable amount: {money(total)}</p>
      <div className="flex gap-2">
        <Button onClick={downloadCsv}>Download CSV</Button>
        <Button onClick={downloadPdf}>Download PDF</Button>
      </div>
    </Card>
  );
}
