import { describe, expect, it } from "vitest";

import {
  canExtendBookingHold,
  expireBookingHoldAtServerTime,
  getBookingHoldRemainingMs,
  isBookingHoldWarning,
} from "@/lib/holds";
import type { BookingHold } from "@/lib/types";

const hold: BookingHold = {
  id: "hold-1",
  selectionKey: "service:2026-08-10:09:00",
  startedAt: 1_000,
  expiresAt: 601_000,
  extensionCount: 0,
  released: false,
};

describe("booking hold timing", () => {
  it("uses the authoritative expiry rather than assuming ten minutes from client start", () => {
    expect(getBookingHoldRemainingMs(hold, 481_000)).toBe(120_000);
    expect(getBookingHoldRemainingMs({ ...hold, expiresAt: 901_000 }, 481_000)).toBe(
      420_000,
    );
  });

  it("never reports negative time after a suspended or abandoned page resumes", () => {
    expect(getBookingHoldRemainingMs(hold, 700_000)).toBe(0);
  });

  it("offers one extension only inside the final two minutes", () => {
    expect(isBookingHoldWarning(120_001)).toBe(false);
    expect(canExtendBookingHold(hold, 120_001)).toBe(false);
    expect(canExtendBookingHold(hold, 120_000)).toBe(true);
    expect(canExtendBookingHold({ ...hold, extensionCount: 1 }, 60_000)).toBe(false);
    expect(canExtendBookingHold({ ...hold, released: true }, 60_000)).toBe(false);
    expect(canExtendBookingHold(hold, 0)).toBe(false);
  });

  it("collapses stale displayed time when the server says the hold is inactive", () => {
    const expired = expireBookingHoldAtServerTime(hold, 500_000);

    expect(expired.released).toBe(true);
    expect(getBookingHoldRemainingMs(expired, 500_000)).toBe(0);
  });
});
