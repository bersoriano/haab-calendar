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
