import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  status: "error" | "success" = "error",
) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("message", message);
  loginUrl.searchParams.set("status", status);
  return loginUrl;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
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
        "Email confirmed. Sign in to continue.",
        "success",
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
        "That confirmation link is expired or has already been used. Try signing in below; if it does not work, create the account again.",
      ),
    );
  }

  return NextResponse.redirect(
    getLoginRedirect(
      request,
      "Email confirmed. Sign in to continue.",
      "success",
    ),
  );
}
