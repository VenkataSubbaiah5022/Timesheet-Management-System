import dayjs from "dayjs";
import { Card } from "../../shared/components/ui/card";
import { listActivityLog, type ActivityLogEntry } from "../../services/activityLog";

export function ActivityLogsPage() {
  const entries = listActivityLog(150);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Activity log</h1>
        <p className="text-sm text-muted-foreground">Recent actions across the workspace (mock persistence in this browser).</p>
      </div>
      <Card className="overflow-hidden">
        <div className="max-h-[min(70vh,32rem)] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-secondary/85 backdrop-blur-sm">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-foreground">When</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">Action</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">Detail</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">Actor</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    No activity recorded yet. Approve attendance, edit employees, or clock in to generate entries.
                  </td>
                </tr>
              ) : (
                entries.map((e) => <ActivityRow key={e.id} e={e} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ActivityRow({ e }: { e: ActivityLogEntry }) {
  const who = e.actorName ? `${e.actorName}${e.actorRole ? ` · ${e.actorRole}` : ""}` : "—";
  return (
    <tr className="border-b border-border/70 last:border-0 hover:bg-secondary/55">
      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{dayjs(e.at).format("MMM D, YYYY HH:mm")}</td>
      <td className="px-3 py-2 font-medium text-foreground">{e.action}</td>
      <td className="max-w-[280px] truncate px-3 py-2 text-muted-foreground">{e.detail ?? "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{who}</td>
    </tr>
  );
}
