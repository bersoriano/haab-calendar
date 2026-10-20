import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { buildDoctorsJsonLd, buildDoctorsMetadata } from "@/components/landing/doctors-seo";
import { doctorsTranslations } from "@/components/landing/doctors-translations";
import { DEMO_PAGES } from "@/lib/demo-pages";
import { DOCTORS_LANDING_PATHS, routeLanguage } from "@/lib/language/localized-routes";
import { applyLanguageCookie, forwardRouteLanguage } from "@/lib/language/proxy-language";
import { LANGUAGE_COOKIE } from "@/lib/language/resolve";

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";
});

afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
});

function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return [`${prefix}[${value.length}]`, ...value.flatMap((child, i) => keyPaths(child, `${prefix}.${i}`))];
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      keyPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(strings);
  return [];
}

describe("online booking for doctors: URLs", () => {
  it("has one URL per language, with each language's own words", () => {
    expect(DOCTORS_LANDING_PATHS).toEqual({
      en: "/en/online-booking-for-doctors",
      es: "/es/agenda-online-para-medicos",
    });
  });

  it("reads the language from the first path segment only", () => {
    expect(routeLanguage(DOCTORS_LANDING_PATHS.en)).toBe("en");
    expect(routeLanguage(DOCTORS_LANDING_PATHS.es)).toBe("es");
    expect(routeLanguage("/")).toBeUndefined();
    expect(routeLanguage("/doctors/dr-maya-rivera")).toBeUndefined();
    expect(routeLanguage("/gallery/es")).toBeUndefined();
  });

  it("renders the Spanish URL in Spanish and remembers it, whatever the cookie said", () => {
    const request = new NextRequest(`https://haabcalendar.com${DOCTORS_LANDING_PATHS.es}`, {
      headers: { cookie: `${LANGUAGE_COOKIE}=en`, "accept-language": "en-US" },
    });
    const previous = forwardRouteLanguage(request);
    // The root layout reads <html lang> from this request's cookie.
    expect(request.cookies.get(LANGUAGE_COOKIE)?.value).toBe("es");
    const response = NextResponse.next({ request });
    expect(applyLanguageCookie(request, response, previous)).toBe("es");
    expect(response.cookies.get(LANGUAGE_COOKIE)?.value).toBe("es");
  });

  it("remembers the Spanish URL for a first-time visitor with no cookie", () => {
    const request = new NextRequest(`https://haabcalendar.com${DOCTORS_LANDING_PATHS.es}`);
    const previous = forwardRouteLanguage(request);
    expect(previous).toBeNull();
    const response = NextResponse.next({ request });
    applyLanguageCookie(request, response, previous);
    expect(response.cookies.get(LANGUAGE_COOKIE)?.value).toBe("es");
  });

  it("leaves every other page's language to ?lang, the cookie, and the browser", () => {
    const request = new NextRequest("https://haabcalendar.com/gallery", {
      headers: { cookie: `${LANGUAGE_COOKIE}=es` },
    });
    const previous = forwardRouteLanguage(request);
    const response = NextResponse.next({ request });
    expect(applyLanguageCookie(request, response, previous)).toBe("es");
    expect(response.cookies.get(LANGUAGE_COOKIE)).toBeUndefined();
  });
});

describe("online booking for doctors: copy", () => {
  it("keeps identical English and Spanish shapes, with nothing left empty", () => {
    expect(keyPaths(doctorsTranslations.es).sort()).toEqual(keyPaths(doctorsTranslations.en).sort());
    for (const value of [...strings(doctorsTranslations.en), ...strings(doctorsTranslations.es)]) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  it("claims only what Haab ships: no reminders, payments, reviews, or certifications", () => {
    const copy = [...strings(doctorsTranslations.en), ...strings(doctorsTranslations.es)].join("\n");
    expect(copy).not.toMatch(
      /\b(reminders?|recordatorios?|HIPAA|SOC 2|NOM-024|payments?|pagos?|reviews?|reseñas?|telemedicine|telemedicina)\b/i,
    );
  });

  it("speaks to the visitor as tú in Spanish", () => {
    const spanish = strings(doctorsTranslations.es).join("\n");
    expect(spanish).not.toMatch(/(^|[^\p{L}])(usted|su consultorio|sus pacientes)(?=[^\p{L}]|$)/iu);
  });
});

describe("online booking for doctors: examples", () => {
  it("shows real seeded practices that exist", () => {
    const keys = DEMO_PAGES.map((page) => page.key);
    expect(keys).toEqual(expect.arrayContaining(["doctors", "dentists"]));
  });
});

describe("online booking for doctors: search metadata", () => {
  it("names its own URL canonical and confirms the other language's", () => {
    for (const lang of ["en", "es"] as const) {
      const meta = buildDoctorsMetadata(lang);
      expect(meta.alternates?.canonical).toBe(`https://haabcalendar.com${DOCTORS_LANDING_PATHS[lang]}`);
      expect(meta.alternates?.languages).toEqual({
        en: "https://haabcalendar.com/en/online-booking-for-doctors",
        es: "https://haabcalendar.com/es/agenda-online-para-medicos",
        "x-default": "https://haabcalendar.com/en/online-booking-for-doctors",
      });
    }
    expect(buildDoctorsMetadata("en").title).toEqual({
      absolute: "Online Booking for Doctors and Clinics · Haab Calendar",
    });
    expect(buildDoctorsMetadata("es").title).toEqual({
      absolute: "Agenda online para médicos y consultorios · Haab Calendar",
    });
  });

  it("publishes the page's own questions as its FAQ, and one product", () => {
    for (const lang of ["en", "es"] as const) {
      const graph = buildDoctorsJsonLd(lang)["@graph"] as { "@type": string; [key: string]: unknown }[];
      const faq = graph.find((entry) => entry["@type"] === "FAQPage") as unknown as { mainEntity: { name: string }[] };
      expect(faq.mainEntity.map((q) => q.name)).toEqual(doctorsTranslations[lang].faq.items.map((item) => item.q));
      // Same @id as the landing page's app node: one product, two pages.
      expect(graph.find((entry) => entry["@type"] === "WebApplication")?.["@id"]).toBe("https://haabcalendar.com/#app");
    }
  });

  it("lists both URLs in the sitemap, each with the full hreflang set", () => {
    const entries = sitemap().filter((entry) => entry.url.includes("doctors") || entry.url.includes("medicos"));
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain("https://haabcalendar.com/en/online-booking-for-doctors");
    expect(urls).toContain("https://haabcalendar.com/es/agenda-online-para-medicos");
    for (const entry of entries.filter((e) => /\/(en|es)\//.test(e.url))) {
      expect(Object.keys(entry.alternates?.languages ?? {}).sort()).toEqual(["en", "es", "x-default"]);
    }
  });
});
