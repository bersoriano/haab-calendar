import { NextResponse, type NextRequest } from "next/server";

import {
  invitationErrorResponse,
  NO_STORE,
  readJson,
  resolveInvitationOwner,
} from "@/lib/supabase/invitation-owner";
import {
  createInvitations,
  deleteAllInvitations,
  listInvitations,
  MAX_INVITATIONS_PER_REQUEST,
} from "@/lib/supabase/invitations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The signed-in owner's guest list. */
export async function GET() {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const invitations = await listInvitations(owner.supabase, owner.providerId);
    return NextResponse.json({ invitations }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "invitations_list_failed", "Could not load your guest list.");
  }
}

/** Adds one invitation or a pasted list: `{ drafts: InvitationDraft[] }`. */
export async function POST(request: NextRequest) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const body = (await readJson(request)) as { drafts?: unknown } | null;
    if (!body || !Array.isArray(body.drafts) || body.drafts.length === 0) {
      return NextResponse.json({ userMessage: "Add at least one invitation." }, { status: 400, headers: NO_STORE });
    }
    if (body.drafts.length > MAX_INVITATIONS_PER_REQUEST) {
      return NextResponse.json(
        { userMessage: "Add up to 500 invitations at a time." },
        { status: 400, headers: NO_STORE },
      );
    }

    const invitations = await createInvitations(owner.supabase, owner.providerId, body.drafts);
    return NextResponse.json({ invitations }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "invitations_create_failed", "Could not add those invitations.");
  }
}

/** Deletes the whole guest list. Needs `?all=1` and `{ confirm: "DELETE" }`. */
export async function DELETE(request: NextRequest) {
  try {
    const owner = await resolveInvitationOwner();
    if (!owner.ok) return owner.response;

    const body = (await readJson(request)) as { confirm?: unknown } | null;
    if (request.nextUrl.searchParams.get("all") !== "1" || body?.confirm !== "DELETE") {
      return NextResponse.json(
        { userMessage: "Confirm that you want to delete the whole guest list." },
        { status: 400, headers: NO_STORE },
      );
    }

    const deleted = await deleteAllInvitations(owner.supabase, owner.providerId);
    return NextResponse.json({ deleted }, { headers: NO_STORE });
  } catch (error) {
    return invitationErrorResponse(error, "invitations_delete_all_failed", "Could not delete your guest list.");
  }
}
