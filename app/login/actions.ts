"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
      next: string;
    }
  | {
      error: string;
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

  if (!email || !password) {
    return {
      error: "Enter both an email address and password.",
      next,
    };
  }

  if (password.length < 6) {
    return {
      error: "Password must be at least 6 characters.",
      next,
    };
  }

  return {
    data: { email, password },
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

function buildLoginMessageUrl(origin: string, message: string, next: string) {
  const url = new URL("/login", origin);
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
      message: error.message || "Could not sign in with those credentials.",
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
  const origin = await getOrigin();
  const confirmedRedirectTo = buildLoginMessageUrl(
    origin,
    "Email confirmed. Sign in to continue.",
    credentials.next,
  );
  const { data, error } = await supabase.auth.signUp({
    ...credentials.data,
    options: {
      emailRedirectTo: confirmedRedirectTo,
    },
  });

  if (error) {
    return {
      message: error.message || "Could not create that account.",
      status: "error",
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(credentials.next);
  }

  return {
    message:
      "Account created. We sent a confirmation link to your email. Confirm it, then sign in here.",
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

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
