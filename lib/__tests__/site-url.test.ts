import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_SITE_URL,
  buildAbsoluteUrl,
  getSiteOrigin,
  getTrustedAppOrigins,
} from "@/lib/site-url";

const TOUCHED = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "HAAB_ADDITIONAL_ORIGINS",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(TOUCHED.map((key) => [key, process.env[key]]));
  for (const key of TOUCHED) delete process.env[key];
});

afterEach(() => {
  for (const key of TOUCHED) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key] as string;
  }
});

describe("canonical site origin", () => {
  it("uses NEXT_PUBLIC_SITE_URL ahead of every other source", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "haab-calendar.vercel.app";

    expect(getSiteOrigin()).toBe("https://haabcalendar.com");
  });

  it("reduces a configured URL with a path or trailing slash to its origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com/es/";

    expect(getSiteOrigin()).toBe("https://haabcalendar.com");
  });

  it("falls back to the Vercel production domain when nothing is configured", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "haab-calendar.vercel.app";

    expect(getSiteOrigin()).toBe("https://haab-calendar.vercel.app");
  });

  it("falls back to the built-in default when nothing is available", () => {
    expect(getSiteOrigin()).toBe(DEFAULT_SITE_URL);
  });

  it("ignores a malformed configured value rather than emitting an unusable origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not a url";

    expect(getSiteOrigin()).toBe(DEFAULT_SITE_URL);
  });
});

describe("absolute URLs", () => {
  it("joins a route path onto the canonical origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";

    expect(buildAbsoluteUrl("/doctors/rivera-family")).toBe(
      "https://haabcalendar.com/doctors/rivera-family",
    );
  });
});

describe("trusted application origins", () => {
  it("lists the canonical origin on its own by default", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";

    expect(getTrustedAppOrigins()).toEqual(["https://haabcalendar.com"]);
  });

  it("keeps a retired deployment origin accepted while its links are still in circulation", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";
    process.env.HAAB_ADDITIONAL_ORIGINS =
      "https://haab-calendar.vercel.app, https://www.haabcalendar.com";

    expect(getTrustedAppOrigins()).toEqual([
      "https://haabcalendar.com",
      "https://haab-calendar.vercel.app",
      "https://www.haabcalendar.com",
    ]);
  });

  it("drops malformed and duplicate entries instead of trusting them", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";
    process.env.HAAB_ADDITIONAL_ORIGINS =
      "https://haabcalendar.com,,nonsense,https://haab-calendar.vercel.app/some/path";

    expect(getTrustedAppOrigins()).toEqual([
      "https://haabcalendar.com",
      "https://haab-calendar.vercel.app",
    ]);
  });
});
