// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { Window as HappyWindow } from "happy-dom";
import { PostHog } from "posthog-js/no-external";
import { loadLandingCapture } from "@/lib/analytics/landing-client";

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("the real SDK emits cookieless, redacted landing events without persisting identifiers", async () => {
  // Stop transport timers: this test inspects the real SDK's outgoing event,
  // never sends test traffic to a hosted project.
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS", "haabcalendar.com");
  // Node's experimental storage globals can shadow the DOM environment.
  const storageWindow = new HappyWindow({ url: "https://haabcalendar.com/" });
  vi.stubGlobal("localStorage", storageWindow.localStorage);
  vi.stubGlobal("sessionStorage", storageWindow.sessionStorage);
  (window as unknown as HappyWindow).happyDOM.setURL("https://haabcalendar.com/?utm_source=instagram&email=private@example.com#secret");
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  vi.spyOn(navigator, "webdriver", "get").mockReturnValue(false);
  const realCapture = vi.spyOn(PostHog.prototype, "capture");
  const capture = await loadLandingCapture();
  expect(capture).not.toBeNull();
  capture?.("$pageview", { language: "en" });
  const payload = realCapture.mock.results.find((result) => result.value?.event === "$pageview")?.value;
  expect(payload).toMatchObject({ event: "$pageview", properties: {
    $cookieless_mode: true, distinct_id: "$posthog_cookieless", $current_url: "https://haabcalendar.com/", utm_source: "instagram",
  } });
  expect(JSON.stringify(payload)).not.toMatch(/private@example|#secret|\$set|\$initial_current_url/);
  expect(window.localStorage.length).toBe(0);
  expect(window.sessionStorage.length).toBe(0);
  expect(document.cookie).toBe("");
});
