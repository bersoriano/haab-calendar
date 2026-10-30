import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildLandingJsonLd,
  buildLandingMetadata,
  serializeJsonLd,
} from "@/components/landing/seo";
import { translations } from "@/components/landing/translations";

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";
});

afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
});

type GraphNode = { "@type": string; [key: string]: unknown };

function node(lang: "en" | "es", type: string): GraphNode {
  const graph = buildLandingJsonLd(lang)["@graph"] as GraphNode[];
  const found = graph.find((entry) => entry["@type"] === type);

  if (!found) throw new Error(`no ${type} in the landing graph`);
  return found;
}

describe("landing page metadata", () => {
  it("leads the title with what people search for, in each language", () => {
    expect(buildLandingMetadata("en").title).toEqual({
      absolute: "Online booking page for small businesses · Haab Calendar",
    });
    expect(buildLandingMetadata("es").title).toEqual({
      absolute: "Página de reservas en línea para negocios · Haab Calendar",
    });
  });

  it("keeps titles and descriptions short enough to show untruncated in results", () => {
    for (const lang of ["en", "es"] as const) {
      const { seo } = translations[lang];

      expect(`${seo.title} · Haab Calendar`.length).toBeLessThanOrEqual(60);
      expect(seo.description.length).toBeGreaterThanOrEqual(120);
      expect(seo.description.length).toBeLessThanOrEqual(160);
    }
  });

  it("names the English page as the bare root and Spanish by its ?lang URL", () => {
    expect(buildLandingMetadata("en").alternates?.canonical).toBe("https://haabcalendar.com/");
    expect(buildLandingMetadata("es").alternates?.canonical).toBe(
      "https://haabcalendar.com/?lang=es",
    );
  });

  it("declares the same reciprocal hreflang set on both versions", () => {
    const expected = {
      en: "https://haabcalendar.com/",
      es: "https://haabcalendar.com/?lang=es",
      "x-default": "https://haabcalendar.com/",
    };

    expect(buildLandingMetadata("en").alternates?.languages).toEqual(expected);
    expect(buildLandingMetadata("es").alternates?.languages).toEqual(expected);
  });

  it("previews each version in its own language and locale", () => {
    const en = buildLandingMetadata("en").openGraph;
    const es = buildLandingMetadata("es").openGraph;

    expect(en).toMatchObject({ url: "https://haabcalendar.com/", locale: "en_US" });
    expect(es).toMatchObject({ url: "https://haabcalendar.com/?lang=es", locale: "es_MX" });
    expect(en?.images).toEqual([
      expect.objectContaining({
        url: "https://haabcalendar.com/social-card/en.png",
        width: 1200,
        height: 630,
      }),
    ]);
    expect(es?.images).toEqual([
      expect.objectContaining({ url: "https://haabcalendar.com/social-card/es.png" }),
    ]);
  });

  it("asks for the large-image card on X", () => {
    expect(buildLandingMetadata("en").twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("landing page structured data", () => {
  it("states every FAQ entry exactly as the page shows it", () => {
    for (const lang of ["en", "es"] as const) {
      const faq = node(lang, "FAQPage");

      expect(faq.mainEntity).toEqual(
        translations[lang].faq.items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      );
    }
  });

  it("describes the product as a free web application", () => {
    expect(node("en", "WebApplication")).toMatchObject({
      name: "Haab Calendar",
      applicationCategory: "BusinessApplication",
      offers: { "@type": "Offer", price: "0" },
    });
  });

  it("claims no ratings or reviews, because none exist", () => {
    const serialized = JSON.stringify(buildLandingJsonLd("en"));

    expect(serialized).not.toContain("aggregateRating");
    expect(serialized).not.toContain("review");
  });

  it("identifies the page by the language version it describes", () => {
    expect(node("es", "WebPage")).toMatchObject({
      url: "https://haabcalendar.com/?lang=es",
      inLanguage: "es",
    });
  });

  it("names an organisation logo search engines can fetch", () => {
    expect(node("en", "Organization")).toMatchObject({
      url: "https://haabcalendar.com/",
      logo: expect.objectContaining({ url: "https://haabcalendar.com/icon-512.png" }),
    });
  });

  it("tells answer engines what the organisation does", () => {
    expect(node("en", "Organization")).toMatchObject({
      description: expect.stringContaining("no client sign-up"),
      knowsAbout: expect.arrayContaining(["online booking", "no-account booking"]),
    });
  });

  it("describes one organisation in both languages", () => {
    expect(node("es", "Organization")).toEqual(node("en", "Organization"));
  });

  it("states that the product works in English and Spanish", () => {
    expect(node("es", "WebApplication")).toMatchObject({ inLanguage: ["en", "es"] });
  });
});

describe("structured data serialisation", () => {
  it("cannot close its own <script> tag", () => {
    const html = serializeJsonLd({ text: "</script><script>alert(1)</script>" });

    expect(html).not.toContain("<");
    expect(JSON.parse(html)).toEqual({ text: "</script><script>alert(1)</script>" });
  });
});
