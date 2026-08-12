import {
  normalizeLandingLang,
  translations,
  type Lang,
} from "@/components/landing/translations";

export type AuthErrorLike = {
  code?: string;
  message?: string;
};

export function withAuthReturnLanguage(path: string, lang: Lang) {
  const [pathAndQuery, hash] = path.split("#", 2);
  const [pathname, query] = pathAndQuery.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("lang", lang);

  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

export function getAuthCopy(value: unknown) {
  const lang = normalizeLandingLang(value);
  return { lang, t: translations[lang].auth };
}

export function getAuthErrorMessage(
  error: AuthErrorLike,
  lang: Lang,
  fallback: "signInFailed" | "createFailed",
) {
  const t = translations[lang].auth;

  // Both languages map the same codes. Supabase's own message is English
  // regardless of the visitor, so it is never surfaced.
  switch (error.code) {
    case "invalid_credentials":
      return t.invalidCredentials;
    case "email_not_confirmed":
      return t.emailNotConfirmed;
    case "email_exists":
    case "user_already_exists":
    case "user_already_registered":
      return t.userExists;
    case "signup_disabled":
      return t.signupDisabled;
    case "email_address_invalid":
    case "validation_failed":
      return t.emailInvalid;
    default:
      return t[fallback];
  }
}
