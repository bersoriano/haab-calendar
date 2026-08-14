import { DEMO_PAGES } from "@/lib/demo-pages";

/**
 * Indexes into DEMO_PAGES for the handful of examples the landing page shows.
 *
 * Indexes rather than rows, because a landing card pairs DEMO_PAGES[i] with the
 * copy at liveExamples.items[i]; passing one number keeps those two lists from
 * drifting apart (lib/__tests__/demo-pages.test.ts pins that they stay the same
 * length).
 *
 * The pick happens on the server so a visit can show a different set without
 * the shuffle running during a client render, which would not match the HTML
 * the server already sent.
 */
export const LANDING_DEMO_COUNT = 4;

export function pickFeaturedDemos(
  count = LANDING_DEMO_COUNT,
  random: () => number = Math.random,
) {
  const indexes = DEMO_PAGES.map((_, index) => index);

  // Fisher-Yates over a copy: every subset is equally likely, and taking the
  // first `count` never repeats a demo.
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }

  return indexes.slice(0, Math.max(0, Math.min(count, indexes.length)));
}

/** Every demo, in the order they are declared. Used by the gallery. */
export function allDemoIndexes() {
  return DEMO_PAGES.map((_, index) => index);
}
