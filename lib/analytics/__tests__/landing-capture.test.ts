import { beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeLandingEvent, type LandingEventName, type LandingProperties } from "@/lib/analytics/landing-policy";

const ga = vi.hoisted(() => ({ enabled: vi.fn(), track: vi.fn() }));
vi.mock("@/lib/analytics/analytics.client", () => ({ analyticsEnabled: ga.enabled, track: ga.track }));

const { combineLandingCapture } = await import("@/lib/analytics/landing-capture");

beforeEach(() => {
  ga.enabled.mockReset().mockReturnValue(true);
  ga.track.mockReset();
});

/** Every event shape landing-browser.ts emits, with the locale it adds. */
const EMITTED: [LandingEventName, LandingProperties][] = [
  ["section_view", { section_id: "front-desk", locale: "es" }],
  ["cta_click", { cta_type: "signup", cta_location: "hero", locale: "en" }],
  ["cta_click", { cta_type: "resume", cta_location: "footer", locale: "en" }],
  ["cta_click", { cta_type: "login", cta_location: "header", locale: "en" }],
  ["cta_click", { cta_type: "demo", cta_location: "hero", locale: "en" }],
  ["cta_click", { cta_type: "gallery", cta_location: "live-examples", locale: "en" }],
  ["select_content", { content_type: "example", content_id: "example_3", locale: "en" }],
  ["select_content", { content_type: "example", content_id: "featured", locale: "en" }],
  ["select_content", { content_type: "article", content_id: "featured", locale: "en" }],
  ["select_content", { content_type: "faq", content_id: "q12", locale: "en" }],
  ["select_content", { content_type: "vertical", content_id: "healthcare", locale: "en" }],
  ["read_progress", { content_type: "page", percent: 75, locale: "en" }],
  ["read_progress", { content_type: "video", percent: 0, locale: "en" }],
  ["language_change", { language: "es", locale: "es" }],
];

describe("landing capture fan-out", () => {
  it("sends taxonomy events to Google Analytics and PostHog under the same names", () => {
    const posthog = vi.fn();
    const capture = combineLandingCapture(posthog)!;
    capture("cta_click", { cta_type: "signup", cta_location: "hero", locale: "en" });
    expect(ga.track).toHaveBeenCalledWith("cta_click", { cta_type: "signup", cta_location: "hero", locale: "en" });
    expect(posthog).toHaveBeenCalledWith("cta_click", { cta_type: "signup", cta_location: "hero", locale: "en" });
  });

  it("keeps PostHog's own page events out of Google Analytics", () => {
    const posthog = vi.fn();
    const capture = combineLandingCapture(posthog)!;
    capture("$pageview", { locale: "en" });
    capture("$pageleave", { duration_seconds: 3, locale: "en" });
    expect(ga.track).not.toHaveBeenCalled();
    expect(posthog).toHaveBeenCalledTimes(2);
  });

  it("reports to Google Analytics alone when PostHog is unavailable, and to nothing when neither is on", () => {
    combineLandingCapture(null)!("section_view", { section_id: "hero", locale: "en" });
    expect(ga.track).toHaveBeenCalledWith("section_view", { section_id: "hero", locale: "en" });
    ga.enabled.mockReturnValue(false);
    expect(combineLandingCapture(null)).toBeNull();
    const posthog = vi.fn();
    combineLandingCapture(posthog)!("section_view", { section_id: "hero", locale: "en" });
    expect(ga.track).toHaveBeenCalledTimes(1);
    expect(posthog).toHaveBeenCalledTimes(1);
  });

  it("a failing Google destination never blocks PostHog", () => {
    ga.track.mockImplementation(() => { throw new Error("blocked"); });
    const posthog = vi.fn();
    combineLandingCapture(posthog)!("cta_click", { cta_type: "demo", cta_location: "hero", locale: "en" });
    expect(posthog).toHaveBeenCalledTimes(1);
  });
});

describe("PostHog's sanitizer accepts everything the landing emits", () => {
  it.each(EMITTED)("%s %o passes through intact", (event, properties) => {
    const result = sanitizeLandingEvent({ event, properties: { ...properties, $current_url: "https://haabcalendar.com/" } });
    expect(result?.event).toBe(event);
    expect(result?.properties).toEqual({ ...properties, $current_url: "https://haabcalendar.com/" });
  });

  it("drops the legacy landing_* names", () => {
    for (const event of ["landing_cta_click", "landing_section_view", "landing_nav_click", "landing_faq_open"]) {
      expect(sanitizeLandingEvent({ event, properties: { $current_url: "https://haabcalendar.com/" } })).toBeNull();
    }
  });
});
