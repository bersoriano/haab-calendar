import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runIntegrationOutboxWorker: vi.fn(),
}));

vi.mock("@/lib/integrations/outbox/worker", () => ({
  runIntegrationOutboxWorker: mocks.runIntegrationOutboxWorker,
}));

import { GET } from "@/app/api/cron/integration-outbox/route";
import { OutboxInfrastructureError } from "@/lib/integrations/outbox/errors";

const SECRET = "test-cron-secret";

const SUMMARY = {
  claimed: 3,
  succeeded: 1,
  skipped: 1,
  retried: 1,
  deadLettered: 0,
  leaseConflicts: 0,
};

function request(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/integration-outbox", {
    headers,
  }) as unknown as NextRequest;
}

describe("GET /api/cron/integration-outbox", () => {
  beforeEach(() => {
    mocks.runIntegrationOutboxWorker.mockReset();
    mocks.runIntegrationOutboxWorker.mockResolvedValue(SUMMARY);
    process.env.CRON_SECRET = SECRET;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.restoreAllMocks();
  });

  it("fails closed when no secret is configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request({ authorization: `Bearer ${SECRET}` }));

    expect(response.status).toBe(401);
    expect(mocks.runIntegrationOutboxWorker).not.toHaveBeenCalled();
  });

  it("rejects a request with no Authorization header", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(mocks.runIntegrationOutboxWorker).not.toHaveBeenCalled();
  });

  it("rejects the wrong secret", async () => {
    const response = await GET(request({ authorization: "Bearer nope" }));

    expect(response.status).toBe(401);
    expect(mocks.runIntegrationOutboxWorker).not.toHaveBeenCalled();
  });

  it("does not accept the secret from the query string", async () => {
    const response = await GET(
      new Request(
        `http://localhost/api/cron/integration-outbox?secret=${SECRET}`,
      ) as unknown as NextRequest,
    );

    expect(response.status).toBe(401);
    expect(mocks.runIntegrationOutboxWorker).not.toHaveBeenCalled();
  });

  it("runs the worker for a correct bearer secret and returns counts only", async () => {
    const response = await GET(request({ authorization: `Bearer ${SECRET}` }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(SUMMARY);
    expect(mocks.runIntegrationOutboxWorker).toHaveBeenCalledTimes(1);
  });

  it("still answers 200 when deliveries failed but their outcomes were recorded", async () => {
    mocks.runIntegrationOutboxWorker.mockResolvedValue({
      ...SUMMARY,
      succeeded: 0,
      retried: 2,
      deadLettered: 1,
    });

    const response = await GET(request({ authorization: `Bearer ${SECRET}` }));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { deadLettered: number };
    expect(body.deadLettered).toBe(1);
  });

  it("answers a generic 500 when the outbox itself is unreachable", async () => {
    mocks.runIntegrationOutboxWorker.mockRejectedValue(
      new OutboxInfrastructureError("Could not claim outbox events."),
    );

    const response = await GET(request({ authorization: `Bearer ${SECRET}` }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      userMessage: "Could not run the integration outbox.",
    });
  });

  it("leaks neither payload nor stack on an unexpected failure", async () => {
    mocks.runIntegrationOutboxWorker.mockRejectedValue(
      new Error('relation "integration_outbox_events" does not exist'),
    );

    const response = await GET(request({ authorization: `Bearer ${SECRET}` }));

    const body = JSON.stringify(await response.json());
    expect(response.status).toBe(500);
    expect(body).not.toContain("relation");
    expect(body).not.toContain("at ");
  });
});
