import { describe, expect, it } from "vitest";

import {
  DEFAULT_LANGUAGE,
  detectLangFromAcceptLanguage,
  LANGUAGE_COOKIE,
  parseLang,
  resolveLanguage,
} from "@/lib/language/resolve";
import { applyLanguageCookie } from "@/lib/language/proxy-language";
import { isPublicBookingRoute } from "@/lib/language/public-routes";

type FakeRequest = {
  cookies: { get(name: string): { value: string } | undefined };
  headers: { get(name: string): string | null };
  nextUrl: { pathname: string; searchParams: URLSearchParams };
};

function fakeRequest(options: {
  cookie?: string;
  acceptLanguage?: string;
  search?: string;
  pathname?: string;
}): FakeRequest {
  return {
    cookies: {
      get: (name) =>
        name === "haab-lang" && options.cookie
          ? { value: options.cookie }
          : undefined,
    },
    headers: {
      get: (name) =>
        name.toLowerCase() === "accept-language"
          ? (options.acceptLanguage ?? null)
          : null,
    },
    nextUrl: {
      pathname: options.pathname ?? "/",
      searchParams: new URLSearchParams(options.search ?? ""),
    },
  };
}

function fakeResponse() {
  const set: { name: string; value: string }[] = [];
  return { set, cookies: { set: (name: string, value: string) => set.push({ name, value }) } };
}

describe("parseLang", () => {
  it("accepts only the two supported languages", () => {
    expect(parseLang("en")).toBe("en");
    expect(parseLang("es")).toBe("es");
    expect(parseLang("fr")).toBeUndefined();
    expect(parseLang("")).toBeUndefined();
    expect(parseLang(null)).toBeUndefined();
    expect(parseLang(undefined)).toBeUndefined();
    expect(parseLang(42)).toBeUndefined();
  });
});

describe("detectLangFromAcceptLanguage", () => {
  it("reads a plain Spanish header", () => {
    expect(detectLangFromAcceptLanguage("es")).toBe("es");
    expect(detectLangFromAcceptLanguage("es-MX")).toBe("es");
    expect(detectLangFromAcceptLanguage("es-419")).toBe("es");
  });

  it("reads a plain English header", () => {
    expect(detectLangFromAcceptLanguage("en-US")).toBe("en");
  });

  it("honours q-values over list position", () => {
    expect(detectLangFromAcceptLanguage("en-US;q=0.5,es-MX;q=0.9")).toBe("es");
    expect(detectLangFromAcceptLanguage("es-MX;q=0.4,en-US;q=0.8")).toBe("en");
  });

  it("breaks q-value ties on document order", () => {
    expect(detectLangFromAcceptLanguage("es,en")).toBe("es");
    expect(detectLangFromAcceptLanguage("en,es")).toBe("en");
  });

  it("ignores unsupported and zero-weighted tags", () => {
    expect(detectLangFromAcceptLanguage("fr-FR,de;q=0.8")).toBeUndefined();
    expect(detectLangFromAcceptLanguage("es;q=0,en")).toBe("en");
    expect(detectLangFromAcceptLanguage("*")).toBeUndefined();
  });

  it("returns undefined for a missing header", () => {
    expect(detectLangFromAcceptLanguage(undefined)).toBeUndefined();
    expect(detectLangFromAcceptLanguage(null)).toBeUndefined();
    expect(detectLangFromAcceptLanguage("")).toBeUndefined();
  });
});

describe("resolveLanguage", () => {
  it("defaults to English with no signal at all", () => {
    expect(DEFAULT_LANGUAGE).toBe("en");
    expect(resolveLanguage({})).toBe("en");
  });

  it("prefers an explicit ?lang over everything else", () => {
    expect(
      resolveLanguage({ explicit: "en", cookie: "es", acceptLanguage: "es-MX" }),
    ).toBe("en");
  });

  it("prefers a stored cookie over detection", () => {
    expect(resolveLanguage({ cookie: "en", acceptLanguage: "es-MX" })).toBe("en");
  });

  it("falls back to Accept-Language detection", () => {
    expect(resolveLanguage({ acceptLanguage: "es-MX,en;q=0.7" })).toBe("es");
  });

  it("falls back to English when the header names neither language", () => {
    expect(resolveLanguage({ acceptLanguage: "fr-FR" })).toBe("en");
  });

  it("ignores junk in the explicit and cookie slots", () => {
    expect(resolveLanguage({ explicit: "fr", cookie: "de" })).toBe("en");
    expect(resolveLanguage({ explicit: "fr", cookie: "es" })).toBe("es");
  });

  it("names the cookie consistently", () => {
    expect(LANGUAGE_COOKIE).toBe("haab-lang");
  });
});

describe("applyLanguageCookie", () => {
  it("writes the detected language when no cookie exists", () => {
    const response = fakeResponse();
    const lang = applyLanguageCookie(
      fakeRequest({ acceptLanguage: "es-MX,en;q=0.6" }) as never,
      response as never,
    );

    expect(lang).toBe("es");
    expect(response.set).toEqual([{ name: "haab-lang", value: "es" }]);
  });

  it("defaults to English and still writes the cookie", () => {
    const response = fakeResponse();
    expect(applyLanguageCookie(fakeRequest({}) as never, response as never)).toBe("en");
    expect(response.set).toEqual([{ name: "haab-lang", value: "en" }]);
  });

  it("does not rewrite a cookie that already agrees", () => {
    const response = fakeResponse();
    const lang = applyLanguageCookie(
      fakeRequest({ cookie: "en", acceptLanguage: "es-MX" }) as never,
      response as never,
    );

    expect(lang).toBe("en");
    expect(response.set).toEqual([]);
  });

  it("lets an explicit ?lang overwrite a stored cookie", () => {
    const response = fakeResponse();
    const lang = applyLanguageCookie(
      fakeRequest({ cookie: "en", search: "lang=es" }) as never,
      response as never,
    );

    expect(lang).toBe("es");
    expect(response.set).toEqual([{ name: "haab-lang", value: "es" }]);
  });
});

describe("applyLanguageCookie on a public booking page", () => {
  it("keeps a client's per-business ?lang out of the shared cookie", () => {
    // The module writes the visitor's choice into this page's URL and
    // deliberately not into the cookie, so that choosing Spanish on one
    // business's page does not follow the visitor to the marketing site or to
    // another business. Honouring ?lang here would undo exactly that on the
    // next reload, and on any shared "…?lang=es" link.
    const response = fakeResponse();
    const lang = applyLanguageCookie(
      fakeRequest({
        cookie: "en",
        search: "lang=es",
        pathname: "/doctors/dr-maya-rivera",
      }) as never,
      response as never,
    );

    expect(lang).toBe("en");
    expect(response.set).toEqual([]);
  });

  it("still detects a language for a first-time visitor", () => {
    const response = fakeResponse();
    const lang = applyLanguageCookie(
      fakeRequest({
        acceptLanguage: "es-MX,en;q=0.6",
        search: "lang=en",
        pathname: "/public/ferias-del-sur",
      }) as never,
      response as never,
    );

    expect(lang).toBe("es");
    expect(response.set).toEqual([{ name: "haab-lang", value: "es" }]);
  });

  it("still honours ?lang everywhere else", () => {
    const response = fakeResponse();
    const lang = applyLanguageCookie(
      fakeRequest({ cookie: "en", search: "lang=es", pathname: "/login" }) as never,
      response as never,
    );

    expect(lang).toBe("es");
    expect(response.set).toEqual([{ name: "haab-lang", value: "es" }]);
  });
});

describe("isPublicBookingRoute", () => {
  it.each([
    "/doctors/dr-maya-rivera",
    "/professionals/estudio-luz",
    "/spaces/casa-azul",
    "/venues/casa-azul",
    "/events/ferias-del-sur",
    "/events/ferias-del-sur/taller-de-barro",
    "/events/ferias-del-sur/manage/abc123",
    "/public/ferias-del-sur",
    "/public/ferias-del-sur/manage/abc123",
    "/Doctors/Dr-Maya-Rivera",
  ])("recognises a client-facing booking page: %s", (pathname) => {
    expect(isPublicBookingRoute(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/login",
    "/auth/confirm",
    "/super-admin",
    "/super-admin/users",
    "/try-booking",
    "/api/public/doctors/dr-maya-rivera/holds",
    "/api/provider/store",
    "/doctors",
    "/public",
    "/doctorate/whatever",
    // Object.prototype members reachable through the segment map's index
    // lookup. These are not verticals, so they must not be treated as one
    // business's page — this predicate gates the shared-cookie write. Only
    // the all-lowercase members can get this far; the segment parser
    // lowercases, so "/toString/x" arrives as the harmless "tostring".
    "/constructor/whatever",
    "/__proto__/whatever",
  ])("leaves every other route alone: %s", (pathname) => {
    expect(isPublicBookingRoute(pathname)).toBe(false);
  });
});
