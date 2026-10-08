"use client";

import { useEffect, useRef } from "react";

import type { PublicPageEvent } from "@/lib/analytics/events";
import {
  readVisitAttribution,
  sendPublicPageEvent,
  type VisitAttribution,
} from "@/lib/analytics/track";

type PublicPageAnalyticsInput = {
  /** Only a real, published page that a visitor opened; never a preview. */
  enabled: boolean;
  endpoint: string;
  step: number;
  serviceId: string;
  successBookingId?: string;
};

/**
 * Which event, if any, a move between booking steps means.
 *
 * Forward moves only: going back from details to time selection is not a
 * second service selection. Step 4 is keyed on the booking id rather than the
 * step, so a second booking in the same visit is counted as one.
 */
export function eventForStepChange(previous: number, next: number): PublicPageEvent | null {
  if (next <= previous) {
    return null;
  }
  if (next === 2) {
    return "service_selected";
  }
  if (next === 3) {
    return "slot_selected";
  }
  return null;
}

/**
 * Reports a visit and its progress through the booking funnel.
 *
 * Driven by the flow's state rather than wired into each handler, so the
 * transitions in lib/booking-flow-machine.ts stay the only place that decides
 * what a step is, and this hook only watches.
 */
export function usePublicPageAnalytics({
  enabled,
  endpoint,
  step,
  serviceId,
  successBookingId,
}: PublicPageAnalyticsInput) {
  const attributionRef = useRef<VisitAttribution | null>(null);
  // Starts at 1, not at the current step: a link straight to a service lands
  // on step 2, and that visitor did choose a service.
  const previousStepRef = useRef(1);
  const reportedBookingRef = useRef<string | undefined>(undefined);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!enabled || viewedRef.current) {
      return;
    }
    viewedRef.current = true;
    attributionRef.current = readVisitAttribution();
    sendPublicPageEvent(endpoint, "page_view", attributionRef.current);
  }, [enabled, endpoint]);

  useEffect(() => {
    if (!enabled || !attributionRef.current) {
      return;
    }

    const event = eventForStepChange(previousStepRef.current, step);
    previousStepRef.current = step;
    if (event && serviceId) {
      sendPublicPageEvent(endpoint, event, attributionRef.current, serviceId);
    }
  }, [enabled, endpoint, step, serviceId]);

  useEffect(() => {
    if (
      !enabled ||
      !attributionRef.current ||
      !successBookingId ||
      reportedBookingRef.current === successBookingId
    ) {
      return;
    }

    reportedBookingRef.current = successBookingId;
    sendPublicPageEvent(endpoint, "booking_confirmed", attributionRef.current, serviceId);
  }, [enabled, endpoint, successBookingId, serviceId]);
}
