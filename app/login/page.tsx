import { AuthForm } from "@/components/auth/AuthForm";
import { LoginHeader } from "@/components/auth/LoginHeader";
import { translations, type Lang } from "@/components/landing/translations";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import { getServerLanguage } from "@/lib/language/server";
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
  // `?lang` still wins when a link carries one, but the proxy's redirect to
  // /login sets only `next` — so without the cookie and Accept-Language behind
  // it, a Spanish visitor sent here from a protected route got an English page.
  const lang = await getServerLanguage(params.lang);
  const t = translations[lang].auth;
  const nextPath = withAuthReturnLanguage(getSafeNextPath(params.next), lang);
  const isEventsFlow = getAuthReturnVertical(nextPath) === "events";
  const isPublishFlow = isGuestPublishReturnPath(nextPath);
  const initialIntent = params.mode === "signup" ? "signup" : "login";
  const message = params.message;
  const messageStatus = params.status === "success" ? "success" : "error";

  return (
    <div lang={lang} className="min-h-screen">
      <LoginHeader
        lang={lang}
        languageHrefFor={(option) => languageHref(option, nextPath, initialIntent)}
      />
      {/* The landing hero's ground, carried through: same gradient, same two
          radial washes, so signing in reads as the next step of that page
          rather than a plainer one bolted beside it. */}
      <main className="relative isolate overflow-hidden border-b border-[var(--line)] bg-[linear-gradient(145deg,#f5f7fb_0%,#edf4ff_54%,#e9f8f5_100%)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(26,115,232,0.16),transparent_68%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-56 left-1/3 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.12),transparent_68%)]"
        />
        <div className="relative mx-auto grid w-full max-w-[1280px] items-center gap-8 px-5 py-10 sm:gap-10 sm:px-8 sm:py-14 lg:min-h-[calc(100vh-80px)] lg:grid-cols-[1.02fr_0.98fr] lg:gap-x-14 lg:py-18">
          <div>
            <h1 className="max-w-2xl text-balance text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.045em] text-[var(--ink)] sm:text-5xl lg:text-[3.2rem] lg:leading-[1.03]">
              {isPublishFlow ? t.publishPageTitle : t.pageTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
              {isPublishFlow
                ? t.publishPageBody
                : isEventsFlow
                  ? t.eventOrganizerPageBody
                  : t.pageBody}
            </p>
          </div>
          {/* The same floating card the hero preview uses. */}
          <section className="overflow-hidden rounded-[30px] border border-white/90 bg-white/88 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-8">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
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
        </div>
      </main>
    </div>
  );
}
