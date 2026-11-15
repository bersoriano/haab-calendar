// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readGuestListCache, writeGuestListCache } from "@/lib/guest-list-cache";
import type { Invitation } from "@/lib/invitations";

const invitation = { id: "inv-1", displayName: "Familia Ortiz" } as Invitation;

// Node's own experimental localStorage shadows happy-dom's and is unusable
// without a backing file, so each test gets a fresh in-memory one.
function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("guest list cache", () => {
  it("reads back what it wrote, per page", () => {
    writeGuestListCache("boda", [invitation], new Date("2026-11-09T10:00:00.000Z"));

    expect(readGuestListCache("boda")).toEqual({
      invitations: [invitation],
      savedAt: "2026-11-09T10:00:00.000Z",
    });
    expect(readGuestListCache("other")).toBeNull();
  });

  it("ignores junk", () => {
    localStorage.setItem("haab:guest-list:boda", "{not json");
    expect(readGuestListCache("boda")).toBeNull();
    localStorage.setItem("haab:guest-list:boda", JSON.stringify({ invitations: "nope" }));
    expect(readGuestListCache("boda")).toBeNull();
  });

  it("survives storage that throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });

    expect(() => writeGuestListCache("boda", [invitation])).not.toThrow();
    expect(readGuestListCache("boda")).toBeNull();
  });
});
