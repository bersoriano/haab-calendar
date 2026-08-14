import { describe, expect, it } from "vitest";

import { translations } from "@/components/landing/translations";
import { DEMO_PAGES } from "@/lib/demo-pages";
import {
  LANDING_DEMO_COUNT,
  allDemoIndexes,
  pickFeaturedDemos,
} from "@/lib/demo-gallery";

describe("pickFeaturedDemos", () => {
  it("returns the landing count by default", () => {
    expect(pickFeaturedDemos()).toHaveLength(LANDING_DEMO_COUNT);
  });

  it("never repeats a demo", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const picked = pickFeaturedDemos();
      expect(new Set(picked).size).toBe(picked.length);
    }
  });

  it("only returns indexes that address a real demo and its landing copy", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      for (const index of pickFeaturedDemos()) {
        expect(DEMO_PAGES[index]).toBeDefined();
        expect(translations.en.liveExamples.items[index]).toBeDefined();
        expect(translations.es.liveExamples.items[index]).toBeDefined();
      }
    }
  });

  it("caps at what exists when asked for more", () => {
    expect(pickFeaturedDemos(DEMO_PAGES.length + 5)).toHaveLength(DEMO_PAGES.length);
  });

  it("returns nothing for a zero or negative count", () => {
    expect(pickFeaturedDemos(0)).toEqual([]);
    expect(pickFeaturedDemos(-3)).toEqual([]);
  });

  it("can reach every demo across repeated picks", () => {
    // A shuffle that only ever moved a prefix would still pass the tests above.
    const seen = new Set<number>();
    for (let attempt = 0; attempt < 300; attempt += 1) {
      for (const index of pickFeaturedDemos()) {
        seen.add(index);
      }
    }

    expect(seen.size).toBe(DEMO_PAGES.length);
  });

  it("is deterministic when given a fixed source of randomness", () => {
    const zeroes = () => 0;

    expect(pickFeaturedDemos(3, zeroes)).toEqual(pickFeaturedDemos(3, zeroes));
  });
});

describe("allDemoIndexes", () => {
  it("addresses every demo once, in declaration order", () => {
    expect(allDemoIndexes()).toEqual(DEMO_PAGES.map((_, index) => index));
  });
});

describe("copy that names how many demos there are", () => {
  // The count used to be written out ("twelve pages") and went stale twice as
  // demos were added, so every such sentence carries a placeholder now.
  it("uses a placeholder rather than a written-out number", () => {
    for (const lang of ["en", "es"] as const) {
      const copy = translations[lang].liveExamples;

      expect(copy.seeAll).toContain("{n}");
      expect(copy.note).toContain("{n}");
      expect(copy.body).toContain("{n}");
    }
  });
});

describe("gallery copy", () => {
  it("names the count with a placeholder in both languages", () => {
    for (const lang of ["en", "es"] as const) {
      expect(translations[lang].gallery.body).toContain("{n}");
      expect(translations[lang].gallery.title).toBeTruthy();
      expect(translations[lang].gallery.back).toBeTruthy();
    }
  });
});
