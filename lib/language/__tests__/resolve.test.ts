import { describe, expect, it } from "vitest";

import {
  DEFAULT_LANGUAGE,
  detectLangFromAcceptLanguage,
  LANGUAGE_COOKIE,
  parseLang,
  resolveLanguage,
} from "@/lib/language/resolve";
import { applyLanguageCookie } from "@/lib/language/proxy-language";

type FakeRequest = {
  cookies: { get(name: string): { value: string } | undefined };
  headers: { get(name: string): string | null };
  nextUrl: { searchParams: URLSearchParams };
};

function fakeRequest(options: {
  cookie?: string;
  acceptLanguage?: string;
  search?: string;
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
    nextUrl: { searchParams: new URLSearchParams(options.search ?? "") },
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
