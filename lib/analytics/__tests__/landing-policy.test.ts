import { describe, expect, it } from "vitest";
import {
  getLandingAnalyticsConfig,
  sanitizeLandingEvent,
  readLandingAttribution,
} from "@/lib/analytics/landing-policy";

const environment = {
  key: "phc_public_test",
  host: "https://us.i.posthog.com",
  allowedHosts: "haabcalendar.com,www.haabcalendar.com",
};
const visitor = { hostname: "haabcalendar.com", pathname: "/", doNotTrack: null, globalPrivacyControl: false };

describe("landing analytics configuration", () => {
  it("enables only a configured landing on an explicitly approved hostname", () => {
    expect(getLandingAnalyticsConfig(environment, visitor)).toEqual({ key: "phc_public_test", host: "https://us.i.posthog.com" });
    for (const hostname of ["localhost", "127.0.0.1", "preview.vercel.app", "haabcalendar.com.evil.test"]) {
      expect(getLandingAnalyticsConfig(environment, { ...visitor, hostname })).toBeNull();
    }
    for (const pathname of ["/dashboard", "/doctors/test", "/login", "/gallery", "/en", "/es/agenda-online-para-medicos/x"]) {
      expect(getLandingAnalyticsConfig(environment, { ...visitor, pathname })).toBeNull();
    }
  });

  it("also measures the online booking page for doctors, in each language", () => {
    for (const pathname of ["/en/online-booking-for-doctors", "/es/agenda-online-para-medicos"]) {
      expect(getLandingAnalyticsConfig(environment, { ...visitor, pathname })).not.toBeNull();
    }
  });

  it("stays disabled for missing settings, unknown regions, or browser privacy signals", () => {
    expect(getLandingAnalyticsConfig({ ...environment, key: "" }, visitor)).toBeNull();
    expect(getLandingAnalyticsConfig({ ...environment, allowedHosts: "" }, visitor)).toBeNull();
    expect(getLandingAnalyticsConfig({ ...environment, host: "https://example.com" }, visitor)).toBeNull();
    expect(getLandingAnalyticsConfig(environment, { ...visitor, doNotTrack: "1" })).toBeNull();
    expect(getLandingAnalyticsConfig(environment, { ...visitor, globalPrivacyControl: true })).toBeNull();
    expect(getLandingAnalyticsConfig({ ...environment, host: "https://eu.i.posthog.com" }, visitor)?.host).toBe("https://eu.i.posthog.com");
  });
});

describe("landing analytics privacy boundary", () => {
  it("keeps only approved campaign tags and referring hostname", () => {
    expect(readLandingAttribution(
      "https://haabcalendar.com/?utm_source=Instagram&utm_medium=social&utm_campaign=Launch&email=private@example.com#token",
      "https://www.google.com/search?q=private@example.com",
    )).toEqual({ utm_source: "instagram", utm_medium: "social", utm_campaign: "launch", $referrer: "https://google.com", $referring_domain: "google.com" });
    expect(readLandingAttribution("https://haabcalendar.com/", "https://haabcalendar.com/?token=secret")).toEqual({ $referrer: "$direct", $referring_domain: "$direct" });
    expect(readLandingAttribution("https://haabcalendar.com/", "javascript:alert(1)")).toEqual({ $referrer: "$direct", $referring_domain: "$direct" });
  });

  it("strips arbitrary properties, form values, raw URLs, and SDK initial attribution", () => {
    const result = sanitizeLandingEvent({ event: "landing_cta_click", properties: {
      token: "phc_test", distinct_id: "anonymous", $session_id: "session",
      $current_url: "https://haabcalendar.com/?email=private@example.com#secret",
      $pathname: "/", $host: "haabcalendar.com", $referrer: "https://google.com",
      $initial_current_url: "https://haabcalendar.com/?token=secret", $initial_utm_source: "secret",
      email: "private@example.com", name: "Private", $set: { email: "private@example.com" },
      section: "hero", action: "create_page", language: "en", $device_type: "Mobile",
    } });
    expect(result?.properties).toEqual({
      token: "phc_test", distinct_id: "anonymous", $session_id: "session",
      $current_url: "https://haabcalendar.com/", $pathname: "/", $host: "haabcalendar.com",
      $referrer: "https://google.com", section: "hero", action: "create_page", language: "en", $device_type: "Mobile",
    });
  });

  it("rejects automatic events and every non-landing URL", () => {
    for (const event of ["$autocapture", "$snapshot", "$identify", "$exception", "$feature_flag_called", "unknown"]) {
      expect(sanitizeLandingEvent({ event, properties: { $current_url: "https://haabcalendar.com/" } })).toBeNull();
    }
    expect(sanitizeLandingEvent({ event: "$pageview", properties: { $current_url: "https://haabcalendar.com/doctors/test/manage/private-token" } })).toBeNull();
    expect(sanitizeLandingEvent({ event: "$pageview", properties: { $current_url: "not-a-url" } })).toBeNull();
  });

  it("names which measured page an event came from, without its query or hash", () => {
    const result = sanitizeLandingEvent({ event: "landing_section_view", properties: {
      $current_url: "https://haabcalendar.com/es/agenda-online-para-medicos?email=private@example.com#secret",
      $pathname: "/es/agenda-online-para-medicos", $host: "haabcalendar.com", section: "front-desk", language: "es",
    } });
    expect(result?.properties).toEqual({
      $current_url: "https://haabcalendar.com/es/agenda-online-para-medicos",
      $pathname: "/es/agenda-online-para-medicos", $host: "haabcalendar.com", section: "front-desk", language: "es",
    });
    // A path the event does not come from is dropped, never trusted.
    expect(sanitizeLandingEvent({ event: "$pageview", properties: {
      $current_url: "https://haabcalendar.com/en/online-booking-for-doctors", $pathname: "/dashboard",
    } })?.properties).toEqual({ $current_url: "https://haabcalendar.com/en/online-booking-for-doctors" });
  });

  it("rejects free-form metadata even when a property name is approved", () => {
    const result = sanitizeLandingEvent({ event: "landing_cta_click", properties: {
      $current_url: "https://haabcalendar.com/", section: "private@example.com", action: "secret-token", language: "xx", vertical: "private", question: -1, percent: 900,
    } });
    expect(result?.properties).toEqual({ $current_url: "https://haabcalendar.com/" });
  });
});
