"use client";

import { useActionState, useState } from "react";

import { requestPasswordReset, type AuthFormState } from "@/app/login/actions";
import { Alert, Button, Field, Input } from "@/components/app-ui";
import { translations, type Lang } from "@/components/landing/translations";

const initialState: AuthFormState = { message: "", status: "idle" };

export function PasswordResetRequestForm({ lang }: { lang: Lang }) {
  const t = translations[lang].auth;
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);
  // Controlled: React resets uncontrolled fields after the action, which would
  // wipe a mistyped address the visitor only needs to correct.
  const [email, setEmail] = useState("");

  return (
    <form className="grid gap-5" action={formAction}>
      <input type="hidden" name="lang" value={lang} />
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
      {/* Always mounted, so a message that arrives later is announced. */}
      <div aria-live="polite">
        {state.message ? (
          <Alert tone={state.status === "success" ? "success" : "danger"}>{state.message}</Alert>
        ) : null}
      </div>
      <Button type="submit" variant="primary" loading={isPending} className="w-full">
        {isPending ? t.resetSending : t.resetSubmit}
      </Button>
    </form>
  );
}
