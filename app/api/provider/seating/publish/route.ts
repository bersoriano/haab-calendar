import { NextResponse, type NextRequest } from "next/server";

import { invitationErrorResponse, NO_STORE, readJson, resolveInvitationOwner } from "@/lib/supabase/invitation-owner";
import { setSeatingPublished } from "@/lib/supabase/seating";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Shows or hides every household its table: `{ published }`. */
export async function POST(request: NextRequest) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const body = (await readJson(request)) as { published?: unknown } | null;
    if (typeof body?.published !== "boolean") {
      return NextResponse.json({ userMessage: "Say whether to publish the seating." }, { status: 400, headers: NO_STORE });
    }
    const state = await setSeatingPublished(owner.supabase, owner.providerId, body.published);
    return NextResponse.json(state, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "seating_publish_failed", "Could not change the seating.");
  }
}
