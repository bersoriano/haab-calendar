"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { authenticate, type AuthFormState } from "@/app/login/actions";
import {
  translations,
  type Lang,
} from "@/components/landing/translations";
import { LANGUAGE_COOKIE } from "@/lib/language/resolve";
import { isGuestPublishReturnPath } from "@/lib/guest-builder";

const initialState: AuthFormState = {
  message: "",
  status: "idle",
};

type AuthFormProps = {
  lang: Lang;
  nextPath: string;
  initialIntent?: AuthIntent;
};

type AuthIntent = "login" | "signup";

export function AuthForm({
  lang,
  nextPath,
  initialIntent = "login",
}: AuthFormProps) {
  const t = translations[lang].auth;
  const [state, formAction, isPending] = useActionState(authenticate, initialState);
  const [intent, setIntent] = useState<AuthIntent>(initialIntent);
  const showSignupPendingMessage = isPending && intent === "signup";
  const isPublishFlow = isGuestPublishReturnPath(nextPath);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(LANGUAGE_COOKIE, lang);
  }, [lang]);

  const formMessage = showSignupPendingMessage
    ? {
        message: t.creatingAndSending,
        status: "success" as const,
      }
    : state;

  return (
    <form className="mt-8 grid gap-5" action={formAction}>
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="intent" value={intent} />
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="email">
        {t.email}
        <input
          autoComplete="email"
          className="rounded-2xl border border-[rgba(193,198,214,0.55)] bg-white px-4 py-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          id="email"
          name="email"
          placeholder={t.emailPlaceholder}
          required
          type="email"
        />
      </label>
      <label
        className="grid gap-2 text-sm font-medium text-[var(--ink)]"
        htmlFor="password"
      >
        {t.password}
        <input
          autoComplete={intent === "signup" ? "new-password" : "current-password"}
          className="rounded-2xl border border-[rgba(193,198,214,0.55)] bg-white px-4 py-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          id="password"
          minLength={6}
          name="password"
          placeholder={t.passwordPlaceholder}
          required
          type="password"
        />
      </label>
      {formMessage.message ? (
        <p
          aria-live="polite"
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            formMessage.status === "success"
              ? "bg-[rgba(0,191,165,0.12)] text-[var(--action-teal-deep)]"
              : "bg-[rgba(219,68,55,0.1)] text-[#8f1d15]"
          }`}
        >
          {formMessage.message}
        </p>
      ) : null}
      <div className="grid gap-3">
        <button
          className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,91,191,0.22)] transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isPending}
          type="submit"
        >
          {intent === "signup"
            ? isPending
              ? t.creatingAccount
              : isPublishFlow
                ? t.createAccountToPublish
                : t.createAccount
            : isPending
              ? t.signingIn
              : t.signIn}
        </button>
        <button
          className="rounded-2xl px-5 py-2 text-sm font-semibold text-[var(--primary)] underline-offset-4 transition hover:underline disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isPending}
          onClick={() => setIntent((current) => (current === "signup" ? "login" : "signup"))}
          type="button"
        >
          {intent === "signup" ? t.alreadyHaveAccount : t.newHereCreateAccount}
        </button>
      </div>
    </form>
  );
}
