import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../services/api/client";
import { useAuthStore } from "../auth/store";
import { Button } from "../../shared/components/ui/button";
import { Card } from "../../shared/components/ui/card";

export function ClockPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user)!;
  const attendance = useQuery({ queryKey: ["my-attendance", user.id], queryFn: () => apiClient.myAttendance(user.id) });
  const hasOpen = (attendance.data ?? []).some((a) => !a.clockOutAt);

  const clockIn = useMutation({
    mutationFn: () => apiClient.clockIn(user.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-attendance", user.id] }),
  });
  const clockOut = useMutation({
    mutationFn: () => apiClient.clockOut(user.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-attendance", user.id] }),
  });

  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold">Clock In / Clock Out</h3>
      <p className="text-sm text-slate-600">Current time: {dayjs().format("DD MMM YYYY, hh:mm:ss A")}</p>
      <div className="flex gap-2">
        <Button onClick={() => clockIn.mutate()} disabled={hasOpen || clockIn.isPending}>Clock In</Button>
        <Button className="bg-emerald-700 hover:bg-emerald-600" onClick={() => clockOut.mutate()} disabled={!hasOpen || clockOut.isPending}>Clock Out</Button>
      </div>
      {(clockIn.error || clockOut.error) && <p className="text-sm text-red-600">{(clockIn.error || clockOut.error as Error).message}</p>}
    </Card>
  );
}
