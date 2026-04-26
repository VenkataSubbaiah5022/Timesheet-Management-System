import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import { appBasePath } from "../auth/routes";
import { Card } from "../../shared/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWorkspaceSettingsStore } from "../../services/workspaceSettingsStore";
import type { FeatureFlags } from "../../shared/types/workspace";

export function FeatureGate({
  feature,
  children,
}: PropsWithChildren<{ feature: keyof FeatureFlags }>) {
  const user = useAuthStore((s) => s.user);
  const enabled = useWorkspaceSettingsStore((s) => s.settings.features[feature]);
  if (!enabled) {
    const base = user ? appBasePath(user.role) : "/employee";
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Card className="space-y-3 p-5">
          <h1 className="text-lg font-semibold text-foreground">Module disabled</h1>
          <p className="text-sm text-muted-foreground">
            This area is turned off in <span className="font-medium text-foreground">Settings → Feature toggles</span>. Ask an
            administrator if you need access.
          </p>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to={`${base}/settings`}>Open settings</Link>
          </Button>
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}
