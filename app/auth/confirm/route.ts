import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeLandingLang,
  translations,
  type Lang,
} from "@/components/landing/translations";

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  if (next.startsWith("/login") || next.startsWith("/auth")) {
    return "/";
  }

  return next;
}

function getLoginRedirect(
  request: NextRequest,
  message: string,
  lang: Lang,
  status: "error" | "success" = "error",
) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("lang", lang);
  loginUrl.searchParams.set("message", message);
  loginUrl.searchParams.set("status", status);
  return loginUrl;
}

function getRequestLang(requestUrl: URL) {
  const directLang = requestUrl.searchParams.get("lang");
  if (directLang === "en" || directLang === "es") {
    return directLang;
  }

  const redirectTo = requestUrl.searchParams.get("redirect_to");
  if (redirectTo) {
    try {
      return normalizeLandingLang(
        new URL(redirectTo, requestUrl).searchParams.get("lang"),
      );
    } catch {
      // Fall through to the visitor-facing default.
    }
  }

  return normalizeLandingLang(undefined);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const lang = getRequestLang(requestUrl);
  const t = translations[lang].auth;
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = (requestUrl.searchParams.get("type") || "email") as EmailOtpType;
  const next = getSafeNextPath(
    requestUrl.searchParams.get("next") ||
      requestUrl.searchParams.get("redirect_to"),
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    return NextResponse.redirect(
      getLoginRedirect(
        request,
        t.confirmationExpired,
        lang,
      ),
    );
  }

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    return NextResponse.redirect(
      getLoginRedirect(
        request,
        t.confirmationExpired,
        lang,
      ),
    );
  }

  return NextResponse.redirect(
    getLoginRedirect(
      request,
      t.emailConfirmed,
      lang,
      "success",
    ),
  );
}
