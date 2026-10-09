import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyStore } from "@/lib/store";
import type { ModuleStore } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  persist: vi.fn(),
  reload: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/provider-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/provider-store")>();
  return { ...actual, persistProviderStore: mocks.persist };
});
vi.mock("@/lib/supabase/bookings", () => ({ getProviderDashboardStore: mocks.reload }));

const { switchProviderBusinessType } = await import("@/lib/supabase/business-type-switch");
const { ProviderStoreWriteError } = await import("@/lib/supabase/provider-store");

function draft(): ModuleStore {
  const store = createEmptyStore();
  return {
    ...store,
    vertical: "healthcare",
    setupComplete: false,
    provider: { ...store.provider, fullName: "Ana", businessName: "Acme", email: "a@b.c" },
    services: [
      {
        id: "local-1",
        name: "Annual check-up",
        description: "A yearly visit.",
        bookingType: "appointment",
        durationMinutes: 45,
      } as ModuleStore["services"][number],
    ],
  };
}

function supabaseWith(rpcResult: { error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue({ data: "provider-1", ...rpcResult });
  return { client: { rpc } as never, rpc };
}

describe("switchProviderBusinessType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.persist.mockResolvedValue({ ...draft(), setupComplete: true });
    mocks.reload.mockResolvedValue({ ...draft(), setupComplete: true });
  });

  it("swaps through the database function with database-shaped services", async () => {
    const { client, rpc } = supabaseWith({ error: null });

    await switchProviderBusinessType({ supabase: client, ownerUserId: "u1", store: draft() });

    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe("switch_provider_business_type");
    expect(args.p_vertical).toBe("healthcare");
    expect(args.p_services).toHaveLength(1);
    expect(args.p_services[0]).toMatchObject({
      name: "Annual check-up",
      description: "A yearly visit.",
      booking_type: "appointment",
      duration_minutes: 45,
      sort_order: 0,
    });
    expect(args.p_services[0]).not.toHaveProperty("provider_id");
  });

  it("then saves the kept profile as a published page", async () => {
    const { client } = supabaseWith({ error: null });

    const result = await switchProviderBusinessType({ supabase: client, ownerUserId: "u1", store: draft() });

    expect(mocks.persist.mock.calls[0][0].store.setupComplete).toBe(true);
    expect(result.profileWarning).toBeUndefined();
  });

  it.each([
    ["upcoming_bookings", 409],
    ["active_holds", 409],
    ["same_vertical", 400],
    ["no_services", 400],
    ["not_found", 404],
  ])("explains a %s refusal and saves nothing else", async (code, status) => {
    const { client } = supabaseWith({ error: { message: code } });

    const failure = switchProviderBusinessType({ supabase: client, ownerUserId: "u1", store: draft() });

    await expect(failure).rejects.toBeInstanceOf(ProviderStoreWriteError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("rejects a draft with no type before calling the database", async () => {
    const { client, rpc } = supabaseWith({ error: null });

    await expect(
      switchProviderBusinessType({
        supabase: client,
        ownerUserId: "u1",
        store: { ...draft(), vertical: undefined },
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports a profile save that failed after the switch, with the reloaded page", async () => {
    const { client } = supabaseWith({ error: null });
    mocks.persist.mockRejectedValue(new Error("network"));

    const result = await switchProviderBusinessType({ supabase: client, ownerUserId: "u1", store: draft() });

    expect(result.store).toBeTruthy();
    expect(result.profileWarning).toMatch(/Settings/);
  });
});
