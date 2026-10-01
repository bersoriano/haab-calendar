import type { BookingStep } from "@/lib/types";

/**
 * Browser history for the public booking flow.
 *
 * The flow's steps are React state on one URL, so without this the browser's
 * Back button skips the whole flow and leaves the page. Each step the visitor
 * moves forward into gets its own history entry, so Back walks the steps the
 * way the on-screen back buttons do.
 *
 * This file only decides; `useBookingStepHistory` applies the decisions to
 * `window.history`. The rules:
 *
 *   - Moving forward into 2 or 3 pushes an entry.
 *   - Confirming (4) replaces the current entry: the details form behind it
 *     is for a slot that is now booked, so Back from the confirmation leaves
 *     the page instead of reopening it.
 *   - Moving back in-app (a back button, an expired hold) rewinds history to
 *     the matching entry, so the stack never holds steps the visitor left.
 *   - Forward never re-enters a step: going back clears the selection the
 *     later step needs (and step 3 needs a server hold), so it is undone.
 *
 * Every entry carries the id of the page load that wrote it. Entries left by
 * an earlier load of the same page (a reload mid-flow) belong to a flow that
 * no longer exists, and Back through them leaves the page.
 */

/** What each booking-flow history entry carries in `history.state`. */
export type BookingHistoryEntry = {
  /** The page load that wrote the entry. */
  id: string;
  /** Position in this load's entries; 0 is the entry the page opened on. */
  depth: number;
  step: BookingStep;
};

export const BOOKING_HISTORY_STATE_KEY = "haabBookingFlow";

export type BookingHistoryCursor = {
  /** The step shown at each depth, for this page load. */
  steps: BookingStep[];
  /** The depth of the entry the browser is on. */
  index: number;
};

export type StepChangePlan =
  | { kind: "none" }
  | { kind: "push"; depth: number }
  | { kind: "replace"; depth: number }
  /** Rewind `delta` entries (negative) to the entry at `depth`. */
  | { kind: "traverse"; depth: number; delta: number };

/** The flow's visible step changed; how should history follow? */
export function planStepChange(
  cursor: BookingHistoryCursor,
  step: BookingStep,
): StepChangePlan {
  const current = cursor.steps[cursor.index];

  if (current === step) {
    return { kind: "none" };
  }

  if (current === undefined || step === 4) {
    return { kind: "replace", depth: cursor.index };
  }

  if (step > current) {
    return { kind: "push", depth: cursor.index + 1 };
  }

  for (let depth = cursor.index - 1; depth >= 0; depth -= 1) {
    if (cursor.steps[depth] === step) {
      return { kind: "traverse", depth, delta: depth - cursor.index };
    }
  }

  // Back to a step this load never had an entry for (the page opened past it).
  return { kind: "replace", depth: cursor.index };
}

/** Apply a step-change plan to the cursor once history has been updated. */
export function applyStepChange(
  cursor: BookingHistoryCursor,
  plan: StepChangePlan,
  step: BookingStep,
): BookingHistoryCursor {
  switch (plan.kind) {
    case "none":
      return cursor;
    case "push":
      return { steps: [...cursor.steps.slice(0, plan.depth), step], index: plan.depth };
    case "replace": {
      const steps = cursor.steps.slice(0, plan.depth + 1);
      steps[plan.depth] = step;
      return { steps, index: plan.depth };
    }
    case "traverse":
      // The entries ahead stay in the browser; Forward into them is undone.
      return { steps: cursor.steps, index: plan.depth };
  }
}

export type PopStatePlan =
  /** Not an entry this flow wrote; leave it to the router. */
  | { kind: "ignore" }
  /** The browser landed where we asked it to; only the cursor moves. */
  | { kind: "settle"; depth: number }
  /** Leave the page: rewind past every booking entry before this one. */
  | { kind: "leave"; delta: number }
  /** Forward into a step that cannot be re-entered; go back where we were. */
  | { kind: "undo"; depth: number; delta: number }
  /** Back to an earlier step of this flow. */
  | { kind: "back"; depth: number; step: BookingStep };

export function planPopState({
  entry,
  loadId,
  cursor,
  pendingDepth,
  currentStep,
}: {
  entry: BookingHistoryEntry | null;
  loadId: string;
  cursor: BookingHistoryCursor;
  /** The depth a rewind we started is heading to, if one is in flight. */
  pendingDepth: number | null;
  currentStep: BookingStep;
}): PopStatePlan {
  if (!entry) {
    return { kind: "ignore" };
  }

  // An earlier load of this page (a reload mid-flow): that flow is gone.
  if (entry.id !== loadId) {
    return { kind: "leave", delta: -(entry.depth + 1) };
  }

  if (pendingDepth !== null && entry.depth === pendingDepth) {
    return { kind: "settle", depth: entry.depth };
  }

  // The booking is made; nothing behind the confirmation can be redone.
  if (currentStep === 4) {
    return { kind: "leave", delta: -(entry.depth + 1) };
  }

  if (entry.depth > cursor.index) {
    return { kind: "undo", depth: cursor.index, delta: cursor.index - entry.depth };
  }

  const step = cursor.steps[entry.depth] ?? entry.step;
  if (step >= currentStep) {
    return { kind: "settle", depth: entry.depth };
  }

  return { kind: "back", depth: entry.depth, step };
}

export function readBookingHistoryEntry(state: unknown): BookingHistoryEntry | null {
  if (!state || typeof state !== "object") {
    return null;
  }

  const entry = (state as Record<string, unknown>)[BOOKING_HISTORY_STATE_KEY];
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const { id, depth, step } = entry as Record<string, unknown>;
  if (
    typeof id !== "string" ||
    typeof depth !== "number" ||
    (step !== 1 && step !== 2 && step !== 3 && step !== 4)
  ) {
    return null;
  }

  return { id, depth, step };
}

/** `history.state` with the entry merged in, keeping the router's own fields. */
export function withBookingHistoryEntry(
  state: unknown,
  entry: BookingHistoryEntry,
): Record<string, unknown> {
  const base = state && typeof state === "object" ? (state as Record<string, unknown>) : {};
  return { ...base, [BOOKING_HISTORY_STATE_KEY]: entry };
}
