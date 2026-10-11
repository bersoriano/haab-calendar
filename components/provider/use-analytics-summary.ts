"use client";

import { useEffect, useState } from "react";

import type { AnalyticsRange, AnalyticsResponse } from "@/lib/analytics/summary";

/** Tagged with the request it answers, so a stale answer reads as loading. */
type LoadState =
  | { key: string; status: "error" }
  | { key: string; status: "ready"; summary: AnalyticsResponse };

/**
 * The provider's analytics for one range, from /api/provider/analytics.
 * `state` is null while the answer for the current range is on its way.
 */
export function useAnalyticsSummary(range: AnalyticsRange) {
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${range}:${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/provider/analytics?range=${range}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`analytics ${response.status}`);
        }
        const summary = (await response.json()) as AnalyticsResponse;
        setLoaded({ key: requestKey, status: "ready", summary });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("provider_analytics_load_failed", error);
          setLoaded({ key: requestKey, status: "error" });
        }
      });

    return () => controller.abort();
  }, [range, requestKey]);

  return {
    state: loaded?.key === requestKey ? loaded : null,
    retry: () => setReloadKey((key) => key + 1),
  };
}
