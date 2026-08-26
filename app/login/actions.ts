"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEMO_EDIT_COOKIE } from "@/lib/demo-pages";
import { translations, type Lang } from "@/components/landing/translations";
import { getAuthCopy, getAuthErrorMessage } from "@/lib/auth-i18n";

export type AuthFormState = {
  message: string;
  status: "idle" | "error" | "success";
};

type CredentialsResult =
  | {
      data: {
        email: string;
        password: string;
      };
      lang: Lang;
      next: string;
    }
  | {
      error: string;
      lang: Lang;
      next: string;
    };

const initialState: AuthFormState = {
  message: "",
  status: "idle",
};

function getCredentials(formData: FormData): CredentialsResult {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = getSafeNextPath(String(formData.get("next") || "/"));
  const { lang, t } = getAuthCopy(formData.get("lang"));

  if (!email || !password) {
    return {
      error: t.requiredCredentials,
      lang,
      next,
    };
  }

  if (password.length < 6) {
    return {
      error: t.passwordMin,
      lang,
      next,
    };
  }

  return {
    data: { email, password },
    lang,
    next,
  };
}

function getSafeNextPath(next: string) {
  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  if (next.startsWith("/login") || next.startsWith("/auth")) {
    return "/";
  }

  return next;
}

async function getOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const protocol = headerStore.get("x-forwarded-proto") || "http";
  const host = headerStore.get("host") || "localhost:3000";
  return `${protocol}://${host}`;
}

function buildLoginMessageUrl(
  origin: string,
  message: string,
  next: string,
  lang: Lang,
) {
  const url = new URL("/login", origin);
  url.searchParams.set("lang", lang);
  url.searchParams.set("status", "success");
  url.searchParams.set("message", message);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function login(
  _previousState: AuthFormState = initialState,
  formData: FormData,
): Promise<AuthFormState> {
  void _previousState;

  const credentials = getCredentials(formData);

  if ("error" in credentials) {
    return { message: credentials.error, status: "error" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials.data);

  if (error) {
    return {
      message: getAuthErrorMessage(error, credentials.lang, "signInFailed"),
      status: "error",
    };
  }

  revalidatePath("/", "layout");
  redirect(credentials.next);
}

export async function signup(
  _previousState: AuthFormState = initialState,
  formData: FormData,
): Promise<AuthFormState> {
  void _previousState;

  const credentials = getCredentials(formData);

  if ("error" in credentials) {
    return { message: credentials.error, status: "error" };
  }

  const supabase = await createClient();
  const t = translations[credentials.lang].auth;
  const origin = await getOrigin();
  const confirmedRedirectTo = buildLoginMessageUrl(
    origin,
    t.emailConfirmed,
    credentials.next,
    credentials.lang,
  );
  const { data, error } = await supabase.auth.signUp({
    ...credentials.data,
    options: {
      emailRedirectTo: confirmedRedirectTo,
    },
  });

  if (error) {
    return {
      message: getAuthErrorMessage(error, credentials.lang, "createFailed"),
      status: "error",
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(credentials.next);
  }

  return {
    message: t.accountCreated,
    status: "success",
  };
}

export async function authenticate(
  previousState: AuthFormState = initialState,
  formData: FormData,
) {
  const intent = String(formData.get("intent") || "login");

  if (intent === "signup") {
    return signup(previousState, formData);
  }

  return login(previousState, formData);
}

/** Deliberately permissive: the authority on a deliverable address is the mail. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where a recovery link lands.
 *
 * Not /auth or /login: getSafeNextPath in both the confirm route and the login
 * page rejects a `next` under either, and a rejected `next` silently drops the
 * visitor on the home page holding a recovery session with nowhere to set a
 * password.
 */
// Not exported: a "use server" module may only export async functions.
const PASSWORD_RESET_PATH = "/reset-password";

/**
 * Starts a password reset.
 *
 * The answer is the same whether or not an account exists. Anything else turns
 * this form into an oracle for which email addresses hold accounts here, which
 * is exactly the question an attacker wants answered before trying passwords.
 * Supabase's own errors are swallowed for the same reason.
 */
export async function requestPasswordReset(
  _previousState: AuthFormState = initialState,
  formData: FormData,
): Promise<AuthFormState> {
  void _previousState;

  const email = String(formData.get("email") || "").trim();
  const { lang, t } = getAuthCopy(formData.get("lang"));

  if (!email) {
    return { message: t.resetEmailRequired, status: "error" };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { message: t.resetEmailInvalid, status: "error" };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const redirectTo = new URL("/auth/confirm", origin);
  redirectTo.searchParams.set("next", PASSWORD_RESET_PATH);
  redirectTo.searchParams.set("lang", lang);

  // The result is intentionally unread. A failure here — unknown address, rate
  // limit, mail outage — must look identical to success from the outside.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo.toString(),
  });

  return { message: t.resetSent, status: "success" };
}

/**
 * Sets the new password, using the session the emailed link established.
 *
 * The session is the authorization: reaching this action at all means the
 * recovery token was already verified by /auth/confirm. It is re-checked from
 * the server rather than assumed, because a form post can arrive at any time,
 * including long after the link expired.
 */
export async function updatePassword(
  _previousState: AuthFormState = initialState,
  formData: FormData,
): Promise<AuthFormState> {
  void _previousState;

  const password = String(formData.get("password") || "");
  const { lang, t } = getAuthCopy(formData.get("lang"));
  void lang;

  if (password.length < 6) {
    return { message: t.passwordMin, status: "error" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { message: t.newPasswordNoSession, status: "error" };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { message: t.newPasswordFailed, status: "error" };
  }

  revalidatePath("/", "layout");

  return { message: t.newPasswordUpdated, status: "success" };
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  // A stale demo-editing marker must not outlive the session that set it.
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_EDIT_COOKIE);

  revalidatePath("/", "layout");
  redirect("/login");
}
