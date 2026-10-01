import { describe, expect, it } from "vitest";

import {
  BOOKING_HISTORY_STATE_KEY,
  applyStepChange,
  planPopState,
  planStepChange,
  readBookingHistoryEntry,
  withBookingHistoryEntry,
  type BookingHistoryCursor,
} from "@/lib/booking-step-history";
import type { BookingStep } from "@/lib/types";

const LOAD = "load-a";

function walk(start: BookingStep, steps: BookingStep[]) {
  return steps.reduce<BookingHistoryCursor>(
    (cursor, step) => applyStepChange(cursor, planStepChange(cursor, step), step),
    { steps: [start], index: 0 },
  );
}

describe("planStepChange", () => {
  it("pushes an entry for each step moved forward into", () => {
    const cursor: BookingHistoryCursor = { steps: [1], index: 0 };
    expect(planStepChange(cursor, 2)).toEqual({ kind: "push", depth: 1 });
    expect(walk(1, [2, 3])).toEqual({ steps: [1, 2, 3], index: 2 });
  });

  it("does nothing when the step did not change", () => {
    expect(planStepChange({ steps: [1, 2], index: 1 }, 2)).toEqual({ kind: "none" });
  });

  it("replaces the details entry with the confirmation", () => {
    const cursor = walk(1, [2, 3]);
    expect(planStepChange(cursor, 4)).toEqual({ kind: "replace", depth: 2 });
    expect(walk(1, [2, 3, 4])).toEqual({ steps: [1, 2, 4], index: 2 });
  });

  it("rewinds history when the flow goes back in-app", () => {
    const cursor = walk(1, [2, 3]);
    expect(planStepChange(cursor, 2)).toEqual({ kind: "traverse", depth: 1, delta: -1 });
    expect(planStepChange(cursor, 1)).toEqual({ kind: "traverse", depth: 0, delta: -2 });
  });

  it("drops the entries ahead when moving forward again after a rewind", () => {
    // Details → (expired hold) time → details again: still three entries.
    expect(walk(1, [2, 3, 2, 3])).toEqual({ steps: [1, 2, 3], index: 2 });
  });

  it("starts at step 2 when the page skips the service list", () => {
    // A single-service page opens on the calendar; Back from it leaves.
    const cursor = walk(2, [3]);
    expect(cursor).toEqual({ steps: [2, 3], index: 1 });
    expect(planStepChange(cursor, 2)).toEqual({ kind: "traverse", depth: 0, delta: -1 });
  });

  it("replaces the entry when going back to a step this load never showed", () => {
    // The page opened on step 2 (one service), then the flow restarted to 1.
    expect(planStepChange({ steps: [2], index: 0 }, 1)).toEqual({
      kind: "replace",
      depth: 0,
    });
  });
});

describe("planPopState", () => {
  const atDetails: BookingHistoryCursor = { steps: [1, 2, 3], index: 2 };

  it("goes back one step on Back", () => {
    expect(
      planPopState({
        entry: { id: LOAD, depth: 1, step: 2 },
        loadId: LOAD,
        cursor: atDetails,
        pendingDepth: null,
        currentStep: 3,
      }),
    ).toEqual({ kind: "back", depth: 1, step: 2 });
  });

  it("jumps several steps from the browser's history menu", () => {
    expect(
      planPopState({
        entry: { id: LOAD, depth: 0, step: 1 },
        loadId: LOAD,
        cursor: atDetails,
        pendingDepth: null,
        currentStep: 3,
      }),
    ).toEqual({ kind: "back", depth: 0, step: 1 });
  });

  it("settles a rewind the flow started itself", () => {
    expect(
      planPopState({
        entry: { id: LOAD, depth: 1, step: 2 },
        loadId: LOAD,
        cursor: { steps: [1, 2, 3], index: 1 },
        pendingDepth: 1,
        currentStep: 2,
      }),
    ).toEqual({ kind: "settle", depth: 1 });
  });

  it("undoes Forward into a step the visitor already left", () => {
    expect(
      planPopState({
        entry: { id: LOAD, depth: 2, step: 3 },
        loadId: LOAD,
        cursor: { steps: [1, 2, 3], index: 1 },
        pendingDepth: null,
        currentStep: 2,
      }),
    ).toEqual({ kind: "undo", depth: 1, delta: -1 });
  });

  it("starts over from the first entry on Back from the confirmation", () => {
    expect(
      planPopState({
        entry: { id: LOAD, depth: 1, step: 2 },
        loadId: LOAD,
        cursor: { steps: [1, 2, 4], index: 2 },
        pendingDepth: null,
        currentStep: 4,
      }),
    ).toEqual({ kind: "restart", delta: -1 });
  });

  it("starts over in place when the confirmation sits right after the first entry", () => {
    // A single-service page: [calendar, confirmation].
    expect(
      planPopState({
        entry: { id: LOAD, depth: 0, step: 2 },
        loadId: LOAD,
        cursor: { steps: [2, 4], index: 1 },
        pendingDepth: null,
        currentStep: 4,
      }),
    ).toEqual({ kind: "restart", delta: 0 });
  });

  it("leaves through entries written by an earlier load of the page", () => {
    expect(
      planPopState({
        entry: { id: "load-before-reload", depth: 1, step: 2 },
        loadId: LOAD,
        cursor: { steps: [1], index: 0 },
        pendingDepth: null,
        currentStep: 1,
      }),
    ).toEqual({ kind: "leave", delta: -2 });
  });

  it("ignores entries the flow did not write", () => {
    expect(
      planPopState({
        entry: null,
        loadId: LOAD,
        cursor: atDetails,
        pendingDepth: null,
        currentStep: 3,
      }),
    ).toEqual({ kind: "ignore" });
  });
});

describe("history.state helpers", () => {
  it("keeps the router's own fields when adding the entry", () => {
    const routerState = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: [] } };
    const entry = { id: LOAD, depth: 1, step: 2 as const };
    const next = withBookingHistoryEntry(routerState, entry);

    expect(next).toMatchObject(routerState);
    expect(readBookingHistoryEntry(next)).toEqual(entry);
  });

  it("rejects missing or malformed entries", () => {
    expect(readBookingHistoryEntry(null)).toBeNull();
    expect(readBookingHistoryEntry({ __NA: true })).toBeNull();
    expect(
      readBookingHistoryEntry({ [BOOKING_HISTORY_STATE_KEY]: { id: LOAD, depth: 0, step: 7 } }),
    ).toBeNull();
  });
});
