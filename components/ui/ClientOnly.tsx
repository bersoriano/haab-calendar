"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribeToNothing = () => () => undefined;

/**
 * Renders `children` only in the browser; the server and the hydration pass
 * render `fallback`. For trees whose first paint depends on the viewer's
 * clock, time zone or locale data — rendering those on a server in another
 * zone produces markup the browser then disagrees with.
 */
export function ClientOnly({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  return isClient ? children : fallback;
}
