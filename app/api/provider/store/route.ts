import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProviderDashboardStore } from "@/lib/supabase/bookings";
import { resolveDemoEditTarget } from "@/lib/supabase/demo-edit";
import {
  persistProviderStore,
  ProviderStoreWriteError,
} from "@/lib/supabase/provider-store";
import { normalizeStore } from "@/lib/store";
import type { ModuleStore } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderStoreBody = {
  store?: unknown;
};

function describeWriteCause(cause: unknown) {
  if (cause instanceof Error) {
    return cause.message;
  }

  if (cause && typeof cause === "object") {
    const record = cause as Record<string, unknown>;
    return {
      code: typeof record.code === "string" ? record.code : undefined,
      message: typeof record.message === "string" ? record.message : undefined,
      details: typeof record.details === "string" ? record.details : undefined,
      hint: typeof record.hint === "string" ? record.hint : undefined,
    };
  }

  return String(cause);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { userMessage: "Sign in before loading your bookings." },
      { status: 401 },
    );
  }

  // Demo editing swaps the whole read to the example provider, service-role
  // scoped because RLS ties reads and writes to the caller's own rows.
  const demoTarget = await resolveDemoEditTarget();
  const storeClient = demoTarget?.admin ?? supabase;
  const storeUserId = demoTarget?.ownerUserId ?? user.id;

  try {
    const store = await getProviderDashboardStore(storeClient, storeUserId);

    if (!store) {
      return NextResponse.json(
        { userMessage: "Finish setting up your booking page first." },
        { status: 404 },
      );
    }

    return NextResponse.json({ store });
  } catch (error) {
    console.error("provider_store_load_failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not refresh your bookings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { userMessage: "Sign in before saving your booking page." },
      { status: 401 },
    );
  }

  let body: ProviderStoreBody;
  try {
    body = (await request.json()) as ProviderStoreBody;
  } catch {
    return NextResponse.json(
      { userMessage: "Invalid booking setup request." },
      { status: 400 },
    );
  }

  const demoTarget = await resolveDemoEditTarget();
  const storeClient = demoTarget?.admin ?? supabase;
  const storeUserId = demoTarget?.ownerUserId ?? user.id;
  const storeOwnerEmail = demoTarget
    ? demoTarget.page.ownerEmail
    : (user.email ?? undefined);

  try {
    const store = normalizeStore(body.store as ModuleStore);
    const persistedStore = await persistProviderStore({
      supabase: storeClient,
      ownerUserId: storeUserId,
      ownerEmail: storeOwnerEmail,
      store,
    });

    return NextResponse.json({ store: persistedStore });
  } catch (error) {
    if (error instanceof ProviderStoreWriteError) {
      if (error.status >= 500) {
        console.error(
          "provider_store_save_failed",
          JSON.stringify({
            userId: user.id,
            error: describeWriteCause(error.cause ?? error),
          }),
        );
      }

      return NextResponse.json(
        { userMessage: error.userMessage },
        { status: error.status },
      );
    }

    console.error("provider_store_save_failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not save your booking page." },
      { status: 500 },
    );
  }
}
