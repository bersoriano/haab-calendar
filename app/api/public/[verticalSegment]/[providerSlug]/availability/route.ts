import { NextResponse, type NextRequest } from "next/server";

import {
  isPublicUrlBackendUnavailable,
  loadPublicAvailability,
} from "@/lib/public-booking-resolver";
import {
  normalizeUrlSlugSegment,
  parsePublicVerticalSegment,
  validateProviderSlug,
} from "@/lib/public-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * What the public page polls to keep its grid honest.
 *
 * The response carries times only — the loader strips client name, email,
 * phone and notes before anything leaves the server — so a page can show that
 * 20:00 is gone without learning anything about who took it.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ verticalSegment: string; providerSlug: string }> },
) {
  const { verticalSegment, providerSlug } = await context.params;
  const vertical = parsePublicVerticalSegment(verticalSegment);
  const normalizedProviderSlug = normalizeUrlSlugSegment(providerSlug);

  if (!vertical || !validateProviderSlug(normalizedProviderSlug).ok) {
    return NextResponse.json({ userMessage: "This booking link is invalid." }, { status: 400 });
  }

  try {
    const availability = await loadPublicAvailability({
      vertical,
      providerSlug: normalizedProviderSlug,
    });

    if (!availability) {
      return NextResponse.json({ userMessage: "This booking link was not found." }, { status: 404 });
    }

    const response = NextResponse.json(availability);
    // A stale grid is the thing this endpoint exists to prevent.
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (isPublicUrlBackendUnavailable(error)) {
      return NextResponse.json(
        { userMessage: "The booking backend is not configured." },
        { status: 503 },
      );
    }

    console.error("public_availability_poll_failed", {
      providerSlug: normalizedProviderSlug,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not load current availability." },
      { status: 500 },
    );
  }
}
