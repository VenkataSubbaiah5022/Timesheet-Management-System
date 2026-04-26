import { Card } from "../../shared/components/ui/card";
import { useAuthStore } from "../auth/store";
import { appBasePath } from "../auth/routes";
import { NotificationsContent } from "./NotificationsContent";

export function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const base = user ? appBasePath(user.role) : "/employee";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">Alerts mirror the panel in the header. Unread items are highlighted.</p>
      </div>
      <Card className="p-4">
        <NotificationsContent />
      </Card>
      {(user?.role === "admin" || user?.role === "manager") && (
        <p className="text-xs text-muted-foreground">
          Tip: open <span className="font-medium text-foreground">{base}/activity</span> for a full audit trail.
        </p>
      )}
    </div>
  );
}
