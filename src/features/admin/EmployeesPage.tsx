import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import type { FormEvent } from "react";
import { apiClient } from "../../services/api/client";
import { DataTable } from "../../shared/components/DataTable";
import { Button } from "../../shared/components/ui/button";
import { Card } from "../../shared/components/ui/card";
import { Input } from "../../shared/components/ui/input";

type EmployeeListRow = Awaited<ReturnType<typeof apiClient.employees>>[number];

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hourlyRate, setHourlyRate] = useState(350);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const employees = useQuery({ queryKey: ["employees"], queryFn: apiClient.employees });
  const save = useMutation({
    mutationFn: apiClient.upsertEmployee,
    onSuccess: () => {
      setName("");
      setEmail("");
      setHourlyRate(350);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const columns: ColumnDef<EmployeeListRow>[] = [
    { header: "Name", accessorKey: "name" },
    { header: "Email", accessorKey: "email" },
    { header: "Hourly Rate", cell: ({ row }) => `INR ${row.original.hourlyRate}` },
    { header: "Status", accessorKey: "status" },
  ];

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ name, email, hourlyRate, status });
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-2 font-semibold">Add Employee</h3>
        <form onSubmit={onSubmit} className="grid gap-2 md:grid-cols-4">
          <Input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input required type="number" placeholder="Hourly Rate" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
          <Button type="submit" className="md:col-span-4">{save.isPending ? "Saving..." : "Add Employee"}</Button>
        </form>
      </Card>
      <DataTable columns={columns} data={employees.data ?? []} />
    </div>
  );
}
