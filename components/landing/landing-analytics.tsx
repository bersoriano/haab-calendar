"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";
import { loadLandingCapture } from "@/lib/analytics/landing-client";
import { observeLanding } from "@/lib/analytics/landing-browser";
import { useLanguage } from "./language-provider";

/** Mounted only by LandingPage, never by shared navigation or booking pages. */
export function LandingAnalytics({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const { lang } = useLanguage();
  const language = useEffectEvent(() => lang);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void loadLandingCapture().then((capture) => {
      if (cancelled || !capture || !rootRef.current) return;
      cleanup = observeLanding(rootRef.current, capture, language);
    }).catch(() => { /* An unavailable SDK must never break the landing page. */ });
    return () => { cancelled = true; cleanup?.(); };
  }, [rootRef]);

  return null;
}
