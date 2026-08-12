import { AuthForm } from "@/components/auth/AuthForm";
import { LoginHeader } from "@/components/auth/LoginHeader";
import {
  normalizeLandingLang,
  translations,
  type Lang,
} from "@/components/landing/translations";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import { getAuthReturnVertical } from "@/lib/auth-vertical";
import { isGuestPublishReturnPath } from "@/lib/guest-builder";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
    lang?: string;
    next?: string;
    status?: string;
    mode?: string;
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

function languageHref(lang: Lang, nextPath: string, mode: "login" | "signup") {
  const params = new URLSearchParams({
    lang,
    next: withAuthReturnLanguage(nextPath, lang),
  });
  if (mode === "signup") {
    params.set("mode", "signup");
  }
  return `/login?${params.toString()}`;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const lang = normalizeLandingLang(params.lang);
  const t = translations[lang].auth;
  const nextPath = withAuthReturnLanguage(getSafeNextPath(params.next), lang);
  const isEventsFlow = getAuthReturnVertical(nextPath) === "events";
  const isPublishFlow = isGuestPublishReturnPath(nextPath);
  const initialIntent = params.mode === "signup" ? "signup" : "login";
  const message = params.message;
  const messageStatus = params.status === "success" ? "success" : "error";

  return (
    <div lang={lang} className="min-h-screen">
      <LoginHeader lang={lang} />
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[1120px] items-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div>
            <div className="flex justify-end">
              <LanguageSwitcher
                lang={lang}
                hrefFor={(option) => languageHref(option, nextPath, initialIntent)}
              />
            </div>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold text-[var(--ink)] sm:text-5xl">
              {isPublishFlow ? t.publishPageTitle : t.pageTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
              {isPublishFlow
                ? t.publishPageBody
                : isEventsFlow
                  ? t.eventOrganizerPageBody
                  : t.pageBody}
            </p>
          </div>
          <section className="rounded-[28px] bg-[rgba(248,249,250,0.94)] p-6 shadow-[0_28px_64px_rgba(25,28,29,0.08)] ring-1 ring-[rgba(255,255,255,0.68)] sm:p-8">
            <h2 className="text-2xl font-semibold text-[var(--ink)]">
              {isPublishFlow
                ? t.publishPanelTitle
                : isEventsFlow
                  ? t.eventOrganizerPanelTitle
                  : t.panelTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {isPublishFlow ? t.publishPanelBody : t.panelBody}
            </p>
            {isPublishFlow ? (
              <p className="mt-4 rounded-2xl bg-[var(--teal-soft)] px-4 py-3 text-sm font-semibold text-[var(--teal)]">
                {t.draftSafe}
              </p>
            ) : null}
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
            <AuthForm
              initialIntent={initialIntent}
              lang={lang}
              nextPath={nextPath}
            />
          </section>
        </section>
      </main>
    </div>
  );
}
