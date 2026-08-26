import Link from "next/link";

import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import type { LegalDocument } from "@/lib/legal/content";
import type { Lang } from "@/lib/types";

const BACK_LABEL: Record<Lang, string> = {
  en: "← Back to home",
  es: "← Volver al inicio",
};

const UPDATED_LABEL: Record<Lang, string> = {
  en: "Last updated",
  es: "Última actualización",
};

const SIBLING_LABEL: Record<Lang, { privacy: string; terms: string }> = {
  en: { privacy: "Privacy Notice", terms: "Terms of Service" },
  es: { privacy: "Aviso de Privacidad", terms: "Términos de Servicio" },
};

/**
 * Shared shell for the two legal documents.
 *
 * Long-form reading rather than a landing surface, so the card is wide, the
 * copy is left-aligned, and the measure is capped near 70 characters. It keeps
 * the same glass treatment as the rest of the public pages so it does not read
 * as a bolted-on legal appendix.
 *
 * Every section heading gets an id: a privacy notice is a document people are
 * pointed at a specific clause of, and Google's OAuth review in particular
 * benefits from a linkable Limited Use section.
 */
export function LegalDocumentPage({
  document,
  lang,
  sibling,
}: {
  document: LegalDocument;
  lang: Lang;
  sibling: { href: "/privacy" | "/terms"; id: "privacy" | "terms" };
}) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#eef2f5] px-5 py-10 sm:py-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/bkg2.jpg')] bg-cover bg-center opacity-70"
      />
      <article className="relative mx-auto w-full max-w-3xl rounded-[34px] border border-white/80 bg-[rgba(255,255,255,0.86)] p-6 shadow-[0_32px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:p-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/?lang=${lang}`}
            className="text-sm font-semibold text-[var(--primary)] transition hover:opacity-80"
          >
            {BACK_LABEL[lang]}
          </Link>
          {/* Relative, like the 404: the proxy turns the `?lang=` this lands on
              into the stored language, so the choice follows the reader. */}
          <LanguageSwitcher lang={lang} hrefFor={(option) => `?lang=${option}`} />
        </div>

        <header className="mt-10">
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">
            {document.title}
          </h1>
          <p className="mt-4 max-w-[70ch] text-base leading-7 text-[var(--muted)]">
            {document.summary}
          </p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {UPDATED_LABEL[lang]}: {document.updated}
          </p>
        </header>

        <nav aria-label={document.title} className="mt-10 border-t border-black/10 pt-6">
          <ol className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {document.sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-[var(--muted)] transition hover:text-[var(--primary)]"
                >
                  <span className="tabular-nums">{index + 1}.</span> {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-4">
          {document.sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="mt-10 scroll-mt-8 border-t border-black/10 pt-8"
            >
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
                <span className="tabular-nums text-[var(--muted)]">{index + 1}.</span>{" "}
                {section.heading}
              </h2>
              {section.body.map((paragraph, paragraphIndex) => (
                <p
                  key={paragraphIndex}
                  className="mt-4 max-w-[70ch] text-[15px] leading-7 text-[var(--muted)]"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-black/10 pt-6">
          <Link
            href={`${sibling.href}?lang=${lang}`}
            className="text-sm font-semibold text-[var(--primary)] transition hover:opacity-80"
          >
            {SIBLING_LABEL[lang][sibling.id]} →
          </Link>
        </footer>
      </article>
    </main>
  );
}
