import type { NextRequest, NextResponse } from "next/server";

import type { Lang } from "@/lib/types";
import { routeLanguage } from "./localized-routes";
import { isPublicBookingRoute } from "./public-routes";
import { LANGUAGE_COOKIE, parseLang, resolveLanguage } from "./resolve";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Resolve the visitor's language once per request and persist it, so every
 * server render downstream knows it before the first byte. Writing only on a
 * change keeps `Set-Cookie` off the vast majority of responses.
 *
 * One exception: on a business's own booking page, `?lang=` is a choice about
 * that page, not about the visitor. The module writes it into the URL and
 * deliberately not into shared storage; reading it back here would promote it
 * to the global cookie on the next reload and leak one business's language to
 * the marketing site and to every other business. Those routes keep an
 * existing cookie and Accept-Language detection, nothing more.
 *
 * A page whose path names its language (`/es/...`) is as explicit as `?lang=`.
 * `previous` is the cookie the visitor arrived with, for when the request has
 * already been given the route's language (see forwardRouteLanguage).
 */
export function applyLanguageCookie(
  request: NextRequest,
  response: NextResponse,
  // null = the visitor arrived with no cookie. Only `undefined` reads it here.
  previous: string | null = request.cookies.get(LANGUAGE_COOKIE)?.value ?? null,
): Lang {
  const stored = parseLang(previous);
  const { pathname, searchParams } = request.nextUrl;
  const lang = resolveLanguage({
    explicit: isPublicBookingRoute(pathname)
      ? undefined
      : (routeLanguage(pathname) ?? searchParams.get("lang")),
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

/**
 * On a page whose path names its language, hand that language to this
 * request's own render: the root layout reads `<html lang>` from the cookie,
 * and the cookie the browser sent may say otherwise (or nothing, for a
 * crawler). Call it before the response is created, which copies the request.
 * Returns the cookie the visitor arrived with, for applyLanguageCookie.
 */
export function forwardRouteLanguage(request: NextRequest): string | null {
  const previous = request.cookies.get(LANGUAGE_COOKIE)?.value ?? null;
  const lang = routeLanguage(request.nextUrl.pathname);

  if (lang) {
    request.cookies.set(LANGUAGE_COOKIE, lang);
  }

  return previous;
}
