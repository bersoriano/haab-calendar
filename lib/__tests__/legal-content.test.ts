import { describe, expect, it } from "vitest";

import {
  LEGAL_CONTACT_EMAIL,
  legalContent,
  type LegalDocument,
} from "@/lib/legal/content";

const LANGS = ["en", "es"] as const;
const DOCUMENTS = ["privacy", "terms"] as const;

function every(pick: (doc: LegalDocument) => unknown) {
  return LANGS.flatMap((lang) => DOCUMENTS.map((doc) => pick(legalContent[lang][doc])));
}

describe("legal document structure", () => {
  it("covers the same sections in both languages, so neither can silently drift", () => {
    for (const doc of DOCUMENTS) {
      expect(legalContent.es[doc].sections.map((section) => section.id)).toEqual(
        legalContent.en[doc].sections.map((section) => section.id),
      );
    }
  });

  it("gives every section a heading and real body copy", () => {
    for (const sections of every((doc) => doc.sections) as LegalDocument["sections"][]) {
      expect(sections.length).toBeGreaterThan(0);

      for (const section of sections) {
        expect(section.heading.trim()).not.toBe("");
        expect(section.body.length).toBeGreaterThan(0);
        expect(section.body.every((line) => line.trim() !== "")).toBe(true);
      }
    }
  });

  it("dates every document, because a policy with no effective date is unreviewable", () => {
    for (const updated of every((doc) => doc.updated) as string[]) {
      expect(updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

function text(doc: LegalDocument) {
  return [doc.title, doc.summary, ...doc.sections.flatMap((s) => [s.heading, ...s.body])]
    .join("\n")
    .toLowerCase();
}

describe("privacy policy compliance content", () => {
  it.each(LANGS)("publishes a contact for privacy requests in %s", (lang) => {
    expect(text(legalContent[lang].privacy)).toContain(LEGAL_CONTACT_EMAIL.toLowerCase());
  });

  it.each(LANGS)("carries the Google Limited Use disclosure in %s", (lang) => {
    // Required for the sensitive calendar.events scope. Google's reviewer looks
    // for this specific commitment; without it the OAuth app is rejected.
    expect(text(legalContent[lang].privacy)).toContain("limited use");
  });

  it.each(LANGS)("names every Google scope the app actually requests, in %s", (lang) => {
    const body = text(legalContent[lang].privacy);

    expect(body).toContain("calendar.events");
    expect(body).toContain("calendar.calendarlist.readonly");
  });

  it.each(LANGS)("states the ARCO rights LFPDPPP requires, in %s", (lang) => {
    expect(text(legalContent[lang].privacy)).toContain("arco");
  });

  it.each(LANGS)("names the sub-processors that actually hold data, in %s", (lang) => {
    const body = text(legalContent[lang].privacy);

    for (const processor of ["supabase", "vercel", "stripe", "google"]) {
      expect(body).toContain(processor);
    }
  });
});

describe("terms content", () => {
  it.each(LANGS)("publishes a contact in %s", (lang) => {
    expect(text(legalContent[lang].terms)).toContain(LEGAL_CONTACT_EMAIL.toLowerCase());
  });
});
