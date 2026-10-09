import { NextResponse, type NextRequest } from "next/server";

import { switchProviderBusinessType } from "@/lib/supabase/business-type-switch";
import { resolveDemoEditTarget } from "@/lib/supabase/demo-edit";
import { ProviderStoreWriteError } from "@/lib/supabase/provider-store";
import { createClient } from "@/lib/supabase/server";
import type { ModuleStore } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Publishes a business-type draft over the caller's live page. Everything the
 * switch replaces changes in one database transaction; see
 * lib/supabase/business-type-switch.ts.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { userMessage: "Sign in before changing your business type." },
      { status: 401 },
    );
  }

  // Demo pages back fixed links on the landing page, and demo editing writes
  // with the service role, which has no owner to switch on behalf of.
  if (await resolveDemoEditTarget()) {
    return NextResponse.json(
      { userMessage: "Demo pages keep their business type." },
      { status: 403 },
    );
  }

  let body: { store?: unknown };
  try {
    body = (await request.json()) as { store?: unknown };
  } catch {
    return NextResponse.json(
      { userMessage: "Invalid business type request." },
      { status: 400 },
    );
  }

  try {
    const result = await switchProviderBusinessType({
      supabase,
      ownerUserId: user.id,
      ownerEmail: user.email ?? undefined,
      store: body.store as ModuleStore,
    });

    return NextResponse.json(
      result.profileWarning
        ? { store: result.store, userMessage: result.profileWarning }
        : { store: result.store },
    );
  } catch (error) {
    if (error instanceof ProviderStoreWriteError) {
      if (error.status >= 500) {
        console.error("business_type_switch_failed", {
          userId: user.id,
          error: error.message,
        });
      }

      return NextResponse.json({ userMessage: error.userMessage }, { status: error.status });
    }

    console.error("business_type_switch_failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not change your business type." },
      { status: 500 },
    );
  }
}
