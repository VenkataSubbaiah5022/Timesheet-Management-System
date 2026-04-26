import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InAppNotification } from "./store";
import { useNotificationsStore } from "./store";

dayjs.extend(relativeTime);

export function NotificationsContent({ className, compact }: { className?: string; compact?: boolean }) {
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  if (items.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        <p>No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="xs" className="text-muted-foreground" onClick={() => markAllRead()}>
          Mark all read
        </Button>
      </div>
      <ul className={cn("flex flex-col gap-2", compact ? "max-h-[min(70vh,28rem)] overflow-y-auto pr-1" : "max-h-[min(60vh,24rem)] overflow-y-auto pr-1")}>
        {items.map((n) => (
          <NotificationRow key={n.id} n={n} onRead={() => markRead(n.id)} />
        ))}
      </ul>
    </div>
  );
}

function NotificationRow({ n, onRead }: { n: InAppNotification; onRead: () => void }) {
  return (
    <li
      className={cn(
        "rounded-lg border border-slate-200/80 bg-white p-3 text-sm shadow-sm transition-colors dark:border-slate-800/50 dark:bg-card",
        !n.read && "border-primary/20 bg-primary/[0.04] dark:border-primary/25 dark:bg-primary/10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{n.title}</p>
          <p className="mt-0.5 text-muted-foreground">{n.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">{dayjs(n.createdAt).fromNow()}</p>
        </div>
        {!n.read && (
          <Button type="button" variant="outline" size="xs" onClick={onRead}>
            Read
          </Button>
        )}
      </div>
    </li>
  );
}
