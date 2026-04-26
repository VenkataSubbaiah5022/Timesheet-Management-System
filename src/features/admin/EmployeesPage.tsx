import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { PencilLine, Search, Trash2, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "../../services/api/client";
import { useWorkspaceSettingsStore } from "../../services/workspaceSettingsStore";
import { DataTable } from "../../shared/components/DataTable";
import { Card } from "../../shared/components/ui/card";
import { Input } from "../../shared/components/ui/input";

type EmployeeListRow = Awaited<ReturnType<typeof apiClient.employees>>[number];

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const defaultHourlyRate = useWorkspaceSettingsStore((s) => s.settings.defaults.defaultHourlyRate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hourlyRate, setHourlyRate] = useState(defaultHourlyRate);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const pageSize = 5;
  const employees = useQuery({ queryKey: ["employees"], queryFn: apiClient.employees });

  useEffect(() => {
    if (!editingId) setHourlyRate(defaultHourlyRate);
  }, [defaultHourlyRate, editingId]);

  const save = useMutation({
    mutationFn: apiClient.upsertEmployee,
    onSuccess: () => {
      setEditingId(null);
      setName("");
      setEmail("");
      setHourlyRate(defaultHourlyRate);
      setStatus("active");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setFeedback({ type: "success", message: "Employee details saved successfully." });
    },
    onError: (error) => setFeedback({ type: "error", message: (error as Error).message }),
  });

  const deleteEmployee = useMutation({
    mutationFn: apiClient.deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setFeedback({ type: "success", message: "Employee deleted successfully." });
    },
    onError: (error) => setFeedback({ type: "error", message: (error as Error).message }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) => apiClient.updateEmployeeStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setFeedback({ type: "success", message: `Employee marked as ${vars.status}.` });
    },
    onError: (error) => setFeedback({ type: "error", message: (error as Error).message }),
  });

  const filteredData = useMemo(() => {
    const data = employees.data ?? [];
    const q = search.trim().toLowerCase();
    return data.filter((employee) => {
      const matchesSearch = !q || employee.name.toLowerCase().includes(q) || employee.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" ? true : employee.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees.data, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);
  const activeCount = filteredData.filter((employee) => employee.status === "active").length;
  const inactiveCount = filteredData.length - activeCount;

  const columns: ColumnDef<EmployeeListRow>[] = [
    { header: "Name", accessorKey: "name" },
    { header: "Email", accessorKey: "email" },
    { header: "Hourly Rate", cell: ({ row }) => <span className="font-medium text-slate-700">INR {row.original.hourlyRate}</span> },
    {
      header: "Status",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className={`rounded-full border ${row.original.status === "active" ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          onClick={() => updateStatus.mutate({ id: row.original.id, status: row.original.status === "active" ? "inactive" : "active" })}
          disabled={updateStatus.isPending}
        >
          {row.original.status === "active" ? "Active" : "Inactive"}
        </Button>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingId(row.original.id);
              setName(row.original.name);
              setEmail(row.original.email);
              setHourlyRate(row.original.hourlyRate);
              setStatus(row.original.status);
            }}
          >
            <PencilLine className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteEmployee.isPending}
            onClick={() => {
              if (window.confirm(`Delete ${row.original.name}?`)) {
                deleteEmployee.mutate(row.original.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      ),
    },
  ];

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ id: editingId ?? undefined, name, email, hourlyRate, status });
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{editingId ? "Edit Employee" : "Add Employee"}</h3>
          {!editingId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              <UserRoundPlus className="h-3.5 w-3.5" /> New employee
            </span>
          )}
        </div>
        <form onSubmit={onSubmit} className="grid gap-2 md:grid-cols-4">
          <Input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input required type="number" placeholder="Hourly Rate" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
          <div className="flex gap-2 md:col-span-4">
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update Employee" : "Add Employee"}</Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setName("");
                  setEmail("");
                  setHourlyRate(defaultHourlyRate);
                  setStatus("active");
                }}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filteredData.length}</span> employees •
            Active <span className="font-semibold text-emerald-700">{activeCount}</span> •
            Inactive <span className="font-semibold text-slate-700">{inactiveCount}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="w-56 pl-8" placeholder="Search name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select
              className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "active" | "inactive");
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {employees.isLoading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
            Loading employee records...
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={paginatedData} />
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
