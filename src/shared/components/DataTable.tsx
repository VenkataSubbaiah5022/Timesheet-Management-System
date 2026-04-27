import { useMemo, useState, type ReactNode } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

interface Props<T> {
  columns: ColumnDef<T>[];
  data: T[];
  bulkActions?: (selectedRows: T[], clearSelection: () => void) => ReactNode;
}

export function DataTable<T>({ columns, data, bulkActions }: Props<T>) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const withSelection = useMemo<ColumnDef<T>[]>(() => {
    if (!bulkActions) return columns;
    const selectionColumn: ColumnDef<T> = {
      id: "__select__",
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Select all rows"
          checked={table.getIsAllRowsSelected()}
          onChange={(e) => table.toggleAllRowsSelected(e.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Select row"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
        />
      ),
    };
    return [selectionColumn, ...columns];
  }, [bulkActions, columns]);

  const table = useReactTable({
    data,
    columns: withSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: Boolean(bulkActions),
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
  });
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);

  const clearSelection = () => setRowSelection({});
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-premium">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-secondary/85 backdrop-blur-sm">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className={`px-3 py-2 text-left font-semibold text-foreground ${((h.column.columnDef.meta as { headerClassName?: string } | undefined)?.headerClassName ?? "")}`}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-muted-foreground" colSpan={withSelection.length}>
                  No records found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  style={{ animationDelay: `${Math.min(Number(row.index ?? 0) * 18, 180)}ms` }}
                  className="animate-in fade-in-0 slide-in-from-bottom-1 border-t border-border/70 transition-colors duration-200 hover:bg-secondary/55"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-3 py-2.5 align-middle ${((cell.column.columnDef.meta as { cellClassName?: string } | undefined)?.cellClassName ?? "")}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {bulkActions && selectedRows.length > 0 ? (
        <div className="animate-in slide-in-from-bottom-2 fixed inset-x-4 bottom-4 z-30 rounded-xl border border-border bg-card p-3 shadow-premium-lg md:inset-x-auto md:right-6 md:w-[28rem]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-foreground">{selectedRows.length} row(s) selected</p>
            <Button size="xs" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">{bulkActions(selectedRows, clearSelection)}</div>
        </div>
      ) : null}
    </div>
  );
}
