import { create } from "zustand";
import type { SessionUser } from "../../shared/types/domain";

interface AuthState {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
