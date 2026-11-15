"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";
import { loadLandingCapture } from "@/lib/analytics/landing-client";
import { combineLandingCapture } from "@/lib/analytics/landing-capture";
import { observeLanding } from "@/lib/analytics/landing-browser";
import { useLanguage } from "./language-provider";

/**
 * Mounted only by the measured marketing pages (LANDING_PATHS: the landing
 * page and the doctors page), never by shared navigation or booking pages.
 * Reports sections, CTAs, FAQ, video, scroll and language changes to Google
 * Analytics and, when configured, PostHog.
 */
export function LandingAnalytics({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const { lang } = useLanguage();
  const language = useEffectEvent(() => lang);

  useEffect(() => {
    const controller = new AbortController();
    let cleanup: (() => void) | undefined;
    // PostHog unavailable (unconfigured, blocked) still leaves Google Analytics.
    void loadLandingCapture(controller.signal).catch(() => null).then((posthog) => {
      const capture = combineLandingCapture(posthog);
      if (controller.signal.aborted || !capture || !rootRef.current) return;
      cleanup = observeLanding(rootRef.current, capture, language);
    }).catch(() => { /* An unavailable SDK must never break the landing page. */ });
    return () => { controller.abort(); cleanup?.(); };
  }, [rootRef]);

  return null;
}
