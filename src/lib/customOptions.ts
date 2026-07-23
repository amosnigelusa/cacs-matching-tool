import { norm } from "./text";

const STORAGE_PREFIX = "12twenty-import-fixer:custom-options:";

function storageKey(picklistName: string): string {
  return `${STORAGE_PREFIX}${picklistName.toLowerCase()}`;
}

/**
 * Options a user has manually added via "+ Add new option" (e.g. a missing school or city),
 * persisted in this browser's localStorage so they're available as defaults again next time -
 * there's no backend to write the bundled CSV back to, and this never leaves the device.
 */
export function loadCustomOptions(picklistName: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(picklistName));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((o): o is string => typeof o === "string") : [];
  } catch {
    return [];
  }
}

export function saveCustomOption(picklistName: string, option: string): void {
  if (typeof window === "undefined") return;
  const existing = loadCustomOptions(picklistName);
  if (existing.some((o) => norm(o) === norm(option))) return;
  try {
    window.localStorage.setItem(storageKey(picklistName), JSON.stringify([...existing, option]));
  } catch {
    // localStorage unavailable/full - the option still works for this session, just won't persist
  }
}
