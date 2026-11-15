import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { translations } from "@/components/landing/translations";
import {
  DEMO_ANSWERED_INVITATION_TOKEN,
  DEMO_PAGES,
  DEMO_SAMPLE_INVITATION_TOKEN,
  findDemoPage,
  getDemoPagePath,
  isDemoOwnerEmail,
} from "@/lib/demo-pages";
import { isWellFormedInvitationToken } from "@/lib/invitations";

const seedScript = readFileSync(
  join(process.cwd(), "scripts/seed-public-examples.mjs"),
  "utf8",
);

function seedValues(field: string) {
  return [...seedScript.matchAll(new RegExp(`^\\s{4}${field}: "(.+)",$`, "gm"))].map(
    (match) => match[1],
  );
}

describe("demo pages allowlist", () => {
  it("lists the same public paths the seed script creates", () => {
    expect(seedValues("path")).toEqual(DEMO_PAGES.map(getDemoPagePath));
  });

  it("uses the same owner key order as the seed script", () => {
    expect(seedValues("ownerKey")).toEqual(DEMO_PAGES.map((page) => page.key));
  });

  it("derives owner emails the same way the seed script does", () => {
    for (const page of DEMO_PAGES) {
      expect(page.ownerEmail).toBe(
        `public-examples+${page.key}@haab-calendar.invalid`,
      );
      expect(seedScript).toContain(`email: demoOwnerEmail("${page.key}")`);
    }
  });

  it("has one landing card per demo in every language", () => {
    // LiveExamples pairs items[index] with DEMO_PAGES[index]; a short list
    // would silently drop a demo, a long one would link nowhere.
    for (const lang of ["en", "es"] as const) {
      expect(translations[lang].liveExamples.items).toHaveLength(DEMO_PAGES.length);
    }
  });

  it("gives every demo its own owner", () => {
    const owners = new Set(DEMO_PAGES.map((page) => page.ownerEmail));
    expect(owners.size).toBe(DEMO_PAGES.length);
  });
});

describe("wedding demo sample invitations", () => {
  const samples = [DEMO_SAMPLE_INVITATION_TOKEN, DEMO_ANSWERED_INVITATION_TOKEN];

  it("are well-formed invitation links", () => {
    for (const token of samples) expect(isWellFormedInvitationToken(token)).toBe(true);
  });

  it("are two different households", () => {
    expect(new Set(samples).size).toBe(2);
  });

  it("match the tokens the seed script writes", () => {
    for (const token of samples) expect(seedScript).toContain(`"${token}"`);
  });
});

describe("findDemoPage", () => {
  it("resolves a known key, ignoring case and padding", () => {
    expect(findDemoPage(" Doctors ")?.providerSlug).toBe("dr-maya-rivera");
  });

  it("rejects unknown, empty, and missing keys", () => {
    expect(findDemoPage("not-a-demo")).toBeUndefined();
    expect(findDemoPage("")).toBeUndefined();
    expect(findDemoPage(undefined)).toBeUndefined();
    expect(findDemoPage(null)).toBeUndefined();
  });
});

describe("isDemoOwnerEmail", () => {
  it("accepts the seeded demo owners", () => {
    expect(isDemoOwnerEmail("public-examples+doctors@haab-calendar.invalid")).toBe(true);
    expect(isDemoOwnerEmail(" PUBLIC-EXAMPLES+EVENTS@haab-calendar.invalid ")).toBe(true);
  });

  it("rejects real accounts and near misses", () => {
    expect(isDemoOwnerEmail("bsorianodev@gmail.com")).toBe(false);
    expect(isDemoOwnerEmail("public-examples@haab-calendar.invalid")).toBe(false);
    expect(isDemoOwnerEmail("public-examples+doctors@evil.example")).toBe(false);
    expect(isDemoOwnerEmail(undefined)).toBe(false);
    expect(isDemoOwnerEmail("")).toBe(false);
  });
});
