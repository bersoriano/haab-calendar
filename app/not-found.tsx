import Link from "next/link";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getServerLanguage } from "@/lib/language/server";

/**
 * A server component, like /login: the language is already resolved before the
 * first byte, so a visitor carrying `haab-lang=es` reads a Spanish 404 inside
 * `<html lang="es">` rather than an English one. Nothing here writes the
 * language — the proxy owns that, and the switcher's `?lang=` link is what it
 * reads on the next request.
 *
 * `/_not-found` is already dynamic (the root layout reads cookies/headers), so
 * this costs no static rendering.
 */
export default async function NotFoundPage() {
  const lang = await getServerLanguage();
  const t = bookingTranslations[lang];

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#eef2f5] px-5 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/bkg2.jpg')] bg-cover bg-center opacity-70"
      />
      <section className="relative w-full max-w-xl rounded-[34px] border border-white/80 bg-[rgba(255,255,255,0.82)] p-6 text-center shadow-[0_32px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:p-10">
        {/* Relative on purpose: a 404 keeps the address the visitor typed, and
            the proxy turns the `?lang=` it lands on into the stored language.
            Public booking routes are exempt from that write (see
            lib/language/public-routes.ts), so a 404 from a mistyped provider
            slug switches only for that request. */}
        <LanguageSwitcher
          lang={lang}
          hrefFor={(option) => `?lang=${option}`}
          className="mx-auto mb-10"
        />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          {t.notFound.eyebrow}
        </p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">
          {t.notFound.title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--muted)]">
          {t.notFound.body}
        </p>
        <Link
          href={`/?lang=${lang}`}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(26,115,232,0.24)] transition hover:opacity-90"
        >
          {t.notFound.goHome}
        </Link>
      </section>
    </main>
  );
}
