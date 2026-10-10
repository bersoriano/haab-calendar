import { describe, expect, it } from "vitest";

import { describeError } from "@/lib/describe-error";

describe("describeError", () => {
  it("keeps an Error's message", () => {
    expect(describeError(new Error("network down"))).toBe("network down");
  });

  it("keeps a database error's code and message instead of [object Object]", () => {
    // What supabase-js hands back, and what the store loaders used to log as
    // "[object Object]" while a missing column hid every owner's dashboard.
    const postgrest = {
      code: "42703",
      message: "column providers.keep_booking_history_one_year does not exist",
      details: null,
      hint: null,
    };

    expect(describeError(postgrest)).toBe(
      "42703: column providers.keep_booking_history_one_year does not exist",
    );
  });

  it("adds details and a hint when the database gives them", () => {
    expect(
      describeError({ code: "23505", message: "duplicate key", details: "Key (slug)=(a) exists.", hint: "Pick another" }),
    ).toBe("23505: duplicate key — Key (slug)=(a) exists. — Pick another");
  });

  it("falls back to the value itself for anything else", () => {
    expect(describeError("plain")).toBe("plain");
    expect(describeError(42)).toBe("42");
    expect(describeError({ status: 503 })).toBe('{"status":503}');
    expect(describeError(undefined)).toBe("undefined");
  });
});
