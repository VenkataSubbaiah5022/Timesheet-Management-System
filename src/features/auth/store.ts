import { create } from "zustand";
import type { SessionUser } from "../../shared/types/domain";

interface AuthState {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  patchUser: (partial: Partial<SessionUser>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  patchUser: (partial) =>
    set((s) => ({
      user: s.user ? { ...s.user, ...partial } : null,
    })),
}));
