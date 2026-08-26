"use client";

import { useActionState } from "react";

import { updatePassword, type AuthFormState } from "@/app/login/actions";
import { translations, type Lang } from "@/components/landing/translations";

const initialState: AuthFormState = { message: "", status: "idle" };

export function NewPasswordForm({ lang }: { lang: Lang }) {
  const t = translations[lang].auth;
  const [state, formAction, isPending] = useActionState(updatePassword, initialState);
  const done = state.status === "success";

  return (
    <form className="mt-8 grid gap-5" action={formAction}>
      <input type="hidden" name="lang" value={lang} />
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="password">
        {t.newPassword}
        <input
          autoComplete="new-password"
          className="rounded-2xl border border-[rgba(193,198,214,0.55)] bg-white px-4 py-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          id="password"
          minLength={6}
          name="password"
          placeholder={t.passwordPlaceholder}
          required
          type="password"
        />
      </label>
      {state.message ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            done
              ? "bg-[rgba(0,191,165,0.12)] text-[var(--action-teal-deep)]"
              : "bg-[rgba(219,68,55,0.1)] text-[#8f1d15]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      {done ? (
        <a
          className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,91,191,0.22)] transition hover:bg-[var(--accent)]"
          href={`/login?lang=${lang}`}
        >
          {t.signIn}
        </a>
      ) : (
        <button
          className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,91,191,0.22)] transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isPending}
          type="submit"
        >
          {isPending ? t.newPasswordSaving : t.newPasswordSubmit}
        </button>
      )}
    </form>
  );
}
