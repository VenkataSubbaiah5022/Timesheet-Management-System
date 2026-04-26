import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

function id() {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const seedItems: InAppNotification[] = [
  {
    id: "seed-1",
    title: "Welcome to Timesheet Pro",
    body: "Use the bell in the header for quick alerts. Actions you take are also recorded in the Activity Log.",
    createdAt: new Date().toISOString(),
    read: false,
  },
  {
    id: "seed-2",
    title: "Manager role available",
    body: "Sign in as manager@demo.com / manager123 to review attendance and reports without full admin access.",
    createdAt: new Date().toISOString(),
    read: false,
  },
];

interface NotificationsState {
  items: InAppNotification[];
  push: (input: { title: string; body: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: seedItems,
      push: ({ title, body }) =>
        set({
          items: [{ id: id(), title, body, createdAt: new Date().toISOString(), read: false }, ...get().items].slice(0, 100),
        }),
      markRead: (nid) =>
        set({
          items: get().items.map((n) => (n.id === nid ? { ...n, read: true } : n)),
        }),
      markAllRead: () =>
        set({
          items: get().items.map((n) => ({ ...n, read: true })),
        }),
    }),
    {
      name: "timesheet-notifications-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
);

export function selectUnreadCount(state: NotificationsState): number {
  return state.items.filter((n) => !n.read).length;
}
