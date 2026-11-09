import type { Invitation } from "./invitations";

/**
 * The last guest list this browser loaded, so the section still shows it with
 * no connection. Read-only: it never feeds a write. Every storage call is
 * guarded, because a private window or blocked site data throws.
 */
const KEY_PREFIX = "haab:guest-list:";

export type GuestListCache = { invitations: Invitation[]; savedAt: string };

export function readGuestListCache(providerKey: string): GuestListCache | null {
  try {
    const raw = globalThis.localStorage.getItem(`${KEY_PREFIX}${providerKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestListCache>;
    return Array.isArray(parsed.invitations) && typeof parsed.savedAt === "string"
      ? { invitations: parsed.invitations, savedAt: parsed.savedAt }
      : null;
  } catch {
    return null;
  }
}

export function writeGuestListCache(providerKey: string, invitations: Invitation[], now = new Date()): void {
  try {
    globalThis.localStorage.setItem(
      `${KEY_PREFIX}${providerKey}`,
      JSON.stringify({ invitations, savedAt: now.toISOString() } satisfies GuestListCache),
    );
  } catch {
    // Full or blocked storage: the list still works online.
  }
}
