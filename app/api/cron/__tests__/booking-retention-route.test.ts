import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/booking-retention/worker", () => ({ runBookingRetentionWorker: mocks.run }));
import { GET } from "@/app/api/cron/booking-retention/route";

const request = (secret?: string) => new Request("http://localhost/api/cron/booking-retention", { headers: secret ? { authorization: `Bearer ${secret}` } : {} });

describe("booking retention cron authorization", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-retention-secret";
    mocks.run.mockReset().mockResolvedValue({ deletedBookings: 4, hasMore: false });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { delete process.env.CRON_SECRET; vi.restoreAllMocks(); });

  it("fails closed when cleanup is unconfigured", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(request("test-retention-secret"))).status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it.each([undefined, "wrong-secret"])("rejects missing or wrong credential: %s", async (secret) => {
    expect((await GET(request(secret))).status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("returns cleanup counters on success", async () => {
    const response = await GET(request("test-retention-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deletedBookings: 4, hasMore: false });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("reports failure without exposing database error details", async () => {
    mocks.run.mockRejectedValue(new Error("Secret customer email in database error"));
    const response = await GET(request("test-retention-secret"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ userMessage: "Could not clean up expired bookings." });
  });
});
