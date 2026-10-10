"use client";

import { useActionState } from "react";

import { updatePassword, type AuthFormState } from "@/app/login/actions";
import { Alert, Button, ButtonLink, Field, Input } from "@/components/app-ui";
import { translations, type Lang } from "@/components/landing/translations";

const initialState: AuthFormState = { message: "", status: "idle" };

export function NewPasswordForm({ lang }: { lang: Lang }) {
  const t = translations[lang].auth;
  const [state, formAction, isPending] = useActionState(updatePassword, initialState);
  const done = state.status === "success";

  return (
    <form className="grid gap-5" action={formAction}>
      <input type="hidden" name="lang" value={lang} />
      <Field id="password" label={t.newPassword}>
        <Input
          autoComplete="new-password"
          minLength={6}
          name="password"
          placeholder={t.passwordPlaceholder}
          required
          type="password"
        />
      </Field>
      {/* Always mounted, so a message that arrives later is announced. */}
      <div aria-live="polite">
        {state.message ? <Alert tone={done ? "success" : "danger"}>{state.message}</Alert> : null}
      </div>
      {done ? (
        <ButtonLink href={`/login?lang=${lang}`} variant="primary" className="w-full">
          {t.signIn}
        </ButtonLink>
      ) : (
        <Button type="submit" variant="primary" loading={isPending} className="w-full">
          {isPending ? t.newPasswordSaving : t.newPasswordSubmit}
        </Button>
      )}
    </form>
  );
}
