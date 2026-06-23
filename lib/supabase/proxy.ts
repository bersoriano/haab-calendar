import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { parsePublicVerticalSegment } from "@/lib/public-url";
import { getSupabaseConfig } from "@/lib/supabase/config";

const publicRoutePrefixes = ["/login", "/auth", "/public", "/api/public"];

function isPublicRoute(pathname: string) {
  // Root is the public landing page: anon visitors see it and pick a vertical,
  // which routes them to /login. Exact match — "/" as a prefix matches all.
  if (pathname === "/") {
    return true;
  }

  const [verticalSegment] = pathname.split("/").filter(Boolean);

  return (
    publicRoutePrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    Boolean(verticalSegment && parsePublicVerticalSegment(verticalSegment))
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims && !isPublicRoute(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (claims && request.nextUrl.pathname === "/login") {
    const nextPath = request.nextUrl.searchParams.get("next") || "/";
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return supabaseResponse;
}
