import type { Lang } from "@/lib/types";

/**
 * Marketing pages whose URL names their language: `/en/...` and `/es/...`,
 * each with its own words in the slug, because that is what people search for
 * in each language. Every other marketing page carries its language as
 * `?lang=` (see components/landing/seo.ts).
 */
export const DOCTORS_LANDING_PATHS: Record<Lang, string> = {
  en: "/en/online-booking-for-doctors",
  es: "/es/agenda-online-para-medicos",
};

/**
 * The language a path names in its first segment, or undefined. The proxy
 * treats it like an explicit `?lang=`, so the page, its `<html lang>` and the
 * visitor's remembered choice all agree from the first byte.
 *
 * Pure and dependency-free so it can be unit-tested without a request.
 */
export function routeLanguage(pathname: string): Lang | undefined {
  const [first] = pathname.split("/").filter(Boolean);
  return first === "en" || first === "es" ? first : undefined;
}
