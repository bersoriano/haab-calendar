import { afterEach, beforeEach, describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { DEMO_PAGES, getDemoPagePath } from "@/lib/demo-pages";

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";
});

afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
});

describe("robots.txt", () => {
  it("points crawlers at the sitemap on the canonical domain", () => {
    expect(robots().sitemap).toBe("https://haabcalendar.com/sitemap.xml");
  });

  it("keeps private manage links out of the index", () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? rules[0].disallow : rules.disallow;

    // A manage URL *is* the credential. Indexing one publishes a booking.
    expect(disallow).toContain("/*/manage/");
  });

  it("keeps operator and machine surfaces out of the index", () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? rules[0].disallow : rules.disallow;

    expect(disallow).toEqual(
      expect.arrayContaining(["/api/", "/super-admin", "/public/", "/try-booking"]),
    );
  });
});

describe("sitemap.xml", () => {
  it("lists every URL as an absolute URL on the canonical domain", () => {
    for (const entry of sitemap()) {
      expect(entry.url.startsWith("https://haabcalendar.com/")).toBe(true);
    }
  });

  it("offers the landing page as the site root", () => {
    expect(sitemap().map((entry) => entry.url)).toContain("https://haabcalendar.com/");
  });

  it("lists every demo booking page, so the examples are discoverable", () => {
    const urls = sitemap().map((entry) => entry.url);

    for (const page of DEMO_PAGES) {
      expect(urls).toContain(`https://haabcalendar.com${getDemoPagePath(page)}`);
    }
  });

  it("lists the legal pages, which Google's OAuth reviewer has to reach", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain("https://haabcalendar.com/privacy");
    expect(urls).toContain("https://haabcalendar.com/terms");
  });

  it("never lists a private manage link", () => {
    expect(sitemap().every((entry) => !entry.url.includes("/manage/"))).toBe(true);
  });

  it("lists each URL once, so crawl budget is not spent on duplicates", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(new Set(urls).size).toBe(urls.length);
  });
});
