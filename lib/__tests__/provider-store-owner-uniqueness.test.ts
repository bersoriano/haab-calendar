import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createDefaultAvailability, createEmptyStore } from "@/lib/store";
import type { ModuleStore } from "@/lib/types";

vi.mock("server-only", () => ({}));

import { persistProviderStore, ProviderStoreWriteError } from "@/lib/supabase/provider-store";

const OWNER = "00000000-0000-4000-8000-000000000002";
const PROVIDER_ID = "00000000-0000-4000-8000-000000000001";

function makeStore(): ModuleStore {
  return {
    ...createEmptyStore(),
    provider: {
      fullName: "Dr. Maya Rivera",
      businessName: "Rivera Family Medicine",
      email: "maya@example.com",
      phoneNumber1: "",
      phoneNumber2: "",
      address1: "",
      address2: "",
      publicSlug: "provider-selected-slug",
      language: "en",
      timezone: "America/New_York",
    },
    services: [
      {
        id: "local-service",
        name: "Consultation",
        slug: "consultation",
        bookingType: "appointment",
        durationMinutes: 30,
        description: "Initial consultation",
      },
    ],
    availability: createDefaultAvailability(),
    setupComplete: true,
    vertical: "healthcare",
  };
}

type PostgrestError = { code?: string; message: string };

/**
 * A provider table that can be told how to behave, so the race can be played
 * out deterministically: the lookup answers from `ownerRows`, and the insert
 * can be made to fail the way Postgres will once owner_user_id is unique.
 */
function makeSupabase(options: {
  /** Rows the owner lookup finds, in call order. Last value repeats. */
  lookupResults: Array<{ id: string } | null>;
  lookupError?: PostgrestError;
  insertError?: PostgrestError;
}) {
  const providerInserts: Array<Record<string, unknown>> = [];
  const providerUpdates: Array<Record<string, unknown>> = [];
  let lookupCall = 0;

  // After a successful insert *or* a recovery update, the row exists — which is
  // what the reload should then find.
  let providerExists = Boolean(options.lookupResults[0]);

  const providerLookup = () => {
    const index = Math.min(lookupCall, options.lookupResults.length - 1);
    lookupCall += 1;
    return options.lookupResults[index] ?? null;
  };

  // persistProviderStore reloads the whole store once the write lands. That
  // read asks for every column; the ownership lookup asks only for the id, so
  // the two are told apart by what they select.
  const fullProviderRow = () => ({
    id: PROVIDER_ID,
    owner_user_id: OWNER,
    full_name: "Dr. Maya Rivera",
    business_name: "Rivera Family Medicine",
    email: "maya@example.com",
    slug: "rivera-family-medicine",
    vertical: "healthcare",
    language: "en",
    dashboard_language: null,
    public_theme: "default",
    timezone: "America/New_York",
    booking_window_days: 60,
    availability: createDefaultAvailability(),
    setup_complete: true,
    phone_number_1: "",
    phone_number_2: "",
    address_1: "",
    address_2: "",
    logo_image_url: null,
    header_image_url: null,
    hero_text: null,
    gallery_image_urls: [],
  });

  function providerSelect(columns: string) {
    const query = {
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      returns: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (options.lookupError) {
          return { data: null, error: options.lookupError };
        }

        if (columns !== "id") {
          return { data: providerExists ? fullProviderRow() : null, error: null };
        }

        return { data: providerLookup(), error: null };
      }),
    };
    return query;
  }

  function mutationResult(id: string, error?: PostgrestError) {
    const query = {
      eq: vi.fn(() => query),
      select: vi.fn(() => query),
      single: vi.fn(async () =>
        error ? { data: null, error } : { data: { id }, error: null },
      ),
    };
    return query;
  }

  const emptyList = () => {
    const query = {
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      returns: vi.fn(async () => ({ data: [], error: null })),
    };
    return query;
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === "providers") {
        return {
          select: vi.fn((columns: string) => providerSelect(columns)),
          insert: vi.fn((payload: Record<string, unknown>) => {
            providerInserts.push(payload);
            if (!options.insertError) providerExists = true;
            return mutationResult(PROVIDER_ID, options.insertError);
          }),
          update: vi.fn((payload: Record<string, unknown>) => {
            providerUpdates.push(payload);
            providerExists = true;
            return mutationResult(PROVIDER_ID);
          }),
        };
      }

      if (table === "services") {
        return {
          select: vi.fn(() => emptyList()),
          insert: vi.fn(() => mutationResult("00000000-0000-4000-8000-000000000003")),
        };
      }

      if (table === "bookings") {
        return { select: vi.fn(() => emptyList()) };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { client: client as unknown as SupabaseClient, providerInserts, providerUpdates };
}

const persist = (client: SupabaseClient) =>
  persistProviderStore({ supabase: client, ownerUserId: OWNER, store: makeStore() });

describe("one provider per owner", () => {
  it("updates the owner's provider and never inserts a second", async () => {
    const supabase = makeSupabase({ lookupResults: [{ id: PROVIDER_ID }] });

    await persist(supabase.client);

    expect(supabase.providerInserts).toHaveLength(0);
    expect(supabase.providerUpdates).toHaveLength(1);
  });

  it("inserts exactly once for an owner who has no provider", async () => {
    const supabase = makeSupabase({ lookupResults: [null] });

    const persisted = await persist(supabase.client);

    expect(supabase.providerInserts).toHaveLength(1);
    expect(supabase.providerUpdates).toHaveLength(0);
    expect(persisted).toBeTruthy();
  });

  it("recovers when a concurrent setup won the insert", async () => {
    // Both requests saw no provider; the other one inserted first, so this
    // insert trips the unique constraint. The row now exists and is this
    // owner's, so the work continues against it instead of failing.
    const supabase = makeSupabase({
      lookupResults: [null, { id: PROVIDER_ID }],
      insertError: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    const persisted = await persist(supabase.client);

    expect(supabase.providerInserts).toHaveLength(1);
    expect(supabase.providerUpdates).toHaveLength(1);
    expect(persisted).toBeTruthy();
  });

  it("propagates a unique violation that is not the owner race", async () => {
    // A slug collision, say. Re-reading finds no provider for this owner, so
    // there is nothing to recover onto and the original failure stands.
    const supabase = makeSupabase({
      lookupResults: [null, null],
      insertError: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    await expect(persist(supabase.client)).rejects.toBeInstanceOf(ProviderStoreWriteError);
    expect(supabase.providerUpdates).toHaveLength(0);
  });

  it("treats a failed lookup as a persistence error and writes nothing", async () => {
    const supabase = makeSupabase({
      lookupResults: [null],
      lookupError: { code: "500", message: "connection reset" },
    });

    await expect(persist(supabase.client)).rejects.toBeInstanceOf(ProviderStoreWriteError);
    expect(supabase.providerInserts).toHaveLength(0);
    expect(supabase.providerUpdates).toHaveLength(0);
  });

  it("keeps owner and premium fields out of the update payload", async () => {
    const supabase = makeSupabase({ lookupResults: [{ id: PROVIDER_ID }] });

    await persist(supabase.client);

    const [update] = supabase.providerUpdates;
    for (const field of ["owner_user_id", "plan_tier", "custom_slug", "slug"]) {
      expect(update).not.toHaveProperty(field);
    }
  });

  it("sets the owner on insert but never a premium field", async () => {
    const supabase = makeSupabase({ lookupResults: [null] });

    await persist(supabase.client);

    const [insert] = supabase.providerInserts;
    expect(insert).toHaveProperty("owner_user_id", OWNER);
    for (const field of ["plan_tier", "custom_slug", "slug"]) {
      expect(insert).not.toHaveProperty(field);
    }
  });
});
