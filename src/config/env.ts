/**
 * Centralized environment access — swap implementations when a real API ships.
 * `useLiveApi` is persisted in workspace settings (mock toggle).
 */
const LIVE_PREF_KEY = "timesheet-use-live-api-pref";

export type AppEnvironment = {
  mode: string;
  /** From Vite; empty until you add `VITE_API_BASE_URL` in `.env`. */
  apiBaseUrl: string;
  /** Mock: reflects workspace toggle + localStorage hint for future wiring. */
  useMockDataLayer: boolean;
};

export function readLiveApiPreference(): boolean {
  try {
    return localStorage.getItem(LIVE_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLiveApiPreference(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(LIVE_PREF_KEY, "1");
    else localStorage.removeItem(LIVE_PREF_KEY);
  } catch {
    /* ignore */
  }
}

export function getAppEnvironment(useLiveFromWorkspace: boolean): AppEnvironment {
  const env = import.meta.env;
  const apiBaseUrl = typeof env.VITE_API_BASE_URL === "string" ? env.VITE_API_BASE_URL : "";
  const useLive = useLiveFromWorkspace || readLiveApiPreference();
  return {
    mode: env.MODE,
    apiBaseUrl,
    /** Today: always mock DB; when `apiBaseUrl` is set and useLive, ready to branch in `apiClient`. */
    useMockDataLayer: !apiBaseUrl || !useLive,
  };
}
