import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
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

  try {
    const store = normalizeStore(body.store as ModuleStore);
    const persistedStore = await persistProviderStore({
      supabase,
      ownerUserId: user.id,
      ownerEmail: user.email ?? undefined,
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
