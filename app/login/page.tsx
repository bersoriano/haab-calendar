import { Alert } from "@/components/app-ui";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageFrame } from "@/components/auth/AuthPageFrame";
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
    <AuthPageFrame
      lang={lang}
      header={
        <LoginHeader
          lang={lang}
          languageHrefFor={(option) => languageHref(option, nextPath, initialIntent)}
        />
      }
      title={isPublishFlow ? t.publishPageTitle : t.pageTitle}
      body={
        isPublishFlow
          ? t.publishPageBody
          : isEventsFlow
            ? t.eventOrganizerPageBody
            : t.pageBody
      }
    >
      <h2 className="text-base font-semibold text-app-fg">
        {isPublishFlow
          ? t.publishPanelTitle
          : isEventsFlow
            ? t.eventOrganizerPanelTitle
            : t.panelTitle}
      </h2>
      <p className="mt-1 text-sm text-app-fg-muted">
        {isPublishFlow ? t.publishPanelBody : t.panelBody}
      </p>
      {isPublishFlow ? (
        <Alert tone="info" className="mt-4">
          {t.draftSafe}
        </Alert>
      ) : null}
      {message ? (
        <Alert
          tone={messageStatus === "success" ? "success" : "danger"}
          role={messageStatus === "success" ? "status" : "alert"}
          className="mt-4"
        >
          {message}
        </Alert>
      ) : null}
      <AuthForm
        initialIntent={initialIntent}
        lang={lang}
        nextPath={nextPath}
      />
    </AuthPageFrame>
  );
}
