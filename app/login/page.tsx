import { AuthForm } from "@/components/auth/AuthForm";
import Link from "next/link";
import {
  normalizeLandingLang,
  translations,
  type Lang,
} from "@/components/landing/translations";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
    lang?: string;
    next?: string;
    status?: string;
  }>;
};

function getSafeNextPath(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  if (next.startsWith("/login") || next.startsWith("/auth")) {
    return "/";
  }

  return next;
}

function languageHref(lang: Lang, nextPath: string) {
  const params = new URLSearchParams({ lang, next: nextPath });
  return `/login?${params.toString()}`;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const lang = normalizeLandingLang(params.lang);
  const t = translations[lang].auth;
  const nextPath = getSafeNextPath(params.next);
  const message = params.message;
  const messageStatus = params.status === "success" ? "success" : "error";

  return (
    <main
      lang={lang}
      className="mx-auto grid min-h-screen w-full max-w-[1120px] items-center px-4 py-8 sm:px-6 lg:px-8"
    >
      <section className="grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
              Haab Calendar
            </p>
            <nav
              aria-label={t.languageSelector}
              className="inline-flex rounded-full border border-[var(--line)] bg-white/75 p-1 text-xs font-semibold"
            >
              {(["es", "en"] as const).map((option) => (
                <Link
                  key={option}
                  href={languageHref(option, nextPath)}
                  aria-current={lang === option ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 transition ${
                    lang === option
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {option.toUpperCase()}
                </Link>
              ))}
            </nav>
          </div>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold text-[var(--ink)] sm:text-5xl">
            {t.pageTitle}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            {t.pageBody}
          </p>
        </div>
        <section className="rounded-[28px] bg-[rgba(248,249,250,0.94)] p-6 shadow-[0_28px_64px_rgba(25,28,29,0.08)] ring-1 ring-[rgba(255,255,255,0.68)] sm:p-8">
          <h2 className="text-2xl font-semibold text-[var(--ink)]">{t.panelTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {t.panelBody}
          </p>
          {message ? (
            <p
              className={`mt-5 rounded-2xl px-4 py-3 text-sm leading-6 ${
                messageStatus === "success"
                  ? "bg-[rgba(0,191,165,0.12)] text-[var(--action-teal-deep)]"
                  : "bg-[rgba(219,68,55,0.1)] text-[#8f1d15]"
              }`}
            >
              {message}
            </p>
          ) : null}
          <AuthForm lang={lang} nextPath={nextPath} />
        </section>
      </section>
    </main>
  );
}
