import { describe, expect, it } from "vitest";

import {
  bookingFlowReducer,
  canEnterStep,
  createBookingFlowState,
  resolveReachableStep,
  type BookingFlowEvent,
} from "@/lib/booking-flow-machine";
import type { BookingFlow } from "@/lib/types";

function makeFlow(overrides: Partial<BookingFlow> = {}): BookingFlow {
  return {
    step: 1,
    serviceId: "",
    dateKey: "",
    time: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    notes: "",
    ...overrides,
  };
}

function run(flow: BookingFlow, events: BookingFlowEvent[]) {
  return events.reduce(
    (state, event) => bookingFlowReducer(state, event),
    createBookingFlowState(flow),
  );
}

describe("booking flow machine", () => {
  it("walks service → date → hold → confirmation", () => {
    const state = run(makeFlow(), [
      { type: "SELECT_SERVICE", serviceId: "svc_1" },
      { type: "SELECT_DATE", dateKey: "2026-08-10" },
      { type: "SELECT_TIME", time: "09:30" },
      { type: "HOLD_CREATED", dateKey: "2026-08-10", time: "09:30" },
      { type: "CONFIRMED", bookingId: "bk_1" },
    ]);

    expect(state.flow.step).toBe(4);
    expect(state.flow.successBookingId).toBe("bk_1");
    expect(state.notice).toBeNull();
  });

  it("keeps the service and date when a hold expires, and clears only the slot", () => {
    const state = run(makeFlow(), [
      { type: "SELECT_SERVICE", serviceId: "svc_1" },
      { type: "SELECT_DATE", dateKey: "2026-08-10" },
      { type: "HOLD_CREATED", dateKey: "2026-08-10", time: "09:30" },
      { type: "HOLD_EXPIRED" },
    ]);

    expect(state.flow.step).toBe(2);
    expect(state.flow.serviceId).toBe("svc_1");
    expect(state.flow.dateKey).toBe("2026-08-10");
    expect(state.flow.time).toBe("");
    expect(state.notice).toBe("hold-expired");
  });

  it("returns to time selection with a conflict notice when the server rejects the slot", () => {
    const state = run(makeFlow(), [
      { type: "SELECT_SERVICE", serviceId: "svc_1" },
      { type: "HOLD_CREATED", dateKey: "2026-08-10", time: "09:30" },
      { type: "SELECTION_CONFLICT" },
    ]);

    expect(state.flow.step).toBe(2);
    expect(state.flow.dateKey).toBe("2026-08-10");
    expect(state.flow.time).toBe("");
    expect(state.notice).toBe("selection-conflict");
  });

  it("never loses the selected service when stepping back from details", () => {
    const state = run(makeFlow(), [
      { type: "SELECT_SERVICE", serviceId: "svc_1" },
      { type: "SELECT_DATE", dateKey: "2026-08-10" },
      { type: "HOLD_CREATED", dateKey: "2026-08-10", time: "09:30" },
      { type: "BACK" },
    ]);

    expect(state.flow.step).toBe(2);
    expect(state.flow.serviceId).toBe("svc_1");
    expect(state.flow.dateKey).toBe("2026-08-10");
  });

  it("drops the service only when stepping back out of date selection", () => {
    const state = run(makeFlow(), [
      { type: "SELECT_SERVICE", serviceId: "svc_1" },
      { type: "SELECT_DATE", dateKey: "2026-08-10" },
      { type: "BACK" },
    ]);

    expect(state.flow.step).toBe(1);
    expect(state.flow.serviceId).toBe("");
    expect(state.flow.dateKey).toBe("");
  });

  it("clears the time when the date changes", () => {
    const state = run(makeFlow(), [
      { type: "SELECT_SERVICE", serviceId: "svc_1" },
      { type: "SELECT_DATE", dateKey: "2026-08-10" },
      { type: "SELECT_TIME", time: "09:30" },
      { type: "SELECT_DATE", dateKey: "2026-08-11" },
    ]);

    expect(state.flow.time).toBe("");
  });

  it("clears the selection when the service changes", () => {
    const state = run(makeFlow(), [
      { type: "SELECT_SERVICE", serviceId: "svc_1" },
      { type: "SELECT_DATE", dateKey: "2026-08-10" },
      { type: "SELECT_TIME", time: "09:30" },
      { type: "SELECT_SERVICE", serviceId: "svc_2" },
    ]);

    expect(state.flow.serviceId).toBe("svc_2");
    expect(state.flow.dateKey).toBe("");
    expect(state.flow.time).toBe("");
  });

  it("clamps a restored step to what the selection supports", () => {
    expect(resolveReachableStep(3, makeFlow({ serviceId: "svc_1" }))).toBe(2);
    expect(resolveReachableStep(3, makeFlow())).toBe(1);
    expect(
      resolveReachableStep(3, makeFlow({ serviceId: "svc_1", dateKey: "2026-08-10" })),
    ).toBe(3);
    expect(resolveReachableStep(4, makeFlow({ serviceId: "svc_1" }))).toBe(2);
  });

  it("guards step entry on the data each step needs", () => {
    expect(canEnterStep(1, makeFlow())).toBe(true);
    expect(canEnterStep(2, makeFlow())).toBe(false);
    expect(canEnterStep(3, makeFlow({ serviceId: "svc_1" }))).toBe(false);
    expect(canEnterStep(4, makeFlow({ serviceId: "svc_1", successBookingId: "bk_1" }))).toBe(
      true,
    );
  });
});
