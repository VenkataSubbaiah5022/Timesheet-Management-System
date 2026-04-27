import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";

interface Props<T> {
  columns: ColumnDef<T>[];
  data: T[];
}

export function DataTable<T>({ columns, data }: Props<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-secondary/75">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-3 py-2 text-left font-semibold text-foreground">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-center text-sm text-muted-foreground" colSpan={columns.length}>
                No records found.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-border/70 transition-colors hover:bg-secondary/55">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
