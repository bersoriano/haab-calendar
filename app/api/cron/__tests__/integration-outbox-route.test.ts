import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runIntegrationOutboxWorker: vi.fn(),
  runGoogleReconciliationWorker: vi.fn(),
  runGoogleRevocationWorker: vi.fn(),
  runGoogleWebhookWorker: vi.fn(),
  runGoogleInboundApplyWorker: vi.fn(),
  runGoogleConflictRepairWorker: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/integrations/outbox/worker", () => ({
  runIntegrationOutboxWorker: mocks.runIntegrationOutboxWorker,
}));

vi.mock("@/lib/google/reconcile", () => ({
  runGoogleReconciliationWorker: mocks.runGoogleReconciliationWorker,
}));

vi.mock("@/lib/google/connections", () => ({
  runGoogleRevocationWorker: mocks.runGoogleRevocationWorker,
}));

vi.mock("@/lib/google/webhook-worker", () => ({
  runGoogleWebhookWorker: mocks.runGoogleWebhookWorker,
}));

vi.mock("@/lib/google/apply-inbound", () => ({
  runGoogleInboundApplyWorker: mocks.runGoogleInboundApplyWorker,
}));

vi.mock("@/lib/google/repair", () => ({
  runGoogleConflictRepairWorker: mocks.runGoogleConflictRepairWorker,
}));

import { GET } from "@/app/api/cron/integration-outbox/route";
import { GET as GET_GOOGLE } from "@/app/api/cron/google-workers/route";
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

describe("GET /api/cron/google-workers", () => {
  beforeEach(() => {
    mocks.runGoogleReconciliationWorker.mockReset();
    mocks.runGoogleRevocationWorker.mockReset();
    mocks.runGoogleWebhookWorker.mockReset();
    mocks.runGoogleInboundApplyWorker.mockReset();
    mocks.runGoogleConflictRepairWorker.mockReset();
    mocks.runGoogleWebhookWorker.mockResolvedValue({
      claimed: false,
      dispatched: null,
      reason: null,
    });
    mocks.runGoogleInboundApplyWorker.mockResolvedValue({
      claimed: false,
      outcome: null,
      conflictType: null,
    });
    mocks.runGoogleConflictRepairWorker.mockResolvedValue({
      claimed: false,
      repaired: false,
      reason: null,
    });
    mocks.runGoogleReconciliationWorker.mockResolvedValue({
      claimed: true,
      completed: false,
      considered: 50,
      written: 50,
      skipped: 0,
      failed: 0,
    });
    mocks.runGoogleRevocationWorker.mockResolvedValue({ claimed: false, revoked: false });
    process.env.CRON_SECRET = SECRET;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  function googleRequest(headers: Record<string, string> = {}) {
    return new Request("http://localhost/api/cron/google-workers", {
      headers,
    }) as unknown as NextRequest;
  }

  it("fails closed when no secret is configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET_GOOGLE(googleRequest({ authorization: `Bearer ${SECRET}` }));

    expect(response.status).toBe(401);
    expect(mocks.runGoogleReconciliationWorker).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized caller without running anything", async () => {
    const missing = await GET_GOOGLE(googleRequest());
    const wrong = await GET_GOOGLE(googleRequest({ authorization: "Bearer nope" }));

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(mocks.runGoogleReconciliationWorker).not.toHaveBeenCalled();
    expect(mocks.runGoogleRevocationWorker).not.toHaveBeenCalled();
  });

  it("runs a bounded batch for the correct secret", async () => {
    const response = await GET_GOOGLE(googleRequest({ authorization: `Bearer ${SECRET}` }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reconciliation: { claimed: true, completed: false, written: 50 },
      revocation: { claimed: false },
    });
    // One claim each per invocation; the schedule drains a backlog, not the
    // request.
    expect(mocks.runGoogleReconciliationWorker).toHaveBeenCalledTimes(1);
    expect(mocks.runGoogleRevocationWorker).toHaveBeenCalledTimes(1);
  });

  it("runs revocation even when reconciliation had nothing to do", async () => {
    mocks.runGoogleReconciliationWorker.mockResolvedValue({
      claimed: false,
      completed: false,
      considered: 0,
      written: 0,
      skipped: 0,
      failed: 0,
    });

    await GET_GOOGLE(googleRequest({ authorization: `Bearer ${SECRET}` }));

    // A provider waiting for their grant to be revoked must not queue behind a
    // calendar backfill.
    expect(mocks.runGoogleRevocationWorker).toHaveBeenCalledTimes(1);
  });

  it("answers a generic 500 when a worker fails", async () => {
    mocks.runGoogleReconciliationWorker.mockRejectedValue(
      new Error('relation "provider_google_reconciliation_jobs" does not exist'),
    );

    const response = await GET_GOOGLE(googleRequest({ authorization: `Bearer ${SECRET}` }));
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(body).not.toContain("relation");
  });
});
