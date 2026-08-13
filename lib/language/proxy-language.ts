import type { NextRequest, NextResponse } from "next/server";

import type { Lang } from "@/lib/types";
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
 */
export function applyLanguageCookie(
  request: NextRequest,
  response: NextResponse,
): Lang {
  const stored = parseLang(request.cookies.get(LANGUAGE_COOKIE)?.value);
  const lang = resolveLanguage({
    explicit: isPublicBookingRoute(request.nextUrl.pathname)
      ? undefined
      : request.nextUrl.searchParams.get("lang"),
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
