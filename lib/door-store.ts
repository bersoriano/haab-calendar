import type { CheckinEntry, DoorList } from "./door";

/**
 * The door list and the check-ins not yet sent, kept in the browser so the
 * door works without a connection. Writes report whether they stuck, so the
 * screen can warn when storage is blocked; the door then works in memory.
 */
const LIST_PREFIX = "haab:door:";
const QUEUE_PREFIX = "haab:door-queue:";

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readDoorList(pageKey: string, serviceId: string): DoorList | null {
  try {
    const raw = storage()?.getItem(`${LIST_PREFIX}${pageKey}:${serviceId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DoorList;
    return parsed && parsed.serviceId === serviceId && Array.isArray(parsed.guests) && Array.isArray(parsed.invitations)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function writeDoorList(pageKey: string, list: DoorList): boolean {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(`${LIST_PREFIX}${pageKey}:${list.serviceId}`, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function readCheckinQueue(pageKey: string): CheckinEntry[] {
  try {
    const raw = storage()?.getItem(`${QUEUE_PREFIX}${pageKey}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is CheckinEntry =>
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as CheckinEntry).serviceId === "string" &&
            typeof (entry as CheckinEntry).guestId === "string" &&
            typeof (entry as CheckinEntry).at === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export function writeCheckinQueue(pageKey: string, queue: CheckinEntry[]): boolean {
  try {
    const store = storage();
    if (!store) return false;
    if (queue.length === 0) store.removeItem(`${QUEUE_PREFIX}${pageKey}`);
    else store.setItem(`${QUEUE_PREFIX}${pageKey}`, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}
