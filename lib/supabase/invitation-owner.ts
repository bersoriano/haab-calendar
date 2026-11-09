import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { describeError } from "@/lib/describe-error";
import { InvitationWriteError } from "@/lib/supabase/invitations";
import { getOwnerProvider } from "@/lib/supabase/provider-clients";
import { createClient } from "@/lib/supabase/server";

export const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The signed-in owner and their page, for the guest-list routes. The page is
 * found from the session, never from the request.
 */
export async function resolveInvitationOwner(): Promise<
  { ok: true; supabase: SupabaseClient; providerId: string } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ userMessage: "Sign in to manage your guest list." }, { status: 401 }),
    };
  }

  const provider = await getOwnerProvider(supabase, user.id);
  if (!provider) {
    return {
      ok: false,
      response: NextResponse.json({ userMessage: "Booking profile not found." }, { status: 404 }),
    };
  }

  return { ok: true, supabase, providerId: provider.id };
}

/** A write's failure as the planner should read it; anything unexpected is logged. */
export function invitationErrorResponse(error: unknown, logKey: string, fallback: string) {
  if (error instanceof InvitationWriteError && error.status < 500) {
    return NextResponse.json({ userMessage: error.userMessage }, { status: error.status, headers: NO_STORE });
  }

  console.error(logKey, { error: describeError(error) });
  return NextResponse.json({ userMessage: fallback }, { status: 500, headers: NO_STORE });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
