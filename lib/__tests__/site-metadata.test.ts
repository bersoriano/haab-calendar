import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  PRIVATE_PAGE_METADATA,
  buildProviderCanonicalMetadata,
  buildPublicPageMetadata,
  buildRootMetadata,
} from "@/lib/site-metadata";

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";
});

afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
});

describe("root metadata", () => {
  it("resolves relative metadata URLs against the canonical domain", () => {
    expect(buildRootMetadata().metadataBase?.toString()).toBe("https://haabcalendar.com/");
  });

  it("keeps the product name and description", () => {
    const metadata = buildRootMetadata();

    expect(metadata.title).toBe("Haab Calendar");
    expect(metadata.description).toContain("booking");
  });

  it("announces the canonical domain to social crawlers", () => {
    expect(buildRootMetadata().openGraph?.url).toBe("https://haabcalendar.com");
  });
});

describe("private page metadata", () => {
  it("tells crawlers not to index or follow a page carrying a private token", () => {
    expect(PRIVATE_PAGE_METADATA.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});

describe("public page metadata", () => {
  it("declares one absolute canonical URL for a provider page", () => {
    expect(buildPublicPageMetadata("/doctors/rivera-family").alternates?.canonical).toBe(
      "https://haabcalendar.com/doctors/rivera-family",
    );
  });

  it("drops the query string, so ?lang variants do not read as separate pages", () => {
    expect(
      buildPublicPageMetadata("/doctors/rivera-family?lang=es").alternates?.canonical,
    ).toBe("https://haabcalendar.com/doctors/rivera-family");
  });
});

describe("provider page canonical URL", () => {
  it("names the provider page itself", () => {
    expect(
      buildProviderCanonicalMetadata("doctors", "rivera-family").alternates?.canonical,
    ).toBe("https://haabcalendar.com/doctors/rivera-family");
  });

  it("names the service page when one is selected", () => {
    expect(
      buildProviderCanonicalMetadata("doctors", "rivera-family", "annual-checkup")
        .alternates?.canonical,
    ).toBe("https://haabcalendar.com/doctors/rivera-family/annual-checkup");
  });

  it("normalises the casing a visitor typed, so one page has one canonical URL", () => {
    expect(
      buildProviderCanonicalMetadata("Doctors", "Rivera-Family").alternates?.canonical,
    ).toBe("https://haabcalendar.com/doctors/rivera-family");
  });

  it("declares no canonical URL for a segment that is not a public vertical", () => {
    expect(buildProviderCanonicalMetadata("nonsense", "rivera-family")).toEqual({});
  });
});
