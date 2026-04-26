import dayjs from "dayjs";
import type { Role } from "../shared/types/domain";
import { useAuthStore } from "../features/auth/store";
import { useNotificationsStore } from "../features/notifications/store";

const ACTIVITY_KEY = "timesheet-activity-v1";
const MAX_ENTRIES = 250;

export interface ActivityLogEntry {
  id: string;
  at: string;
  action: string;
  detail?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: Role;
}

function readRaw(): ActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(entries: ActivityLogEntry[]): void {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

export function listActivityLog(limit = 200): ActivityLogEntry[] {
  return readRaw()
    .slice(-limit)
    .reverse();
}

export function listActivityForActor(actorId: string, limit = 40): ActivityLogEntry[] {
  return readRaw()
    .filter((e) => e.actorId === actorId)
    .slice(-limit)
    .reverse();
}

export function countActivityForActorSince(actorId: string, sinceIso: string): number {
  return readRaw().filter((e) => e.actorId === actorId && e.at >= sinceIso).length;
}

export function appendActivity(input: { action: string; detail?: string; notify?: { title: string; body: string } }): void {
  const user = useAuthStore.getState().user;
  const entry: ActivityLogEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: dayjs().toISOString(),
    action: input.action,
    detail: input.detail,
    actorId: user?.id,
    actorName: user?.name,
    actorRole: user?.role,
  };
  const next = [...readRaw(), entry];
  writeRaw(next);
  if (input.notify) {
    useNotificationsStore.getState().push({ title: input.notify.title, body: input.notify.body });
  }
}
