import { NextResponse, type NextRequest } from "next/server";

import {
  isPublicUrlBackendUnavailable,
  resolvePublicBookingUrl,
} from "@/lib/public-booking-resolver";
import {
  parsePublicLanguage,
  withPublicLanguage,
} from "@/lib/public-language";

export const dynamic = "force-dynamic";

const exampleCandidates = [
  { verticalSegment: "doctors", providerSlug: "dr-maya-rivera" },
  { verticalSegment: "spaces", providerSlug: "riverside-padel-club" },
  { verticalSegment: "professionals", providerSlug: "northstar-strategy" },
  { verticalSegment: "events", providerSlug: "makers-workshop" },
] as const;

function redirectWithoutCaching(location: URL) {
  const response = NextResponse.redirect(location, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const language = parsePublicLanguage(
    request.nextUrl.searchParams.get("lang") ?? undefined,
  );

  for (const candidate of exampleCandidates) {
    try {
      const resolution = await resolvePublicBookingUrl(candidate);

      if (!resolution) {
        continue;
      }

      if (resolution.status === "resolved" && resolution.store.services.length === 0) {
        continue;
      }

      const destination =
        resolution.status === "redirect"
          ? resolution.location
          : resolution.meta.canonicalPath;

      return redirectWithoutCaching(
        new URL(withPublicLanguage(destination, language), request.url),
      );
    } catch (error) {
      if (!isPublicUrlBackendUnavailable(error)) {
        console.error("try_booking_example_lookup_failed", {
          verticalSegment: candidate.verticalSegment,
          providerSlug: candidate.providerSlug,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const fallback = new URL("/", request.url);
  if (language) {
    fallback.searchParams.set("lang", language);
  }
  fallback.hash = "live-examples";

  return redirectWithoutCaching(fallback);
}
