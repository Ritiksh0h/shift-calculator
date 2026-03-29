const STORAGE_KEY = "shift-calculator-settings";

export interface LocalSettings {
  overtimeThreshold: number;
  overtimeMultiplier: number;
  defaultBreakMinutes: number;
  notifications: boolean;
  darkMode: boolean;
  currency: string;
}

const defaultSettings: LocalSettings = {
  overtimeThreshold: 40,
  overtimeMultiplier: 1.5,
  defaultBreakMinutes: 30,
  notifications: true,
  darkMode: false,
  currency: "USD",
};

export function getLocalSettings(): LocalSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalSettings;
  } catch {
    return null;
  }
}

export function saveLocalSettings(settings: LocalSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to localStorage:", e);
  }
}

export function clearLocalSettings(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getDefaultSettings(): LocalSettings {
  return { ...defaultSettings };
}

/**
 * Merge local and server settings.
 * Server wins on conflict (it's the source of truth),
 * but local is used as instant fallback on load.
 */
export function mergeSettings(
  local: LocalSettings | null,
  server: LocalSettings | null
): LocalSettings {
  if (server) return server;
  if (local) return local;
  return getDefaultSettings();
}