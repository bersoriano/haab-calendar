"use client";

import { useActionState } from "react";

import { requestPasswordReset, type AuthFormState } from "@/app/login/actions";
import { translations, type Lang } from "@/components/landing/translations";

const initialState: AuthFormState = { message: "", status: "idle" };

export function PasswordResetRequestForm({ lang }: { lang: Lang }) {
  const t = translations[lang].auth;
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  return (
    <form className="mt-8 grid gap-5" action={formAction}>
      <input type="hidden" name="lang" value={lang} />
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
      {state.message ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            state.status === "success"
              ? "bg-[rgba(0,191,165,0.12)] text-[var(--action-teal-deep)]"
              : "bg-[rgba(219,68,55,0.1)] text-[#8f1d15]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      <button
        className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,91,191,0.22)] transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
        disabled={isPending}
        type="submit"
      >
        {isPending ? t.resetSending : t.resetSubmit}
      </button>
    </form>
  );
}
