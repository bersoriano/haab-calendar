"use client";

import { useState } from "react";
import { useActionState } from "react";
import { authenticate, type AuthFormState } from "@/app/login/actions";

const initialState: AuthFormState = {
  message: "",
  status: "idle",
};

type AuthFormProps = {
  nextPath: string;
};

type AuthIntent = "login" | "signup";

export function AuthForm({ nextPath }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(authenticate, initialState);
  const [pendingIntent, setPendingIntent] = useState<AuthIntent>("login");
  const showSignupPendingMessage = isPending && pendingIntent === "signup";
  const formMessage = showSignupPendingMessage
    ? {
        message: "Creating your account and sending your confirmation email...",
        status: "success" as const,
      }
    : state;

  return (
    <form className="mt-8 grid gap-5" action={formAction}>
      <input type="hidden" name="next" value={nextPath} />
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]" htmlFor="email">
        Email
        <input
          autoComplete="email"
          className="rounded-2xl border border-[rgba(193,198,214,0.55)] bg-white px-4 py-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          id="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </label>
      <label
        className="grid gap-2 text-sm font-medium text-[var(--ink)]"
        htmlFor="password"
      >
        Password
        <input
          autoComplete="current-password"
          className="rounded-2xl border border-[rgba(193,198,214,0.55)] bg-white px-4 py-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          id="password"
          minLength={6}
          name="password"
          placeholder="At least 6 characters"
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
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,91,191,0.22)] transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isPending}
          name="intent"
          onClick={() => setPendingIntent("login")}
          type="submit"
          value="login"
        >
          {isPending && pendingIntent === "login" ? "Signing in..." : "Sign in"}
        </button>
        <button
          className="rounded-2xl border border-[rgba(193,198,214,0.55)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isPending}
          name="intent"
          onClick={() => setPendingIntent("signup")}
          type="submit"
          value="signup"
        >
          {isPending && pendingIntent === "signup" ? "Creating account..." : "Create account"}
        </button>
      </div>
    </form>
  );
}
