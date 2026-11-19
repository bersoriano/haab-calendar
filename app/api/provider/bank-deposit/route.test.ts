import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  provider: vi.fn(),
  currentAccount: vi.fn(),
  activeService: vi.fn(),
  upsertAccount: vi.fn(),
  updateService: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      if (table === "providers") return {
        select: () => ({ eq: () => ({ maybeSingle: mocks.provider }) }),
      };
      if (table === "business_bank_accounts") return {
        select: () => ({ eq: () => ({ maybeSingle: mocks.currentAccount }) }),
        upsert: (payload: unknown) => ({ select: () => ({ single: () => mocks.upsertAccount(payload) }) }),
      };
      if (table === "services") return {
        select: () => ({ eq: () => ({ eq: () => ({ limit: mocks.activeService }) }) }),
        update: (payload: unknown) => ({
          eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: () => mocks.updateService(payload) }) }) }),
        }),
      };
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { PATCH, PUT } from "@/app/api/provider/bank-deposit/route";

const account = {
  enabled: true,
  bankName: " Example Bank ",
  accountHolder: "Deposit Studio",
  countryCode: "MX",
  currencyCode: "MXN",
  accountNumber: "123456789",
  clabe: "",
  iban: "",
  swiftBic: "",
  routingCode: "",
  instructionsEn: "Use reference",
  instructionsEs: "Use referencia",
};

function request(body: unknown) {
  return new Request("https://haab.example/api/provider/bank-deposit", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function patchRequest(body: unknown) {
  return new Request("https://haab.example/api/provider/bank-deposit", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("PUT /api/provider/bank-deposit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.provider.mockResolvedValue({ data: { id: "provider-1", vertical: "spaces", rsvp_mode: "open" }, error: null });
    mocks.currentAccount.mockResolvedValue({ data: null, error: null });
    mocks.activeService.mockResolvedValue({ data: [], error: null });
    mocks.upsertAccount.mockImplementation(async (payload) => ({ data: payload, error: null }));
    mocks.updateService.mockImplementation(async (payload) => ({ data: { id: "service-1", ...payload }, error: null }));
  });

  it("rejects unauthenticated writes", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await PUT(request(account));
    expect(response.status).toBe(401);
    expect(mocks.upsertAccount).not.toHaveBeenCalled();
  });

  it("rejects account without payable identifier", async () => {
    const response = await PUT(request({ ...account, accountNumber: "" }));
    expect(response.status).toBe(400);
    expect(mocks.upsertAccount).not.toHaveBeenCalled();
  });

  it("rejects bank deposits for restaurant businesses", async () => {
    mocks.provider.mockResolvedValue({ data: { id: "provider-1", vertical: "restaurant", rsvp_mode: "open" }, error: null });
    const response = await PUT(request(account));
    expect(response.status).toBe(403);
    expect(mocks.upsertAccount).not.toHaveBeenCalled();
  });

  it("stores account only for signed-in owner's provider", async () => {
    const response = await PUT(request(account));
    expect(response.status).toBe(200);
    expect(mocks.upsertAccount).toHaveBeenCalledWith(expect.objectContaining({
      provider_id: "provider-1",
      bank_name: "Example Bank",
      currency_code: "MXN",
    }));
  });

  it("blocks disabling bank details while a service requires deposits", async () => {
    mocks.currentAccount.mockResolvedValue({ data: { currency_code: "MXN" }, error: null });
    mocks.activeService.mockResolvedValue({ data: [{ id: "service-1" }], error: null });
    const response = await PUT(request({ ...account, enabled: false }));
    expect(response.status).toBe(409);
    expect(mocks.upsertAccount).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/provider/bank-deposit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.provider.mockResolvedValue({ data: { id: "provider-1", vertical: "spaces", rsvp_mode: "open" }, error: null });
    mocks.currentAccount.mockResolvedValue({ data: { enabled: true, currency_code: "MXN" }, error: null });
    mocks.updateService.mockImplementation(async (payload) => ({ data: { id: "service-1", ...payload }, error: null }));
  });

  it("requires enabled bank details before charging for a service", async () => {
    mocks.currentAccount.mockResolvedValue({ data: null, error: null });
    const response = await PATCH(patchRequest({ serviceId: "service-1", enabled: true, amount: "1250.50" }));
    expect(response.status).toBe(409);
    expect(mocks.updateService).not.toHaveBeenCalled();
  });

  it("rejects non-numeric display price", async () => {
    const response = await PATCH(patchRequest({ serviceId: "service-1", enabled: true, amount: "$1,250" }));
    expect(response.status).toBe(400);
    expect(mocks.updateService).not.toHaveBeenCalled();
  });

  it("stores exact price and account currency for owned service", async () => {
    const response = await PATCH(patchRequest({ serviceId: "service-1", enabled: true, amount: "1250.50" }));
    expect(response.status).toBe(200);
    expect(mocks.updateService).toHaveBeenCalledWith({
      deposit_required: true,
      deposit_amount_minor: 125050,
      deposit_currency_code: "MXN",
    });
  });

  it("disables deposits without deleting the service", async () => {
    const response = await PATCH(patchRequest({ serviceId: "service-1", enabled: false }));
    expect(response.status).toBe(200);
    expect(mocks.updateService).toHaveBeenCalledWith({ deposit_required: false });
  });
});
