// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DoorList } from "@/lib/door";
import { readCheckinQueue, readDoorList, writeCheckinQueue, writeDoorList } from "@/lib/door-store";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
  };
}

const LIST: DoorList = { serviceId: "svc", serviceName: "Recepción", generatedAt: "2026-12-20T20:00:00Z", invitations: [], guests: [] };

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("door storage", () => {
  it("keeps a list per page and event, and a queue per page", () => {
    expect(writeDoorList("boda", LIST)).toBe(true);
    expect(readDoorList("boda", "svc")).toEqual(LIST);
    expect(readDoorList("boda", "other")).toBeNull();

    const entry = { serviceId: "svc", guestId: "g1", at: "2026-12-20T23:00:00Z" };
    expect(writeCheckinQueue("boda", [entry])).toBe(true);
    expect(readCheckinQueue("boda")).toEqual([entry]);
    writeCheckinQueue("boda", []);
    expect(readCheckinQueue("boda")).toEqual([]);
  });

  it("drops malformed queue entries", () => {
    localStorage.setItem("haab:door-queue:boda", JSON.stringify([{ guestId: "g1" }, "x", { serviceId: "s", guestId: "g", at: "t" }]));
    expect(readCheckinQueue("boda")).toEqual([{ serviceId: "s", guestId: "g", at: "t" }]);
  });

  it("says when storage refuses, and reads nothing from it", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    });
    expect(writeDoorList("boda", LIST)).toBe(false);
    expect(writeCheckinQueue("boda", [{ serviceId: "s", guestId: "g", at: "t" }])).toBe(false);
    expect(readDoorList("boda", "svc")).toBeNull();
    expect(readCheckinQueue("boda")).toEqual([]);
  });
});
