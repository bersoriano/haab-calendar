import type { BookingFlow, BookingStep } from "@/lib/types";

/**
 * Transitions for the public booking flow.
 *
 * The steps map 1:1 to what the visitor sees:
 *   1 service → 2 date & time → 3 details (a server hold is running) → 4 confirmed
 *
 * Every transition lives here so the rules that matter are checkable in one
 * place: going back never drops the chosen service, and an expired hold always
 * lands the visitor back on time selection with the slot cleared.
 */
export type BookingFlowEvent =
  | { type: "SELECT_SERVICE"; serviceId: string }
  | { type: "SELECT_DATE"; dateKey: string }
  | { type: "SELECT_TIME"; time: string }
  /** A server hold exists for the current selection; details can be collected. */
  | { type: "HOLD_CREATED"; dateKey: string; time: string; serviceId?: string }
  /** The hold ran out. Back to time selection, slot released. */
  | { type: "HOLD_EXPIRED" }
  /** The server rejected the selection at confirmation (someone else won). */
  | { type: "SELECTION_CONFLICT" }
  | { type: "CONFIRMED"; bookingId: string }
  /** One step back: to time selection from details, to services from time. */
  | { type: "BACK" }
  | { type: "RESTART" };

export type BookingFlowNotice = "hold-expired" | "selection-conflict" | null;

export type BookingFlowState = {
  flow: BookingFlow;
  /** Why the visitor was sent back, so step 2 can explain itself. */
  notice: BookingFlowNotice;
};

const EMPTY_SELECTION = { dateKey: "", time: "" } as const;

export function createBookingFlowState(flow: BookingFlow): BookingFlowState {
  return { flow, notice: null };
}

/** Steps that still hold a live selection the server needs to know about. */
export function holdsActiveSelection(step: BookingStep) {
  return step === 3;
}

export function bookingFlowReducer(
  state: BookingFlowState,
  event: BookingFlowEvent,
): BookingFlowState {
  const { flow } = state;

  switch (event.type) {
    case "SELECT_SERVICE":
      // Switching services invalidates any date/time picked for the old one.
      return {
        notice: null,
        flow: {
          ...flow,
          ...EMPTY_SELECTION,
          serviceId: event.serviceId,
          step: 2,
        },
      };

    case "SELECT_DATE":
      // A new date always clears the time: slots differ per day.
      return {
        notice: null,
        flow: { ...flow, dateKey: event.dateKey, time: "", step: 2 },
      };

    case "SELECT_TIME":
      return { notice: null, flow: { ...flow, time: event.time, step: 2 } };

    case "HOLD_CREATED":
      return {
        notice: null,
        flow: {
          ...flow,
          serviceId: event.serviceId ?? flow.serviceId,
          dateKey: event.dateKey,
          time: event.time,
          step: 3,
        },
      };

    case "HOLD_EXPIRED":
    case "SELECTION_CONFLICT":
      // The service and the date survive — only the slot is gone. Re-picking a
      // time is one tap, which is the whole point of coming back here.
      return {
        notice: event.type === "HOLD_EXPIRED" ? "hold-expired" : "selection-conflict",
        flow: { ...flow, time: "", step: 2 },
      };

    case "CONFIRMED":
      return {
        notice: null,
        flow: { ...flow, successBookingId: event.bookingId, step: 4 },
      };

    case "BACK":
      if (flow.step === 3) {
        // Details → time selection. Keep the service and the date.
        return { notice: null, flow: { ...flow, time: "", step: 2 } };
      }
      if (flow.step === 2) {
        // Time → services. The service list is the only place a service changes.
        return {
          notice: null,
          flow: { ...flow, ...EMPTY_SELECTION, serviceId: "", step: 1 },
        };
      }
      return state;

    case "RESTART":
      return {
        notice: null,
        flow: { ...flow, ...EMPTY_SELECTION, serviceId: "", step: 1 },
      };

    default:
      return state;
  }
}

/** Can this step be entered with the selection the visitor currently has? */
export function canEnterStep(step: BookingStep, flow: BookingFlow) {
  if (step === 1) return true;
  if (step === 2) return Boolean(flow.serviceId);
  if (step === 3) return Boolean(flow.serviceId && flow.dateKey);
  return Boolean(flow.successBookingId);
}

/**
 * Clamps a step (e.g. one restored from the URL) to what the current selection
 * actually supports, so a shared or reloaded link can never open a dead step.
 */
export function resolveReachableStep(step: BookingStep, flow: BookingFlow): BookingStep {
  for (let candidate = step; candidate > 1; candidate -= 1) {
    if (canEnterStep(candidate as BookingStep, flow)) {
      return candidate as BookingStep;
    }
  }
  return 1;
}
