import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createLogger, redact } from "@/lib/observability/logger";

function capture() {
  const lines: string[] = [];
  const logger = createLogger({
    sink: (line) => lines.push(line),
    now: () => new Date("2026-08-16T12:00:00.000Z"),
    environment: "test",
  });

  return { logger, lines, parsed: () => lines.map((line) => JSON.parse(line)) };
}

describe("structured logger", () => {
  it("writes one JSON object per line", () => {
    const { logger, lines, parsed } = capture();

    logger.info("stripe.webhook.processed", { outcome: "processed" });
    logger.info("integration.outbox.run_completed", { claimed: 2 });

    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).not.toContain("\n");
      expect(() => JSON.parse(line)).not.toThrow();
    }
    expect(parsed()[0]).toMatchObject({
      schemaVersion: 1,
      timestamp: "2026-08-16T12:00:00.000Z",
      level: "info",
      event: "stripe.webhook.processed",
      service: "haab-calendar",
      environment: "test",
      outcome: "processed",
    });
  });

  it("distinguishes the three levels", () => {
    const { logger, parsed } = capture();

    logger.info("entitlements.resolved", {});
    logger.warn("stripe.webhook.retry_scheduled", {});
    logger.error("billing.projection.failed", {});

    expect(parsed().map((entry) => entry.level)).toEqual(["info", "warn", "error"]);
  });

  it("omits fields that were not set rather than writing nulls", () => {
    const { logger, parsed } = capture();

    logger.info("stripe.webhook.received", { stripeEventId: undefined, durationMs: 4 });

    expect(parsed()[0]).not.toHaveProperty("stripeEventId");
    expect(parsed()[0].durationMs).toBe(4);
  });

  it("carries bound context onto every record", () => {
    const { logger, parsed } = capture();
    const bound = logger.child({ requestId: "req-1", providerId: "prov-1" });

    bound.info("entitlements.resolved", { featureKey: "custom_slug" });

    expect(parsed()[0]).toMatchObject({
      requestId: "req-1",
      providerId: "prov-1",
      featureKey: "custom_slug",
    });
  });

  it("never lets a logging failure break the caller", () => {
    const logger = createLogger({
      sink: () => {
        throw new Error("stdout is gone");
      },
    });

    expect(() => logger.info("stripe.webhook.received", {})).not.toThrow();
  });

  it("survives a value that cannot be serialised", () => {
    const { logger, parsed } = capture();
    const circular: Record<string, unknown> = { name: "loop" };
    circular.self = circular;

    expect(() =>
      logger.info("stripe.webhook.received", { detail: circular }),
    ).not.toThrow();
    expect(parsed()[0].event).toBe("stripe.webhook.received");
  });

  it("logs an error by code and name, never as a raw Error", () => {
    const { logger, parsed } = capture();

    logger.error("stripe.webhook.failed", {
      error: new TypeError("secret sk_live_123 rejected"),
    });

    const entry = parsed()[0];
    expect(entry.errorName).toBe("TypeError");
    expect(JSON.stringify(entry)).not.toContain("sk_live_123");
    expect(JSON.stringify(entry)).not.toContain("at ");
    expect(entry).not.toHaveProperty("stack");
  });
});

describe("redaction", () => {
  it.each([
    "authorization",
    "cookie",
    "secret",
    "token",
    "password",
    "email",
    "phone",
    "payload",
    "rawBody",
    "clientName",
    "clientEmail",
    "clientPhone",
  ])("redacts %s", (key) => {
    const result = redact({ [key]: "sensitive-value" }) as Record<string, unknown>;

    expect(result[key]).toBe("[REDACTED]");
    expect(JSON.stringify(result)).not.toContain("sensitive-value");
  });

  it("matches on the concept, not the exact key", () => {
    const result = redact({
      stripeSecretKey: "sk_live_1",
      accessToken: "ya29.x",
      customerEmail: "owner@example.invalid",
      manageTokenHash: "abc",
    }) as Record<string, unknown>;

    expect(Object.values(result)).toEqual([
      "[REDACTED]",
      "[REDACTED]",
      "[REDACTED]",
      "[REDACTED]",
    ]);
  });

  it("reaches nested objects and arrays", () => {
    const result = redact({
      provider: { id: "p1", email: "owner@example.invalid" },
      bookings: [{ id: "b1", clientPhone: "+52 55 5555 0101" }],
    });

    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain("owner@example.invalid");
    expect(serialised).not.toContain("5555 0101");
    expect(serialised).toContain("p1");
    expect(serialised).toContain("b1");
  });

  it("leaves operational identifiers alone", () => {
    const result = redact({
      providerId: "prov-1",
      bookingId: "book-1",
      stripeEventId: "evt_1",
      attemptCount: 3,
      outcome: "processed",
    });

    expect(result).toEqual({
      providerId: "prov-1",
      bookingId: "book-1",
      stripeEventId: "evt_1",
      attemptCount: 3,
      outcome: "processed",
    });
  });

  it("does not loop forever on a circular structure", () => {
    const circular: Record<string, unknown> = { token: "t" };
    circular.self = circular;

    expect(() => redact(circular)).not.toThrow();
  });

  it("bounds how deep it will walk", () => {
    let deep: Record<string, unknown> = { email: "owner@example.invalid" };
    for (let index = 0; index < 20; index += 1) {
      deep = { nested: deep };
    }

    const serialised = JSON.stringify(redact(deep));
    expect(serialised).not.toContain("owner@example.invalid");
  });
});
