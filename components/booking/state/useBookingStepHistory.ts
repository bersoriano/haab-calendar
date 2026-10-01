"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import {
  applyStepChange,
  planPopState,
  planStepChange,
  readBookingHistoryEntry,
  withBookingHistoryEntry,
  type BookingHistoryCursor,
} from "@/lib/booking-step-history";
import type { BookingStep } from "@/lib/types";
import { createId } from "@/lib/utils";

/**
 * Keeps the browser's Back button in step with the public booking flow.
 * The rules live in lib/booking-step-history.ts; this only applies them.
 *
 * Entries keep the URL as it is and carry the step in `history.state`, next to
 * the router's own fields, so Next.js treats Back as a same-page traverse.
 */
export function useBookingStepHistory({
  enabled,
  step,
  onBack,
}: {
  enabled: boolean;
  step: BookingStep;
  /**
   * The visitor pressed Back to an earlier step. The flow must move to `step`
   * (releasing a hold on the way, as the on-screen back buttons do).
   */
  onBack: (step: BookingStep) => void;
}) {
  const loadIdRef = useRef<string | null>(null);
  const cursorRef = useRef<BookingHistoryCursor>({ steps: [], index: 0 });
  const pendingDepthRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const loadId = loadIdRef.current ?? createId("booking_history");
    if (!loadIdRef.current) {
      loadIdRef.current = loadId;
      cursorRef.current = { steps: [step], index: 0 };
      window.history.replaceState(
        withBookingHistoryEntry(window.history.state, { id: loadId, depth: 0, step }),
        "",
      );
      return;
    }

    const plan = planStepChange(cursorRef.current, step);
    if (plan.kind === "push" || plan.kind === "replace") {
      const state = withBookingHistoryEntry(window.history.state, {
        id: loadId,
        depth: plan.depth,
        step,
      });
      if (plan.kind === "push") {
        window.history.pushState(state, "");
      } else {
        window.history.replaceState(state, "");
      }
    } else if (plan.kind === "traverse") {
      pendingDepthRef.current = plan.depth;
      window.history.go(plan.delta);
    }
    cursorRef.current = applyStepChange(cursorRef.current, plan, step);
  }, [enabled, step]);

  const handlePopState = useEffectEvent((event: PopStateEvent) => {
    const loadId = loadIdRef.current;
    if (!loadId) return;

    const plan = planPopState({
      entry: readBookingHistoryEntry(event.state),
      loadId,
      cursor: cursorRef.current,
      pendingDepth: pendingDepthRef.current,
      currentStep: step,
    });

    switch (plan.kind) {
      case "ignore":
        return;
      case "settle":
        pendingDepthRef.current = null;
        cursorRef.current = { ...cursorRef.current, index: plan.depth };
        return;
      case "leave":
        pendingDepthRef.current = null;
        window.history.go(plan.delta);
        return;
      case "undo":
        pendingDepthRef.current = plan.depth;
        window.history.go(plan.delta);
        return;
      case "back":
        pendingDepthRef.current = null;
        cursorRef.current = { ...cursorRef.current, index: plan.depth };
        onBack(plan.step);
        return;
    }
  });

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [enabled]);
}
