import { describe, expect, it, vi } from "vitest";

import {
  REQUEST_ID_HEADER,
  resolveRequestId,
  withRequestId,
} from "@/lib/observability/context";
import { debugDetail, toSafeError } from "@/lib/observability/errors";
import { currentTraceId, withSpan } from "@/lib/observability/tracing";

function headers(value?: string) {
  // A hand-rolled Headers-alike, because a real Headers refuses to hold a value
  // containing a newline — which is itself worth knowing: the platform blocks
  // the crudest injection before this code sees it, and the pattern check here
  // is the second line of defence.
  return {
    get: (name: string) =>
      name === REQUEST_ID_HEADER && value !== undefined ? value : null,
  } as unknown as Headers;
}

describe("resolveRequestId", () => {
  it("accepts a well-formed id the caller supplied", () => {
    expect(resolveRequestId(headers("req-abc-123456"))).toBe("req-abc-123456");
  });

  it("generates one when the header is absent", () => {
    const id = resolveRequestId(headers());

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates one when there are no headers at all", () => {
    expect(resolveRequestId(undefined)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each([
    ["too short", "abc"],
    ["too long", "a".repeat(200)],
    ["markup", "<script>alert(1)</script>"],
    ["newline", "req-1\nInjected: header"],
    ["spaces", "req 1 2 3 4 5"],
  ])("refuses a %s id and generates its own", (_label, value) => {
    const id = resolveRequestId(headers(value));

    // A request id ends up in log lines, so an id containing a newline could
    // forge a second record.
    expect(id).not.toBe(value);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("trims surrounding whitespace before judging", () => {
    expect(resolveRequestId(headers("  req-abc-123456  "))).toBe("req-abc-123456");
  });
});

describe("withRequestId", () => {
  it("echoes the id back on the response", () => {
    const response = withRequestId(new Response("{}"), "req-abc-123456");

    expect(response.headers.get(REQUEST_ID_HEADER)).toBe("req-abc-123456");
  });
});

describe("toSafeError", () => {
  it("keeps the name and a stable code, and nothing else", () => {
    const error = Object.assign(new TypeError("sk_live_secret rejected"), {
      code: "card_declined",
    });

    expect(toSafeError(error)).toEqual({ name: "TypeError", code: "card_declined" });
  });

  it("falls back to a stable code when the error has none", () => {
    expect(toSafeError(new Error("boom"))).toEqual({
      name: "Error",
      code: "unknown_error",
    });
  });

  it("carries a retryable flag when one was set", () => {
    const error = Object.assign(new Error("timeout"), {
      code: "timeout",
      retryable: true,
    });

    expect(toSafeError(error).retryable).toBe(true);
  });

  it("handles a plain object thrown by a database client", () => {
    expect(toSafeError({ name: "PostgrestError", code: "23505" })).toEqual({
      name: "PostgrestError",
      code: "23505",
    });
  });

  it("handles a thrown string", () => {
    expect(toSafeError("something went wrong")).toEqual({
      name: "Error",
      code: "unknown_error",
    });
  });

  it("bounds a long code", () => {
    const error = Object.assign(new Error("x"), { code: "c".repeat(200) });

    expect(toSafeError(error).code).toHaveLength(64);
  });

  it("never returns the message or the stack", () => {
    const serialised = JSON.stringify(toSafeError(new Error("secret sk_live_1")));

    expect(serialised).not.toContain("sk_live_1");
    expect(serialised).not.toContain("at ");
  });
});

describe("debugDetail", () => {
  it("withholds the stack in production", () => {
    // A structured production sink is read by tools and people who have no
    // business seeing internal file paths.
    vi.stubEnv("NODE_ENV", "production");

    try {
      expect(debugDetail(new Error("boom"))).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("offers the stack outside production, where it is useful", () => {
    expect(debugDetail(new Error("boom"))).toContain("Error: boom");
  });

  it("has nothing to offer for a non-error", () => {
    expect(debugDetail("boom")).toBeUndefined();
  });
});

describe("withSpan", () => {
  it("returns the result when no tracer provider is registered", async () => {
    // The OpenTelemetry API is a no-op until something registers a provider,
    // so an unconfigured deployment runs exactly as it would without spans.
    await expect(
      withSpan("entitlements.resolve", { "entitlement.feature": "custom_slug" }, async () => 42),
    ).resolves.toBe(42);
  });

  it("lets the error through after marking the span", async () => {
    await expect(
      withSpan("entitlements.resolve", {}, async () => {
        throw new Error("denied");
      }),
    ).rejects.toThrow("denied");
  });

  it("skips attributes that were not set", async () => {
    await expect(
      withSpan("integration.outbox.claim", { "outbox.batch_size": undefined }, async () => "ok"),
    ).resolves.toBe("ok");
  });

  it("reports no trace id when nothing is recording", () => {
    expect(currentTraceId()).toBeUndefined();
  });
});
