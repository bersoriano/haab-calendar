import { NextResponse, type NextRequest } from "next/server";

import { describeError } from "@/lib/describe-error";
import { normalizeUrlSlugSegment, parsePublicVerticalSegment, validateProviderSlug } from "@/lib/public-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicInvitation, InvitationWriteError, submitPublicRsvp } from "@/lib/supabase/invitations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
// One answer for every way a link can be wrong, so a guess learns nothing.
const NOT_VALID = { userMessage: "This invitation link is not valid." };

type Context = { params: Promise<{ verticalSegment: string; providerSlug: string; token: string }> };

async function readRoute(context: Context) {
  const params = await context.params;
  const vertical = parsePublicVerticalSegment(params.verticalSegment);
  const providerSlug = normalizeUrlSlugSegment(params.providerSlug);
  const token = params.token?.trim() ?? "";

  if (!vertical || !validateProviderSlug(providerSlug).ok || !token) return null;
  return { vertical, providerSlug, token };
}

export async function GET(_request: NextRequest, context: Context) {
  const route = await readRoute(context);
  if (!route) return NextResponse.json(NOT_VALID, { status: 404, headers: NO_STORE });

  try {
    const found = await getPublicInvitation(createAdminClient(), route);
    if (!found) return NextResponse.json(NOT_VALID, { status: 404, headers: NO_STORE });
    return NextResponse.json({ invitation: found.invitation }, { headers: NO_STORE });
  } catch (error) {
    console.error("public_invitation_read_failed", { error: describeError(error) });
    return NextResponse.json({ userMessage: "Could not load this invitation." }, { status: 500, headers: NO_STORE });
  }
}

/** A household's answer. Replaces the previous one. */
export async function POST(request: NextRequest, context: Context) {
  const route = await readRoute(context);
  if (!route) return NextResponse.json(NOT_VALID, { status: 404, headers: NO_STORE });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { userMessage: "We could not read your answer. Reload the page and try again." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const invitation = await submitPublicRsvp(createAdminClient(), route, body);
    return NextResponse.json({ invitation }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof InvitationWriteError && error.status === 404) {
      return NextResponse.json(NOT_VALID, { status: 404, headers: NO_STORE });
    }
    if (error instanceof InvitationWriteError && error.status < 500) {
      return NextResponse.json({ userMessage: error.userMessage }, { status: error.status, headers: NO_STORE });
    }
    console.error("public_invitation_submit_failed", { error: describeError(error) });
    return NextResponse.json({ userMessage: "Could not save your answer." }, { status: 500, headers: NO_STORE });
  }
}
