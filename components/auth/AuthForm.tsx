"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActionState } from "react";

import { authenticate, type AuthFormState } from "@/app/login/actions";
import { Alert, Button, Field, Input, focusRing } from "@/components/app-ui";
import {
  translations,
  type Lang,
} from "@/components/landing/translations";
import { isGuestPublishReturnPath } from "@/lib/guest-builder";
import { cn } from "@/lib/utils";

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
  // Controlled: React resets a form's uncontrolled fields after its action
  // runs, which would wipe the address on every refused attempt.
  const [email, setEmail] = useState("");
  const showSignupPendingMessage = isPending && intent === "signup";
  const isPublishFlow = isGuestPublishReturnPath(nextPath);

  // The login page is server-rendered with `lang` already resolved; this only
  // keeps `<html lang>` honest when the visitor switches without a full
  // navigation. The language itself lives in the cookie the proxy writes —
  // nothing reads or writes it from localStorage any more.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const formMessage = showSignupPendingMessage
    ? {
        message: t.creatingAndSending,
        status: "success" as const,
      }
    : state;

  return (
    <form className="mt-6 grid gap-5" action={formAction}>
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="intent" value={intent} />
      <Field id="email" label={t.email}>
        <Input
          autoComplete="email"
          name="email"
          placeholder={t.emailPlaceholder}
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field id="password" label={t.password}>
        <Input
          autoComplete={intent === "signup" ? "new-password" : "current-password"}
          minLength={6}
          name="password"
          placeholder={t.passwordPlaceholder}
          required
          type="password"
        />
      </Field>
      {/* Always mounted, so a message that arrives later is announced. */}
      <div aria-live="polite">
        {formMessage.message ? (
          <Alert tone={formMessage.status === "success" ? "success" : "danger"}>{formMessage.message}</Alert>
        ) : null}
      </div>
      <div className="grid gap-3">
        <Button type="submit" variant="primary" loading={isPending} className="w-full">
          {intent === "signup"
            ? isPending
              ? t.creatingAccount
              : isPublishFlow
                ? t.createAccountToPublish
                : t.createAccount
            : isPending
              ? t.signingIn
              : t.signIn}
        </Button>
        <Button
          variant="plain"
          disabled={isPending}
          onClick={() => setIntent((current) => (current === "signup" ? "login" : "signup"))}
          className="w-full text-app-accent hover:text-app-accent-hover"
        >
          {intent === "signup" ? t.alreadyHaveAccount : t.newHereCreateAccount}
        </Button>
        {intent === "login" ? (
          <Link
            className={cn(
              "mx-auto inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-app-fg-muted transition-colors hover:text-app-fg sm:min-h-0",
              focusRing,
            )}
            href={`/login/reset?lang=${lang}`}
          >
            {t.forgotPassword}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
