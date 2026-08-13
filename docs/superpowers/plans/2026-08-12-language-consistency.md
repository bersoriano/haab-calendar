# Language & Localization Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every screen renders entirely in one language, from one dictionary, behind one switcher, with a deliberate English default and no wrong-language flash.

**Architecture:** Language resolution moves to one pure module (`lib/language/`) consumed server-side in `proxy.ts` and `app/layout.tsx`, so the language is known before the first byte. The "English branch" anti-pattern (English composed inline, Spanish read from a dictionary) is deleted everywhere, which makes the existing key-parity test able to catch gaps for both languages. The owner's public-page language and their own dashboard language become two separate fields.

**Tech Stack:** Next.js 16.2.7 (App Router; middleware is `proxy.ts`, not `middleware.ts`), React 19.2.4, TypeScript, Supabase, Vitest 4 (node environment, `renderToStaticMarkup` for component assertions), Tailwind 4.

## Global Constraints

- **Read `node_modules/next/dist/docs/` before writing any Next.js-specific code.** This Next version has breaking changes vs. training data. Middleware lives in `proxy.ts` at the repo root and exports `proxy`, not `middleware`.
- **Default language is English.** Any code path that cannot determine a language resolves to `"en"`. There must be no remaining `?? "es"` or `value === "en" ? "en" : "es"` default anywhere.
- **Spanish detection signal is `Accept-Language` only.** No geo-IP, no `x-vercel-ip-country`, no country list.
- **The owner's saved `provider.language` always wins on their public booking page.** Detection never overrides it at render time; detection only *seeds* it at setup time via the existing `seedSetupLanguage`.
- **Interface text is translated; owner-authored content is not.** Owner-typed fields (`heroText`, service `name`/`description`/`notes`/`capacity`/`cost`, addresses) are never auto-translated. `lib/public-content-i18n.ts` translates *seeded demo examples only* and stays that way.
- **`cost` stays free text, unformatted.** Decided: locale-formatted currency is explicitly out of scope. Do not add a currency field. Do not wrap `cost` in `Intl.NumberFormat`.
- **Super-admin (`app/super-admin/**`, `components/super-admin/**`) is English-only by design** — an internal operator tool, not a bilingual surface. Its `Intl.DateTimeFormat("en", …)` calls are correct. Do not translate it.
- **Every task ends with `npm test` green.** Run `npx tsc --noEmit` before each commit.
- Commit messages: Conventional Commits, imperative subject ≤50 chars.

## Known Limitation (accept and document, do not work around)

`components/provider/ServiceEditor.tsx:300` uses `<input type="date">`. Native date inputs render in the **OS/browser locale**, not the page language — a Spanish page on a US-configured machine will still show mm/dd/yyyy. There is no app-level fix short of replacing it with a custom picker (out of scope). Task 9 adds a `lang` attribute (honored by Chromium, ignored by Firefox/Safari) and a code comment recording the limitation.

## File Structure

**Create:**
- `lib/language/resolve.ts` — pure, dependency-free language resolution. No React, no `next/headers`, no `server-only`. Importable from proxy, server components, client components, and tests.
- `lib/language/server.ts` — `server-only` wrapper reading `cookies()`/`headers()`.
- `lib/language/__tests__/resolve.test.ts`
- `components/ui/LanguageSwitcher.tsx` — the single switcher, two render modes (stateful buttons, and anchor links for the server-rendered login page).
- `components/__tests__/language-purity.test.tsx` — guard test: renders key screens in both languages and fails on cross-language leakage.
- `supabase/migrations/20260812200000_add_provider_dashboard_language.sql`

**Modify:**
- `proxy.ts` — resolve and set the language cookie
- `app/layout.tsx:29` — `<html lang>` from the resolved language
- `components/landing/translations.ts:1005` — `normalizeLandingLang` default flips to `"en"`
- `components/landing/language-provider.tsx:38,102-128` — default `"en"`, cookie-seeded, switcher extracted
- `components/landing/landing-ui.tsx:543,571` — use the shared switcher
- `app/not-found.tsx:16-64` — use the shared switcher and the server-resolved language
- `app/login/page.tsx:65-80` — use the shared switcher in link mode
- `components/ui/BookingHoldCountdownBar.tsx:54-93,119` — delete the English branch
- `components/haab-booking-module.tsx:440,647,909,3791` — dashboard language, storage leak, switcher, English branch
- `lib/auth-i18n.ts:33` — delete the English branch
- `components/provider/AdminHero.tsx` + `components/provider/__tests__/admin-hero.test.tsx`
- `components/booking/i18n/translations.ts` — new keys (both languages)
- `lib/types.ts:23-45`, `lib/store.ts:294`, `lib/supabase/bookings.ts:38,54,241`, `lib/supabase/provider-store.ts:158` — `dashboardLanguage`
- `lib/constants.ts:13,53-57` — delete dead English-only exports
- `lib/format.ts` — pin time-format intent with tests
- `components/provider/ServiceEditor.tsx:300` — date input `lang` attribute

---

### Task 1: Pure language resolution

**Files:**
- Create: `lib/language/resolve.ts`
- Test: `lib/language/__tests__/resolve.test.ts`

**Interfaces:**
- Consumes: `Lang` from `@/lib/types`
- Produces: `LANGUAGE_COOKIE: "haab-lang"`, `DEFAULT_LANGUAGE: Lang`, `parseLang(value: unknown): Lang | undefined`, `detectLangFromAcceptLanguage(header?: string | null): Lang | undefined`, `resolveLanguage(input: { explicit?: string | null; cookie?: string | null; acceptLanguage?: string | null }): Lang`

- [ ] **Step 1: Write the failing test**

Create `lib/language/__tests__/resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  DEFAULT_LANGUAGE,
  detectLangFromAcceptLanguage,
  LANGUAGE_COOKIE,
  parseLang,
  resolveLanguage,
} from "@/lib/language/resolve";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/language/__tests__/resolve.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/language/resolve"`

- [ ] **Step 3: Write the implementation**

Create `lib/language/resolve.ts`:

```ts
import type { Lang } from "@/lib/types";

/**
 * One name for the visitor's language, shared by the proxy, the server
 * components that render `<html lang>`, and the client switcher. Reusing the
 * old localStorage key would keep the value invisible to the server, which is
 * what caused the wrong-language flash.
 */
export const LANGUAGE_COOKIE = "haab-lang";

/** Deliberate product default. Spanish is opt-in, never a fallback. */
export const DEFAULT_LANGUAGE: Lang = "en";

export function parseLang(value: unknown): Lang | undefined {
  return value === "en" || value === "es" ? value : undefined;
}

/**
 * Accept-Language is the only detection signal we act on. Geo-IP was
 * considered and rejected: a stated browser preference beats an inferred
 * location, and it works off Vercel too.
 */
export function detectLangFromAcceptLanguage(
  header?: string | null,
): Lang | undefined {
  if (!header) return undefined;

  let best: { lang: Lang; q: number } | undefined;

  for (const part of header.split(",")) {
    const [tagRaw, ...params] = part.trim().split(";");
    const base = parseLang(tagRaw.trim().toLowerCase().split("-")[0]);
    if (!base) continue;

    const qParam = params.find((param) => param.trim().startsWith("q="));
    const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
    if (!Number.isFinite(q) || q <= 0) continue;

    // Strictly greater, so an equal q keeps the first tag listed.
    if (!best || q > best.q) best = { lang: base, q };
  }

  return best?.lang;
}

/**
 * Precedence: an explicit link (`?lang=`) beats a remembered choice, which
 * beats what the browser asks for, which beats the product default.
 */
export function resolveLanguage(input: {
  explicit?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Lang {
  return (
    parseLang(input.explicit) ??
    parseLang(input.cookie) ??
    detectLangFromAcceptLanguage(input.acceptLanguage) ??
    DEFAULT_LANGUAGE
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/language/__tests__/resolve.test.ts`
Expected: PASS, 14 tests

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add lib/language/resolve.ts lib/language/__tests__/resolve.test.ts
git commit -m "feat: add pure language resolution"
```

---

### Task 2: Resolve language server-side, kill the flash

**Files:**
- Create: `lib/language/server.ts`
- Modify: `proxy.ts`, `lib/supabase/proxy.ts:18-58`, `app/layout.tsx:22-35`
- Test: `lib/language/__tests__/resolve.test.ts` (extend)

**Interfaces:**
- Consumes: `LANGUAGE_COOKIE`, `resolveLanguage`, `parseLang` from Task 1
- Produces: `applyLanguageCookie(request: NextRequest, response: NextResponse): Lang` in `lib/language/proxy-language.ts`; `getServerLanguage(explicit?: string): Promise<Lang>` in `lib/language/server.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/language/__tests__/resolve.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/language/__tests__/resolve.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/language/proxy-language"`

- [ ] **Step 3: Write the implementation**

Create `lib/language/proxy-language.ts`:

```ts
import type { NextRequest, NextResponse } from "next/server";

import type { Lang } from "@/lib/types";
import { LANGUAGE_COOKIE, parseLang, resolveLanguage } from "./resolve";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Resolve the visitor's language once per request and persist it, so every
 * server render downstream knows it before the first byte. Writing only on a
 * change keeps `Set-Cookie` off the vast majority of responses.
 */
export function applyLanguageCookie(
  request: NextRequest,
  response: NextResponse,
): Lang {
  const stored = parseLang(request.cookies.get(LANGUAGE_COOKIE)?.value);
  const lang = resolveLanguage({
    explicit: request.nextUrl.searchParams.get("lang"),
    cookie: stored,
    acceptLanguage: request.headers.get("accept-language"),
  });

  if (stored !== lang) {
    response.cookies.set(LANGUAGE_COOKIE, lang, {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
    });
  }

  return lang;
}
```

Create `lib/language/server.ts`:

```ts
import "server-only";

import { cookies, headers } from "next/headers";

import type { Lang } from "@/lib/types";
import { LANGUAGE_COOKIE, resolveLanguage } from "./resolve";

/**
 * The language for a server render. `explicit` is the page's own `?lang`
 * search param when it has one; the cookie is what the proxy already resolved.
 */
export async function getServerLanguage(explicit?: string): Promise<Lang> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);

  return resolveLanguage({
    explicit,
    cookie: cookieStore.get(LANGUAGE_COOKIE)?.value,
    acceptLanguage: headerList.get("accept-language"),
  });
}
```

Modify `lib/supabase/proxy.ts` — apply the cookie to every response the session helper returns. Change the final `return supabaseResponse;` (line 57) and the two early returns so all three carry the language cookie:

```ts
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims && isProtectedRoute(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(loginUrl);
    applyLanguageCookie(request, redirect);
    return redirect;
  }

  if (claims && request.nextUrl.pathname === "/login") {
    const nextPath = request.nextUrl.searchParams.get("next") || "/";
    const redirect = NextResponse.redirect(new URL(nextPath, request.url));
    applyLanguageCookie(request, redirect);
    return redirect;
  }

  applyLanguageCookie(request, supabaseResponse);
  return supabaseResponse;
```

Add the import at the top of `lib/supabase/proxy.ts`:

```ts
import { applyLanguageCookie } from "@/lib/language/proxy-language";
```

Modify `app/layout.tsx` — the root layout becomes async and reads the resolved language:

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { getServerLanguage } from "@/lib/language/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Haab Calendar",
  description:
    "Reusable appointment and booking management module for timed appointments and full-day reservations.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-resolved so assistive tech and search engines never read a page
  // that claims a language it is not written in.
  const lang = await getServerLanguage();

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/language/__tests__/resolve.test.ts`
Expected: PASS, 18 tests

- [ ] **Step 5: Verify the app still boots**

Run: `npm run build`
Expected: build succeeds. If `app/layout.tsx` being async forces the whole tree dynamic and the build complains, consult `node_modules/next/dist/docs/` on dynamic APIs in the root layout before changing approach — do not silently revert to a static `lang`.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add lib/language/proxy-language.ts lib/language/server.ts lib/supabase/proxy.ts app/layout.tsx lib/language/__tests__/resolve.test.ts
git commit -m "feat: resolve visitor language server-side"
```

---

### Task 3: Flip every default to English

**Files:**
- Modify: `components/landing/translations.ts:1005-1007`, `components/landing/language-provider.tsx:31-100`
- Test: `lib/__tests__/language-flow.test.ts` (extend)

**Interfaces:**
- Consumes: `DEFAULT_LANGUAGE`, `LANGUAGE_COOKIE`, `parseLang` from Task 1
- Produces: `normalizeLandingLang` defaulting to `"en"`; `LanguageProvider` with a required `initialLang`

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/language-flow.test.ts`:

```ts
import { normalizeLandingLang } from "@/components/landing/translations";
import { DEFAULT_LANGUAGE } from "@/lib/language/resolve";

describe("language defaults", () => {
  it("defaults the landing and auth surfaces to English", () => {
    expect(normalizeLandingLang(undefined)).toBe("en");
    expect(normalizeLandingLang(null)).toBe("en");
    expect(normalizeLandingLang("")).toBe("en");
    expect(normalizeLandingLang("fr")).toBe("en");
    expect(normalizeLandingLang("es")).toBe("es");
    expect(normalizeLandingLang("en")).toBe("en");
  });

  it("agrees with the shared default", () => {
    expect(normalizeLandingLang(undefined)).toBe(DEFAULT_LANGUAGE);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/language-flow.test.ts`
Expected: FAIL — `expected 'es' to be 'en'`

- [ ] **Step 3: Fix the landing default**

Replace `components/landing/translations.ts:1005-1007` with:

```ts
export function normalizeLandingLang(value: unknown): Lang {
  return value === "es" ? "es" : "en";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/language-flow.test.ts`
Expected: PASS

- [ ] **Step 5: Remove the client-side language guess from the provider**

`initialLang` becomes required — the server always knows the language now, so the mount-time localStorage read (the flash) goes away entirely. Replace `components/landing/language-provider.tsx:31-100` with:

```tsx
export function LanguageProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // The server already resolved the language into the cookie, so there is
  // nothing to restore after mount — only `<html lang>` to keep honest when
  // the visitor switches without a navigation.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    persistLanguage(next);
    updateLanguageInCurrentUrl(next);
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "es" ? "en" : "es";
      persistLanguage(next);
      updateLanguageInCurrentUrl(next);
      return next;
    });
  }, []);

  const value: LanguageContextValue = {
    lang,
    setLang,
    toggle,
    t: translations[lang],
  };

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}
```

Replace the storage constant and helper at `components/landing/language-provider.tsx:14-20` with:

```tsx
import { LANGUAGE_COOKIE } from "@/lib/language/resolve";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Same cookie the proxy reads, so the next server render agrees on sight. */
function persistLanguage(lang: Lang) {
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

function updateLanguageInCurrentUrl(lang: Lang) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  window.history.replaceState(window.history.state, "", url);
}
```

Delete the `LANDING_LANGUAGE_STORAGE_KEY` export. Every importer is updated in Tasks 4 and 8; `npx tsc --noEmit` will list them.

- [ ] **Step 6: Feed the provider a server-resolved language**

In `app/page.tsx`, resolve the language before rendering and pass it down. Add the import and replace the `initialLanguage` prop at `app/page.tsx:98`:

```tsx
import { getServerLanguage } from "@/lib/language/server";
```

```tsx
  const resolvedLanguage = await getServerLanguage(lang);
```

```tsx
      initialLanguage={resolvedLanguage}
```

And in `components/home-experience.tsx:80-90`, make `initialLanguage` required and drop the `??`:

```tsx
export function HomeExperience(props: HomeExperienceProps) {
  return (
    <LanguageProvider initialLang={props.initialLanguage}>
      <HomeExperienceInner {...props} />
    </LanguageProvider>
  );
}
```

Change the prop type in `HomeExperienceProps` from `initialLanguage?: LandingLang` to `initialLanguage: LandingLang`. The `configuredLanguage` local is deleted here — Task 8 reintroduces the dashboard's own language deliberately.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS. Fix any test that asserted the old Spanish default — the assertion is the bug, not the code.

- [ ] **Step 8: Typecheck and commit**

```bash
npx tsc --noEmit
git add components/landing/translations.ts components/landing/language-provider.tsx app/page.tsx components/home-experience.tsx lib/__tests__/language-flow.test.ts
git commit -m "fix: default every surface to English"
```

---

### Task 4: Delete the English-branch anti-pattern

This is the root cause of mixed-language screens. English strings composed inline in JSX can never appear in the dictionary, so the key-parity test at `components/booking/i18n/__tests__/translations.test.ts:14` is blind to English gaps. Every such string moves into `bookingTranslations.en`, and a guard test stops the pattern coming back.

**Files:**
- Modify: `components/ui/BookingHoldCountdownBar.tsx:54-93,119`, `components/haab-booking-module.tsx:3791`, `lib/auth-i18n.ts:26-54`, `components/booking/i18n/translations.ts`
- Test: `components/booking/i18n/__tests__/translations.test.ts` (extend)

**Interfaces:**
- Consumes: `bookingTranslations`, `BookingDict` from `components/booking/i18n/translations`
- Produces: new `BookingDict` keys `public.holdCancelledFor`, `public.holdSecuredFor`, `public.holdLabelFor`, `public.holdCountdownLabel`, `public.holdConfirmedFor`, `admin.publicBookingLinkFor` — all `{booking}` / `{Booking}` templated

- [ ] **Step 1: Write the failing test**

Append to `components/booking/i18n/__tests__/translations.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || entry.name === "node_modules"
        ? []
        : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("no inline English branches", () => {
  it("has no component that composes English inline and Spanish from the dictionary", () => {
    const files = ["components", "app", "lib"].flatMap(sourceFiles);

    const offenders = files.filter((file) =>
      /lang === "en"\s*\?/.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });

  it("carries the templated hold copy in both languages", () => {
    for (const lang of ["en", "es"] as const) {
      const { public: publicCopy, admin } = bookingTranslations[lang];
      expect(publicCopy.holdCancelledFor).toContain("{Booking}");
      expect(publicCopy.holdSecuredFor).toContain("{Booking}");
      expect(publicCopy.holdLabelFor).toContain("{Booking}");
      expect(publicCopy.holdCountdownLabel).toContain("{Booking}");
      expect(publicCopy.holdConfirmedFor).toContain("{booking}");
      expect(admin.publicBookingLinkFor).toContain("{booking}");
    }
  });
});
```

The walk runs from the repo root, which is Vitest's working directory here.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/booking/i18n/__tests__/translations.test.ts`
Expected: FAIL — offenders lists `components/ui/BookingHoldCountdownBar.tsx`, `components/haab-booking-module.tsx`, `lib/auth-i18n.ts`

- [ ] **Step 3: Add the missing keys to both dictionaries**

In `components/booking/i18n/translations.ts`, add to the `BookingDict` type inside `public`:

```ts
    holdCancelledFor: string;
    holdSecuredFor: string;
    holdLabelFor: string;
    holdCountdownLabel: string;
    holdConfirmedFor: string;
```

and inside `admin`:

```ts
    publicBookingLinkFor: string;
```

English values (`bookingTranslations.en`):

```ts
      holdCancelledFor: "{Booking} cancelled",
      holdSecuredFor: "{Booking} secured",
      holdLabelFor: "{Booking} hold",
      holdCountdownLabel: "{Booking} hold countdown",
      holdConfirmedFor: "Your {booking} is confirmed and the temporary hold is complete.",
```
```ts
      publicBookingLinkFor: "Public {booking} link:",
```

Spanish values (`bookingTranslations.es`):

```ts
      holdCancelledFor: "Se canceló su {booking}",
      holdSecuredFor: "Se confirmó su {booking}",
      holdLabelFor: "Apartado de {booking}",
      holdCountdownLabel: "Cuenta regresiva del apartado de {booking}",
      holdConfirmedFor: "Se confirmó su {booking} y el apartado temporal terminó.",
```

**Spanish gender agreement — do not use participle adjectives here.** The vertical
nouns differ in gender: `reserva` (F), `cita` (F), `registro` (M), `sesión` (F).
A hardcoded `"{Booking} cancelada"` renders "registro cancelada" for the events
vertical. Past-tense verb forms ("Se canceló…") carry no agreement and read
naturally with all five nouns. Any future templated Spanish string taking a
vertical noun must clear the same bar.
```ts
      publicBookingLinkFor: "Enlace público de {booking}:",
```

Add a template helper at the bottom of `components/booking/i18n/translations.ts`, above `bookingT`:

```ts
/**
 * Vertical nouns ("appointment", "reservation", "cita") are the only runtime
 * values these strings take, and each language orders them differently — so
 * they are placeholders in the dictionary rather than string concatenation at
 * the call site, which is what let English drift out of the dictionary.
 */
export function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
```

- [ ] **Step 4: Rewrite `BookingHoldCountdownBar`**

In `components/ui/BookingHoldCountdownBar.tsx`, add to the imports:

```ts
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
```

Replace lines 54-89 (`statusLabel` and `helperText`) with:

```ts
  const nouns = { booking: copy.booking, Booking: copy.Booking };
  const statusLabel = isCancelled
    ? fillTemplate(t.public.holdCancelledFor, nouns)
    : isConfirmed
      ? fillTemplate(t.public.holdSecuredFor, nouns)
      : isExpired
        ? t.public.holdExpired
        : isUrgent || isWarning
          ? t.public.holdEndingSoon
          : "";
  const helperText = isCancelled
    ? t.public.holdInactiveBody
    : isConfirmed
      ? fillTemplate(t.public.holdConfirmedFor, nouns)
      : isExpired
        ? t.public.expiredBody
        : t.public.holdFinishBody;
```

Replace line 93:

```tsx
      aria-label={fillTemplate(t.public.holdCountdownLabel, nouns)}
```

Replace line 119:

```tsx
            {fillTemplate(t.public.holdLabelFor, nouns)}
```

- [ ] **Step 5: Rewrite the module's public-link line**

Replace `components/haab-booking-module.tsx:3791` with:

```tsx
            {fillTemplate(t.admin.publicBookingLinkFor, { booking: copy.booking })}{" "}
```

Add `fillTemplate` to the existing import of `@/components/booking/i18n/translations` in that file.

- [ ] **Step 6: Fix the auth error branch**

`lib/auth-i18n.ts:33` returns Supabase's raw English `error.message` for English users while Spanish users get mapped copy — so English users see backend strings and English gets no dictionary coverage. Replace lines 26-54 with:

```ts
export function getAuthErrorMessage(
  error: AuthErrorLike,
  lang: Lang,
  fallback: "signInFailed" | "createFailed",
) {
  const t = translations[lang].auth;

  // Both languages map the same codes. Supabase's own message is English
  // regardless of the visitor, so it is never surfaced.
  switch (error.code) {
    case "invalid_credentials":
      return t.invalidCredentials;
    case "email_not_confirmed":
      return t.emailNotConfirmed;
    case "email_exists":
    case "user_already_exists":
    case "user_already_registered":
      return t.userExists;
    case "signup_disabled":
      return t.signupDisabled;
    case "email_address_invalid":
    case "validation_failed":
      return t.emailInvalid;
    default:
      return t[fallback];
  }
}
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: PASS. The `offenders` assertion should now be `[]`.

- [ ] **Step 8: Typecheck and commit**

```bash
npx tsc --noEmit
git add components/ui/BookingHoldCountdownBar.tsx components/haab-booking-module.tsx lib/auth-i18n.ts components/booking/i18n/translations.ts components/booking/i18n/__tests__/translations.test.ts
git commit -m "fix: move English copy into the dictionary"
```

---

### Task 5: Translate the dashboard headline

The reported "English headline over a Spanish interface" is a hardcoded module-level constant.

**Files:**
- Modify: `components/provider/AdminHero.tsx`, `components/provider/__tests__/admin-hero.test.tsx`, `components/booking/i18n/translations.ts`, `components/home-experience.tsx:232`

**Interfaces:**
- Consumes: `bookingTranslations` from Task 4
- Produces: `AdminHero({ lang }: { lang: Lang })`; `BookingDict["admin"]["heroTitle"]`

- [ ] **Step 1: Write the failing test**

Replace `components/provider/__tests__/admin-hero.test.tsx` with:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminHero } from "@/components/provider/AdminHero";

describe("AdminHero", () => {
  it("renders the English headline", () => {
    const html = renderToStaticMarkup(<AdminHero lang="en" />);
    expect(html).toContain("Haab Calendar — booking operations in one workspace");
  });

  it("renders the Spanish headline with no English left in it", () => {
    const html = renderToStaticMarkup(<AdminHero lang="es" />);
    expect(html).toContain("Haab Calendar — sus reservas en un solo lugar");
    expect(html).not.toContain("booking operations");
    expect(html).not.toContain("workspace");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/provider/__tests__/admin-hero.test.tsx`
Expected: FAIL — `AdminHero` takes no props; Spanish string absent

- [ ] **Step 3: Add the keys**

In `components/booking/i18n/translations.ts`, add `heroTitle: string;` to the `admin` block of `BookingDict`, then:

English: `heroTitle: "Haab Calendar — booking operations in one workspace",`
Spanish: `heroTitle: "Haab Calendar — sus reservas en un solo lugar",`

- [ ] **Step 4: Rewrite the component**

Replace `components/provider/AdminHero.tsx` with:

```tsx
import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";

export function AdminHero({ lang }: { lang: Lang }) {
  return (
    <section className="py-2 sm:py-3">
      <h1 className="mx-auto max-w-4xl text-balance text-center text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">
        {bookingTranslations[lang].admin.heroTitle}
      </h1>
    </section>
  );
}
```

- [ ] **Step 5: Pass the language at the call site**

`components/home-experience.tsx:232` — `<AdminHero />` becomes `<AdminHero lang={lang} />`. `lang` is already in scope from `useLanguage()` at line 105.

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Typecheck and commit**

```bash
npx tsc --noEmit
git add components/provider/AdminHero.tsx components/provider/__tests__/admin-hero.test.tsx components/booking/i18n/translations.ts components/home-experience.tsx
git commit -m "fix: translate the dashboard headline"
```

---

### Task 6: One language switcher

Four implementations exist today: a globe + `<select>` (`components/landing/language-provider.tsx:102`), pills with two visual variants (`components/haab-booking-module.tsx:909`), separate pills (`app/not-found.tsx:44`), and anchor pills (`app/login/page.tsx:65`). One component replaces all four. The login page is a server component with no client state, so the component supports an anchor mode with identical visuals.

**Files:**
- Create: `components/ui/LanguageSwitcher.tsx`
- Create: `components/ui/__tests__/language-switcher.test.tsx`
- Modify: `components/landing/language-provider.tsx:102-128` (delete `LanguageToggle`), `components/landing/landing-ui.tsx:9,543,571`, `components/haab-booking-module.tsx:909-961`, `app/not-found.tsx`, `app/login/page.tsx:65-80`

**Interfaces:**
- Consumes: `bookingTranslations` (`language.english`, `language.spanish`, `language.chooseLanguage`, `language.switchToEnglish`, `language.switchToSpanish` — all already exist)
- Produces: `LanguageSwitcher(props: { lang: Lang; onChange?: (lang: Lang) => void; hrefFor?: (lang: Lang) => string; tone?: "floating" | "inset"; className?: string })`

- [ ] **Step 1: Write the failing test**

Create `components/ui/__tests__/language-switcher.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("labels both options in the active language", () => {
    const html = renderToStaticMarkup(
      <LanguageSwitcher lang="es" onChange={() => undefined} />,
    );

    expect(html).toContain("English");
    expect(html).toContain("Español");
    expect(html).toContain("Seleccionar idioma");
  });

  it("marks the active language for assistive tech", () => {
    const html = renderToStaticMarkup(
      <LanguageSwitcher lang="en" onChange={() => undefined} />,
    );

    expect(html).toMatch(/aria-pressed="true"[^>]*>English/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Español/);
  });

  it("renders anchors when given hrefs instead of a handler", () => {
    const html = renderToStaticMarkup(
      <LanguageSwitcher lang="en" hrefFor={(lang) => `/login?lang=${lang}`} />,
    );

    expect(html).toContain('href="/login?lang=es"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("<button");
  });

  it("keeps identical option labels across both modes", () => {
    const buttons = renderToStaticMarkup(
      <LanguageSwitcher lang="en" onChange={() => undefined} />,
    );
    const links = renderToStaticMarkup(
      <LanguageSwitcher lang="en" hrefFor={(lang) => `/?lang=${lang}`} />,
    );

    for (const label of ["English", "Español"]) {
      expect(buttons).toContain(label);
      expect(links).toContain(label);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/__tests__/language-switcher.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/ui/LanguageSwitcher"`

- [ ] **Step 3: Write the component**

Create `components/ui/LanguageSwitcher.tsx`:

```tsx
import Link from "next/link";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

const LANGUAGES = ["en", "es"] as const;

/**
 * The one language control. Two tones because the public page puts it both on
 * the page background and inside an already-layered header band; the geometry,
 * labels, and active treatment stay identical so it reads as the same control
 * everywhere. `hrefFor` renders anchors for server-only surfaces (the login
 * page) with no visual difference from the stateful version.
 */
export function LanguageSwitcher({
  lang,
  onChange,
  hrefFor,
  tone = "floating",
  className = "",
}: {
  lang: Lang;
  onChange?: (lang: Lang) => void;
  hrefFor?: (lang: Lang) => string;
  tone?: "floating" | "inset";
  className?: string;
}) {
  const t = bookingTranslations[lang];
  const isInset = tone === "inset";

  return (
    <div
      role="group"
      aria-label={t.language.chooseLanguage}
      className={cn(
        "inline-flex rounded-full p-1",
        isInset
          ? "border border-[rgba(15,23,42,0.07)] bg-[rgba(15,23,42,0.05)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.07)]"
          : "border border-white/80 bg-white/70 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        className,
      )}
    >
      {LANGUAGES.map((language) => {
        const active = lang === language;
        const label =
          language === "en" ? t.language.english : t.language.spanish;
        const actionLabel =
          language === "en"
            ? t.language.switchToEnglish
            : t.language.switchToSpanish;
        const classes = cn(
          "min-h-9 rounded-full px-2.5 text-xs font-semibold transition sm:min-h-10 sm:px-4 sm:text-sm",
          active
            ? isInset
              ? "bg-white text-[var(--ink)] shadow-[0_1px_2px_rgba(15,23,42,0.14),0_4px_10px_rgba(15,23,42,0.08)]"
              : "bg-[var(--primary)] text-white shadow-[0_8px_18px_rgba(26,115,232,0.24)]"
            : "text-[var(--muted)] hover:bg-white/70 hover:text-[var(--ink)]",
        );

        if (hrefFor) {
          return (
            <Link
              key={language}
              href={hrefFor(language)}
              aria-label={actionLabel}
              aria-current={active ? "page" : undefined}
              className={cn(classes, "inline-flex items-center justify-center")}
            >
              {label}
            </Link>
          );
        }

        return (
          <button
            key={language}
            type="button"
            aria-label={actionLabel}
            aria-pressed={active}
            onClick={() => onChange?.(language)}
            className={classes}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/__tests__/language-switcher.test.tsx`
Expected: PASS, 4 tests

- [ ] **Step 5: Replace the landing globe toggle**

Delete `LanguageToggle` from `components/landing/language-provider.tsx:102-128` and its now-unused `CaretDown`/`GlobeSimple` import at line 11.

In `components/landing/landing-ui.tsx`, change the import at line 9 to:

```tsx
import { useLanguage } from "./language-provider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
```

At line 543, replace `<LanguageToggle />` with `<LanguageSwitcher lang={lang} onChange={setLang} />`. At line 571, replace `<LanguageToggle className="w-full justify-start px-4 py-2.5" />` with `<LanguageSwitcher lang={lang} onChange={setLang} className="w-full justify-start" />`. Both sites need `lang` and `setLang` from `useLanguage()` — add them to the existing destructure if absent.

- [ ] **Step 6: Replace the public booking pills**

In `components/haab-booking-module.tsx`, replace the whole `renderPublicLanguageChooser` body (lines 909-961) with:

```tsx
  function renderPublicLanguageChooser(
    className = "",
    variant: "floating" | "inset" = "floating",
  ) {
    if (surface !== "public") return null;

    return (
      <LanguageSwitcher
        lang={lang}
        onChange={choosePublicLanguage}
        tone={variant}
        className={className}
      />
    );
  }
```

Add `import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";` to the file's imports. Keep the surrounding doc comment at lines 904-908 — it explains why two tones exist.

- [ ] **Step 7: Replace the not-found pills**

In `app/not-found.tsx`, delete the inline `<div role="group">` block (lines 44-64) and render `<LanguageSwitcher lang={lang} onChange={chooseLanguage} className="mx-auto mb-10" />` in its place. Add the import.

- [ ] **Step 8: Replace the login links**

In `app/login/page.tsx`, delete the inline anchor block (lines 65-80) and render:

```tsx
              <LanguageSwitcher
                lang={lang}
                hrefFor={(option) => languageHref(option, nextPath, initialIntent)}
              />
```

Add the import. `languageHref` already exists at line 35.

- [ ] **Step 9: Verify no switcher implementations remain**

Run: `grep -rn "LanguageToggle\|renderPublicLanguageChooser\|role=\"group\"" --include="*.tsx" app components | grep -v LanguageSwitcher`
Expected: only the `renderPublicLanguageChooser` wrapper in `haab-booking-module.tsx`, which now delegates.

- [ ] **Step 10: Run tests, typecheck, commit**

```bash
npm test && npx tsc --noEmit
git add components/ui/LanguageSwitcher.tsx components/ui/__tests__/language-switcher.test.tsx components/landing/language-provider.tsx components/landing/landing-ui.tsx components/haab-booking-module.tsx app/not-found.tsx app/login/page.tsx
git commit -m "refactor: unify the language switcher"
```

---

### Task 7: Separate the owner's dashboard language

Today `components/haab-booking-module.tsx:440` reads `const lang = surface === "public" ? publicLanguage : configuredLanguage`, where `configuredLanguage = provider.language`. The owner's *client-facing* setting therefore also controls their own dashboard. Splitting them needs a nullable column: `null` means "follow the browser like every other surface", a value means "pinned by the owner".

**Files:**
- Create: `supabase/migrations/20260812200000_add_provider_dashboard_language.sql`
- Modify: `lib/types.ts:37-38`, `lib/store.ts:294`, `lib/supabase/bookings.ts:38,54,241`, `lib/supabase/provider-store.ts:158`
- Test: `lib/__tests__/language-flow.test.ts` (extend)

**Interfaces:**
- Consumes: `ProviderInfo`, `Lang`
- Produces: `ProviderInfo["dashboardLanguage"]?: Lang` — optional, `undefined` means unpinned

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/language-flow.test.ts`:

```ts
import { normalizeProvider } from "@/lib/store";

describe("dashboard language", () => {
  it("is unset by default so the browser decides", () => {
    expect(normalizeProvider({}).dashboardLanguage).toBeUndefined();
  });

  it("round-trips a pinned value", () => {
    expect(normalizeProvider({ dashboardLanguage: "es" }).dashboardLanguage).toBe("es");
    expect(normalizeProvider({ dashboardLanguage: "en" }).dashboardLanguage).toBe("en");
  });

  it("drops an unsupported value rather than guessing", () => {
    expect(
      normalizeProvider({ dashboardLanguage: "fr" as never }).dashboardLanguage,
    ).toBeUndefined();
  });

  it("stays independent of the public page language", () => {
    const provider = normalizeProvider({ language: "es", dashboardLanguage: "en" });
    expect(provider.language).toBe("es");
    expect(provider.dashboardLanguage).toBe("en");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/language-flow.test.ts`
Expected: FAIL — `dashboardLanguage` is not a property of `ProviderInfo`

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260812200000_add_provider_dashboard_language.sql`:

```sql
-- The owner's own dashboard language, separate from `language`, which stays
-- the language their clients see on the public booking page. NULL means the
-- dashboard follows the same Accept-Language resolution as every other
-- signed-in surface, so existing owners see no change until they pin one.
alter table public.providers
  add column if not exists dashboard_language text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'providers_dashboard_language_check'
  ) then
    alter table public.providers
      add constraint providers_dashboard_language_check
      check (dashboard_language is null or dashboard_language in ('en', 'es'));
  end if;
end $$;
```

No `grant` and no view change: this column is owner-only and must not reach `public_providers`, which anonymous booking visitors read.

- [ ] **Step 4: Thread the field through the types and mappers**

`lib/types.ts` — add below the existing `language` field (line 38):

```ts
  /**
   * The owner's own dashboard language. Undefined means "follow the browser",
   * which is what every pre-existing provider does. Deliberately separate from
   * `language`: an owner may write Spanish page content and still want an
   * English workspace.
   */
  dashboardLanguage?: Lang;
```

`lib/store.ts:294` — add after the `language` line:

```ts
    dashboardLanguage:
      source?.dashboardLanguage === "en" || source?.dashboardLanguage === "es"
        ? source.dashboardLanguage
        : undefined,
```

`lib/supabase/bookings.ts:38` — append `, dashboard_language` to the `PROVIDER_SELECT` string.

`lib/supabase/bookings.ts:54` — add to the row type:

```ts
  dashboard_language: "en" | "es" | null;
```

`lib/supabase/bookings.ts:241` — add after the `language` mapping:

```ts
    dashboardLanguage:
      row.dashboard_language === "es" || row.dashboard_language === "en"
        ? row.dashboard_language
        : undefined,
```

`lib/supabase/provider-store.ts:158` — add after the `language` line:

```ts
    dashboard_language: provider.dashboardLanguage ?? null,
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Apply the migration locally and verify**

Run: `npx supabase db push` (or `npx supabase migration up` against the local stack)
Expected: applies clean. Verify with `npx supabase db diff` — expected empty.

If a hosted project is the target, apply the migration there before Task 8 ships, or the dashboard save will fail on an unknown column.

- [ ] **Step 7: Typecheck and commit**

```bash
npx tsc --noEmit
git add supabase/migrations/20260812200000_add_provider_dashboard_language.sql lib/types.ts lib/store.ts lib/supabase/bookings.ts lib/supabase/provider-store.ts lib/__tests__/language-flow.test.ts
git commit -m "feat: add a provider dashboard language column"
```

---

### Task 8: Dashboard switcher and a clear client-language setting

The owner gets the shared switcher for their own workspace, and the existing public-language `<select>` gets relabelled so it is unmistakably "what my clients see" rather than a second switcher.

**Files:**
- Modify: `components/haab-booking-module.tsx:436-440,634-648,3773-3793`, `components/home-experience.tsx`, `components/booking/i18n/translations.ts`
- Test: `components/booking/i18n/__tests__/components.test.tsx` (extend)

**Interfaces:**
- Consumes: `LanguageSwitcher` (Task 6), `ProviderInfo["dashboardLanguage"]` (Task 7), `getServerLanguage` (Task 2)
- Produces: `BookingDict["admin"]["clientLanguageLabel"]`, `["clientLanguageHint"]`, `["clientsSeeNotice"]`, `["dashboardLanguageLabel"]`

- [ ] **Step 1: Write the failing test**

Append to `components/booking/i18n/__tests__/components.test.tsx`:

```tsx
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";

describe("owner language settings copy", () => {
  it("separates the client-facing setting from the owner's own workspace", () => {
    for (const lang of ["en", "es"] as const) {
      const { admin } = bookingTranslations[lang];
      expect(admin.clientLanguageLabel.length).toBeGreaterThan(0);
      expect(admin.dashboardLanguageLabel.length).toBeGreaterThan(0);
      expect(admin.clientLanguageLabel).not.toBe(admin.dashboardLanguageLabel);
      expect(admin.clientsSeeNotice).toContain("{language}");
    }
  });

  it("names the client language in the reader's own language", () => {
    expect(
      fillTemplate(bookingTranslations.en.admin.clientsSeeNotice, {
        language: bookingTranslations.en.language.spanish,
      }),
    ).toBe("Your clients see this page in Español.");

    expect(
      fillTemplate(bookingTranslations.es.admin.clientsSeeNotice, {
        language: bookingTranslations.es.language.english,
      }),
    ).toBe("Sus clientes ven esta página en English.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/booking/i18n/__tests__/components.test.tsx`
Expected: FAIL — keys undefined

- [ ] **Step 3: Add the keys**

Add to `BookingDict["admin"]`:

```ts
    clientLanguageLabel: string;
    clientLanguageHint: string;
    clientsSeeNotice: string;
    dashboardLanguageLabel: string;
```

English:

```ts
      clientLanguageLabel: "Language your clients see",
      clientLanguageHint:
        "Applies to your public booking page and the confirmation screen. It does not translate the text you write yourself.",
      clientsSeeNotice: "Your clients see this page in {language}.",
      dashboardLanguageLabel: "Your workspace language",
```

Spanish:

```ts
      clientLanguageLabel: "Idioma que ven sus clientes",
      clientLanguageHint:
        "Se aplica a su página pública de reservas y a la pantalla de confirmación. No traduce el texto que usted escribe.",
      clientsSeeNotice: "Sus clientes ven esta página en {language}.",
      dashboardLanguageLabel: "Idioma de su espacio de trabajo",
```

- [ ] **Step 4: Split the module's language source**

Replace `components/haab-booking-module.tsx:436-440` with:

```tsx
  const configuredLanguage = storedProvider.language ?? "en";
  // The owner's workspace language is their own; it falls back to whatever the
  // rest of the app resolved for them, never to their clients' setting.
  const dashboardLanguage = storedProvider.dashboardLanguage ?? viewerLanguage;
  const [publicLanguage, setPublicLanguage] = useState<Lang>(
    initialPublicLanguage ?? configuredLanguage,
  );
  const lang = surface === "public" ? publicLanguage : dashboardLanguage;
```

Add a `viewerLanguage: Lang` prop to the module's props type (near `initialPublicLanguage` at line 191) with a doc comment:

```tsx
  /** Language resolved for the signed-in viewer; the dashboard default. */
  viewerLanguage?: Lang;
```

and default it in the destructure at line 311 area: `viewerLanguage = "en",`.

- [ ] **Step 5: Stop the public switch leaking into the marketing site**

Replace `components/haab-booking-module.tsx:642-647` (inside `choosePublicLanguage`) with:

```tsx
    if (typeof window === "undefined") return;

    // Scoped to this page's URL only. Writing the global language cookie here
    // would let a client's choice on one business's page follow them to the
    // marketing site and to other businesses.
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLanguage);
    window.history.replaceState(window.history.state, "", url);
```

Remove the now-unused `LANDING_LANGUAGE_STORAGE_KEY` import from this file.

- [ ] **Step 6: Relabel the client-language setting and add the dashboard switcher**

Replace `components/haab-booking-module.tsx:3773-3793` with:

```tsx
          <div className="mt-6 grid gap-6">
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              {t.admin.clientLanguageLabel}
              <select
                value={provider.language ?? "en"}
                onChange={(event) =>
                  updateProvider("language", event.target.value as ProviderInfo["language"])
                }
                disabled={isSavingAdmin}
                className={cn("min-h-12", adminFieldClass)}
              >
                <option value="en">{t.language.english}</option>
                <option value="es">{t.language.spanish}</option>
              </select>
              <span className="text-xs leading-5 text-[var(--muted)]">
                {t.admin.clientLanguageHint}
              </span>
              {/* Said back plainly, because the owner cannot see their own
                  public page while editing it. */}
              <span className="text-xs font-semibold leading-5 text-[var(--ink)]">
                {fillTemplate(t.admin.clientsSeeNotice, {
                  language:
                    (provider.language ?? "en") === "en"
                      ? t.language.english
                      : t.language.spanish,
                })}
              </span>
            </label>

            <div className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              {t.admin.dashboardLanguageLabel}
              <LanguageSwitcher
                lang={lang}
                onChange={(next) => updateProvider("dashboardLanguage", next)}
                tone="inset"
                className="self-start"
              />
            </div>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {fillTemplate(t.admin.publicBookingLinkFor, { booking: copy.booking })}{" "}
            <span className="break-all font-medium text-[var(--ink)]">{publicUrl}</span>
          </p>
```

`updateProvider` already persists through `/api/provider/store`, so pinning the dashboard language saves with the rest of the provider record.

- [ ] **Step 7: Feed the viewer language in from the server**

In `app/page.tsx`, pass the already-resolved language down: add `viewerLanguage={resolvedLanguage}` to `<HomeExperience …>`, add `viewerLanguage: Lang` to `HomeExperienceProps` in `components/home-experience.tsx`, and forward it to the module where `HaabBookingModule` is rendered (around `components/home-experience.tsx:279`).

Also make the dashboard's `LanguageProvider` follow the owner's pin, so the landing chrome around the dashboard matches the workspace:

```tsx
export function HomeExperience(props: HomeExperienceProps) {
  const dashboardLanguage = props.configured
    ? props.dashboardStore?.provider.dashboardLanguage
    : undefined;

  return (
    <LanguageProvider initialLang={dashboardLanguage ?? props.initialLanguage}>
      <HomeExperienceInner {...props} />
    </LanguageProvider>
  );
}
```

- [ ] **Step 8: Run tests, typecheck, commit**

```bash
npm test && npx tsc --noEmit
git add components/haab-booking-module.tsx components/home-experience.tsx app/page.tsx components/booking/i18n/translations.ts components/booking/i18n/__tests__/components.test.tsx
git commit -m "feat: give owners a separate workspace language"
```

---

### Task 9: Format-layer cleanup

**Files:**
- Modify: `lib/constants.ts:13-21,53-57`, `components/provider/ServiceEditor.tsx:300`
- Test: `lib/__tests__/format.test.ts` (create or extend if present)

**Interfaces:**
- Consumes: `getLongDateFormatter`, `getCompactDateFormatter`, `getMonthFormatter`, `getWeekdayShortFormatter`, `formatTimeLabel`
- Produces: no new exports; four dead exports and one dead constant removed

- [ ] **Step 1: Confirm the dead exports really are dead**

Run: `grep -rn "WEEKDAY_LABELS\|longDateFormatter\|compactDateFormatter\|monthFormatter\|weekdayShortFormatter" --include="*.ts" --include="*.tsx" app components lib | grep -v "lib/constants.ts"`
Expected: no output. If anything appears, convert that call site to the `get*Formatter(lang)` form first — the singletons are silently English and are exactly how English dates leak onto Spanish pages.

- [ ] **Step 2: Write the failing test**

Create `lib/__tests__/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { formatCapacityLabel, formatDateLabel, formatTimeLabel } from "@/lib/format";
import { getLongDateFormatter } from "@/lib/constants";
import type { Service } from "@/lib/types";

const service: Service = {
  id: "svc-1",
  name: "Taller",
  bookingType: "full-day",
  description: "",
  maxSpots: 400,
};

describe("locale-matched formatting", () => {
  it("writes long dates in the page's language", () => {
    expect(formatDateLabel("2026-03-09", "en")).toContain("March");
    expect(formatDateLabel("2026-03-09", "es")).toContain("marzo");
  });

  it("puts the day before the month in Spanish", () => {
    const parts = getLongDateFormatter("es").formatToParts(new Date(2026, 2, 9));
    const order = parts.filter((p) => p.type === "day" || p.type === "month");
    expect(order[0].type).toBe("day");
  });

  it("keeps 24-hour time in Spanish and 12-hour in English", () => {
    // Deliberate: Mexican schedules are written 24-hour, and Intl's es-MX
    // default would render "2:30 p.m." Pinned here so it is a decision, not
    // an accident.
    expect(formatTimeLabel("14:30", "es")).toBe("14:30");
    expect(formatTimeLabel("14:30", "en")).toBe("2:30 PM");
  });

  it("translates event capacity", () => {
    expect(formatCapacityLabel(service, "en")).toBe("Up to 400 spots");
    expect(formatCapacityLabel(service, "es")).toBe("Hasta 400 lugares");
  });
});
```

- [ ] **Step 3: Run the characterization test — it is expected to PASS immediately**

This is deliberately not a red-green cycle. It is a characterization test: it
pins behaviour this task is **not** changing, so a later refactor cannot
silently alter Spanish time format or capacity translation. A first run that
passes is the correct outcome here, not a TDD violation.

Run: `npx vitest run lib/__tests__/format.test.ts`
Expected: PASS. These pin existing correct behaviour — `formatCapacityLabel` already translates (`lib/format.ts:62-71`), so a report of English "Up to 400 spots" on a Spanish page means the wrong `lang` reached that surface, which Tasks 3 and 8 fix. If this test fails, stop and investigate before changing `lib/format.ts`.

- [ ] **Step 4: Delete the dead English-only exports**

Remove `WEEKDAY_LABELS` (`lib/constants.ts:13-21`) and the four backward-compatible singletons (`lib/constants.ts:53-57`, including the comment above them).

- [ ] **Step 5: Mark the native date input's limitation**

`components/provider/ServiceEditor.tsx:300` — add the `lang` attribute and a comment. The component already receives `lang`:

```tsx
                  type="date"
                  /* Native date inputs follow the OS/browser locale, not the
                     page. Chromium honours `lang`; Firefox and Safari ignore
                     it, so a Spanish page on a US-configured machine still
                     shows mm/dd/yyyy. Fixing that needs a custom picker. */
                  lang={lang}
```

- [ ] **Step 6: Run tests, typecheck, commit**

```bash
npm test && npx tsc --noEmit
git add lib/constants.ts lib/__tests__/format.test.ts components/provider/ServiceEditor.tsx
git commit -m "chore: drop English-only formatters"
```

---

### Task 10: Screen-level language purity guard

The definition of done is "pick any screen in either language and every piece of interface text is in that language". This task makes that assertion executable, so it cannot regress.

**Files:**
- Create: `components/__tests__/language-purity.test.tsx`

**Interfaces:**
- Consumes: every component touched above
- Produces: no exports — a guard test only

- [ ] **Step 1: Write the test**

Create `components/__tests__/language-purity.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminHero } from "@/components/provider/AdminHero";
import { AvailabilityEditor } from "@/components/provider/AvailabilityEditor";
import { BookingHoldCountdownBar } from "@/components/ui/BookingHoldCountdownBar";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { createEmptyStore } from "@/lib/store";
import { getVerticalCopy } from "@/lib/vertical-copy";

/**
 * Words that only ever appear in the app's own English interface text. Owner
 * content and proper nouns are deliberately excluded — an owner writing their
 * page in English on a Spanish interface is expected, not a defect.
 */
const ENGLISH_MARKERS = [
  "Booking hold",
  "Hold expired",
  "Hold ending soon",
  "booking operations",
  "workspace",
  "Monday",
  "Save changes",
  "Up to",
];

const SPANISH_MARKERS = [
  "Apartado de",
  "Vencida",
  "Guardar cambios",
  "Lunes",
  "Hasta",
  "sus reservas",
];

function renderScreens(lang: "en" | "es") {
  const copy = getVerticalCopy("healthcare", lang);

  return [
    renderToStaticMarkup(<AdminHero lang={lang} />),
    renderToStaticMarkup(
      <AvailabilityEditor
        availability={createEmptyStore().availability}
        onChange={() => undefined}
        lang={lang}
      />,
    ),
    renderToStaticMarkup(
      <BookingHoldCountdownBar
        isExpired={false}
        remainingMs={120000}
        remainingRatio={0.2}
        copy={copy}
        lang={lang}
      />,
    ),
    renderToStaticMarkup(<LanguageSwitcher lang={lang} onChange={() => undefined} />),
  ].join("\n");
}

describe("screen language purity", () => {
  it("leaves no English interface text on Spanish screens", () => {
    const html = renderScreens("es");
    const leaked = ENGLISH_MARKERS.filter((marker) => html.includes(marker));
    expect(leaked).toEqual([]);
  });

  it("leaves no Spanish interface text on English screens", () => {
    const html = renderScreens("en");
    // "English" and "Español" both appear in the switcher by design: each
    // option is named in its own language so a lost visitor can find theirs.
    const leaked = SPANISH_MARKERS.filter((marker) => html.includes(marker));
    expect(leaked).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run components/__tests__/language-purity.test.tsx`
Expected: PASS. Any failure names the exact leaked string — fix the component, not the marker list. Only remove a marker if it is genuinely owner content or a proper noun.

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/__tests__/language-purity.test.tsx
git commit -m "test: guard screen language purity"
```

---

### Task 11: Manual verification

Automated tests cannot see a flash or a wrong-format date. This is the walk-through that closes the definition of done.

**Files:**
- Create: `docs/manual-tests/language-consistency.md`

- [ ] **Step 1: Run the app**

Run: `npm run dev`

- [ ] **Step 2: Walk each screen and record the result**

Create `docs/manual-tests/language-consistency.md` with this checklist, filling in pass/fail per row:

```markdown
# Language consistency — manual verification

Run with browser language set to English, then repeat with it set to Spanish
(Chrome: Settings → Languages → move Español to the top).

| # | Screen | Check | EN browser | ES browser |
|---|--------|-------|-----------|-----------|
| 1 | `/` marketing, no `?lang` | English by default with an EN browser; Spanish only with an ES browser | | |
| 2 | `/` marketing | No wrong-language flash on hard reload (throttle to Slow 3G) | | |
| 3 | `/` marketing | `<html lang>` in DevTools matches the visible language | | |
| 4 | `/` switcher | Same pill control as everywhere else; active option obvious | | |
| 5 | `/login` | Entirely one language; switcher identical to the marketing one | | |
| 6 | `/login` | A failed sign-in shows dictionary copy, never a raw Supabase message | | |
| 7 | Dashboard | Headline matches the rest of the interface — no English title on a Spanish UI | | |
| 8 | Dashboard → Settings | Two distinct controls: "Language your clients see" and "Your workspace language" | | |
| 9 | Dashboard → Settings | Set client language to Spanish, workspace to English — both hold after reload | | |
| 10 | Dashboard | Dates, weekday names and times match the workspace language | | |
| 11 | Public booking page | Opens in the owner's client language regardless of browser language | | |
| 12 | Public booking page | No flash of the other language on hard reload | | |
| 13 | Public booking page | Client switches language → URL gains `?lang=`; reload keeps it | | |
| 14 | Public booking page | After switching there, reload `/` — the marketing site is unchanged | | |
| 15 | Booking flow | Hold countdown, status pills, and helper text all in one language | | |
| 16 | Confirmation screen | Same language as the booking flow that produced it | | |
| 17 | Shared link `?lang=es` | Opens Spanish immediately, from the first paint | | |
| 18 | Owner content | An English service description on a Spanish page stays English (expected) | | |
| 19 | `/nonexistent` | 404 page matches the resolved language | | |
| 20 | Service editor date field | Known limitation: native input follows the OS locale, not the page | n/a | n/a |
```

- [ ] **Step 3: Fix anything red, then commit**

```bash
git add docs/manual-tests/language-consistency.md
git commit -m "docs: record language verification walkthrough"
```

---

## Out of Scope (decided, not overlooked)

- **Locale-formatted currency.** `cost` stays owner-typed free text. Adding `Intl.NumberFormat` would require a numeric amount plus a currency code per provider and a fuzzy backfill of existing strings like `"$95"`, `"£220"`, `"฿1,400"` — and it would reformat the owner's own writing, which contradicts the owner-content rule. The DoD line about currency does not apply.
- **Geo-IP detection.** `Accept-Language` only. No `x-vercel-ip-country`, no country list.
- **Super-admin.** English-only internal tool. Its `Intl.DateTimeFormat("en", …)` calls are intentional.
- **Merging the two dictionaries.** `components/landing/translations.ts` (landing + auth) and `components/booking/i18n/translations.ts` (dashboard + public) stay separate. Merging 2,400 lines carries real regression risk and fixes nothing the English-branch removal does not already fix. Revisit only if a string genuinely needs to live in both.
- **Replacing the native date input** with a custom picker.
- **A third language.** `Lang` stays `"en" | "es"`.
