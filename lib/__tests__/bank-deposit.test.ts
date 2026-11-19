import { describe, expect, it } from "vitest";

import {
  formatDepositAmountInput,
  getReceiptDeletionDate,
  parseDepositAmountMinor,
} from "@/lib/bank-deposit";

describe("bank deposit amounts", () => {
  it("converts an exact MXN amount to minor units", () => {
    expect(parseDepositAmountMinor("1250.50", "MXN")).toBe(125050);
  });

  it("rejects zero and fractions smaller than the currency permits", () => {
    expect(parseDepositAmountMinor("0", "MXN")).toBeNull();
    expect(parseDepositAmountMinor("10.001", "MXN")).toBeNull();
  });

  it("uses the currency's minor-unit precision", () => {
    expect(parseDepositAmountMinor("500", "JPY")).toBe(500);
    expect(parseDepositAmountMinor("1.25", "JPY")).toBeNull();
    expect(parseDepositAmountMinor("12.345", "KWD")).toBe(12345);
  });

  it("shows saved exact price in the service editor", () => {
    expect(formatDepositAmountInput(125050, "MXN")).toBe("1250.50");
    expect(formatDepositAmountInput(500, "JPY")).toBe("500");
    expect(formatDepositAmountInput(12345, "KWD")).toBe("12.345");
  });

  it("rejects formatted text and unsafe integers", () => {
    expect(parseDepositAmountMinor("$1,250.50", "MXN")).toBeNull();
    expect(parseDepositAmountMinor("99999999999999999", "MXN")).toBeNull();
  });
});

describe("receipt retention", () => {
  it("starts twelve-month clock from later service or payment resolution date", () => {
    expect(getReceiptDeletionDate("2026-11-18", "2027-02-02")).toBe("2028-02-02");
    expect(getReceiptDeletionDate("2026-11-18", "2026-11-01")).toBe("2027-11-18");
  });

  it("uses service date when payment remains unresolved", () => {
    expect(getReceiptDeletionDate("2026-11-18", null)).toBe("2027-11-18");
  });

  it("clamps leap-day anniversary to end of February", () => {
    expect(getReceiptDeletionDate("2028-02-29", null)).toBe("2029-02-28");
  });
});
