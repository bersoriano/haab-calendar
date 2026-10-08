"use client";

import { useCallback, useEffect, useRef } from "react";

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
};

/**
 * Which event, if any, a move between booking steps means.
 *
 * Forward moves only: going back from details to time selection is not a
 * second service selection. Step 4 has no event here: the booking route
 * records confirmed bookings on the server.
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
 * Reports a visit and its progress through the booking funnel, and returns a
 * getter for the visit's attribution to send along with the booking request.
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
}: PublicPageAnalyticsInput) {
  const attributionRef = useRef<VisitAttribution | null>(null);
  // Starts at 1, not at the current step: a link straight to a service lands
  // on step 2, and that visitor did choose a service.
  const previousStepRef = useRef(1);
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

  // The booking request carries this, and the booking route records the
  // conversion itself. Null when tracking is off, so nothing is sent.
  return useCallback(
    (): VisitAttribution | null => (enabled ? attributionRef.current : null),
    [enabled],
  );
}
