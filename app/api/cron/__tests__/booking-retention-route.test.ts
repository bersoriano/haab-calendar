import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn(), deposits: vi.fn() }));
vi.mock("@/lib/booking-retention/worker", () => ({ runBookingRetentionWorker: mocks.run }));
vi.mock("@/lib/bank-deposit-retention", () => ({ runDepositRetentionWorker: mocks.deposits }));
import { GET } from "@/app/api/cron/booking-retention/route";

const request = (secret?: string) => new Request("http://localhost/api/cron/booking-retention", { headers: secret ? { authorization: `Bearer ${secret}` } : {} });

describe("booking retention cron authorization", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-retention-secret";
    mocks.run.mockReset().mockResolvedValue({ deletedBookings: 4, hasMore: false });
    mocks.deposits.mockReset().mockResolvedValue({ notified: 2, deleted: 1, hasMore: false, abandoned: 0, stagedRemoved: 0, staleUploadsRemoved: 0, expiredCorrections: 0 });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { delete process.env.CRON_SECRET; vi.restoreAllMocks(); });

  it("fails closed when cleanup is unconfigured", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(request("test-retention-secret"))).status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
    expect(mocks.deposits).not.toHaveBeenCalled();
  });
  it.each([undefined, "wrong-secret"])("rejects missing or wrong credential: %s", async (secret) => {
    expect((await GET(request(secret))).status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
    expect(mocks.deposits).not.toHaveBeenCalled();
  });
  it("returns cleanup counters on success", async () => {
    const response = await GET(request("test-retention-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deletedBookings: 4, hasMore: false,
      deposits: { notified: 2, deleted: 1, hasMore: false, abandoned: 0, stagedRemoved: 0, staleUploadsRemoved: 0, expiredCorrections: 0 } });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("continues the scheduled drain while receipt cleanup has more work", async () => {
    mocks.deposits.mockResolvedValueOnce({ notified: 0, deleted: 100, hasMore: true,
      abandoned: 0, stagedRemoved: 0, staleUploadsRemoved: 0, expiredCorrections: 0 });
    const response = await GET(request("test-retention-secret"));
    expect((await response.json()).hasMore).toBe(true);
  });
  it("reports failure without exposing database error details", async () => {
    mocks.run.mockRejectedValue(new Error("Secret customer email in database error"));
    const response = await GET(request("test-retention-secret"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ userMessage: "Could not clean up expired bookings." });
  });
});
