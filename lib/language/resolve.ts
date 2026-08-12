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
