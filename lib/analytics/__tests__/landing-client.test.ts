// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Window as HappyWindow } from "happy-dom";
import type { PostHogConfig } from "posthog-js";

const sdk = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock("posthog-js/no-external", () => ({ default: { init: sdk.init } }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS", "haabcalendar.com");
  (window as unknown as HappyWindow).happyDOM.setURL("https://haabcalendar.com/?utm_source=Instagram&token=private#secret");
  sdk.init.mockReset().mockReturnValue({ capture: sdk.capture });
  sdk.capture.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("landing SDK boundary", () => {
  it("sends sanitized acquisition data with only explicit, cookieless collection enabled", async () => {
    const { loadLandingCapture } = await import("@/lib/analytics/landing-client");
    const capture = await loadLandingCapture();
    capture?.("$pageview", { language: "es" });
    const config = sdk.init.mock.calls[0][1] as Partial<PostHogConfig>;
    expect(config).toMatchObject({
      autocapture: false, capture_pageview: false, capture_pageleave: false,
      disable_session_recording: true, person_profiles: "never", cookieless_mode: "always",
      persistence: "memory", disable_persistence: true, advanced_disable_flags: true,
      disable_external_dependency_loading: true, capture_performance: false,
      capture_exceptions: false, capture_heatmaps: false, capture_dead_clicks: false,
      disable_surveys: true, disable_product_tours: true,
      disable_conversations: true, disableDeviceModel: true,
      save_campaign_params: false, save_referrer: false, respect_dnt: true,
    });
    expect(sdk.capture).toHaveBeenCalledWith("$pageview", expect.objectContaining({
      $current_url: "https://haabcalendar.com/", language: "es", utm_source: "instagram",
    }), undefined);
    expect(JSON.stringify(sdk.capture.mock.calls)).not.toContain("private");
    const filtered = (config.before_send as (event: unknown) => unknown)({
      uuid: "test-uuid", event: "$pageview", properties: { $current_url: "https://haabcalendar.com/?token=private", $cookieless_mode: true, distinct_id: "$posthog_cookieless" },
      $set: { email: "private@example.com" },
    });
    expect(filtered).toEqual({ uuid: "test-uuid", event: "$pageview", properties: { $current_url: "https://haabcalendar.com/", $cookieless_mode: true, distinct_id: "$posthog_cookieless" } });
  });

  it("does not initialize on previews or when key is missing", async () => {
    const { loadLandingCapture } = await import("@/lib/analytics/landing-client");
    (window as unknown as HappyWindow).happyDOM.setURL("https://preview.vercel.app/");
    expect(await loadLandingCapture()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    (window as unknown as HappyWindow).happyDOM.setURL("https://haabcalendar.com/");
    expect(await loadLandingCapture()).toBeNull();
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it("contains loading and capture failures so landing actions remain usable", async () => {
    sdk.init.mockImplementation(() => { throw new Error("blocked"); });
    const { loadLandingCapture } = await import("@/lib/analytics/landing-client");
    expect(await loadLandingCapture()).toBeNull();
  });
});
