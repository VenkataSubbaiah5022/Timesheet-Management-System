import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { writeLiveApiPreference } from "../config/env";
import {
  defaultWorkspaceSettings,
  mergeWorkspaceSettings,
  type WorkspaceSettings,
} from "../shared/types/workspace";

const STORAGE_KEY = "timesheet-workspace-v1";

interface WorkspaceStore {
  settings: WorkspaceSettings;
  setSettings: (next: WorkspaceSettings) => void;
  resetToFactory: () => void;
}

export const useWorkspaceSettingsStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      settings: defaultWorkspaceSettings(),
      setSettings: (next) => {
        const merged = mergeWorkspaceSettings(next);
        writeLiveApiPreference(merged.useLiveApi);
        set({ settings: merged });
      },
      resetToFactory: () => {
        const fresh = defaultWorkspaceSettings();
        writeLiveApiPreference(fresh.useLiveApi);
        set({ settings: fresh });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings }),
    }
  )
);

export function getWorkspaceSettings(): WorkspaceSettings {
  return mergeWorkspaceSettings(useWorkspaceSettingsStore.getState().settings);
}
