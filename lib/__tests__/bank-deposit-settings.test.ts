import { describe, expect, it } from "vitest";
import {
  isEligibleDepositBusiness,
  validateBankDepositAccount,
} from "@/lib/bank-deposit-settings";

const valid = {
  enabled: true,
  bankName: "  Example Bank  ",
  accountHolder: " Deposit Studio ",
  countryCode: "MX",
  currencyCode: "MXN",
  accountNumber: "123456789",
  clabe: "",
  iban: "",
  swiftBic: "",
  routingCode: "",
  instructionsEn: "Use your reference",
  instructionsEs: "Use su referencia",
};

describe("bank deposit settings", () => {
  it("trims an enabled account while preserving instructions", () => {
    expect(validateBankDepositAccount(valid)).toEqual({
      ok: true,
      account: {
        ...valid,
        bankName: "Example Bank",
        accountHolder: "Deposit Studio",
      },
    });
  });

  it("requires an account identifier before publishing instructions", () => {
    const result = validateBankDepositAccount({
      ...valid,
      accountNumber: "",
    });
    expect(result).toEqual({ ok: false, message: "Enter an account number, CLABE, or IBAN." });
  });

  it("rejects unsupported currency and oversized instructions", () => {
    expect(validateBankDepositAccount({ ...valid, currencyCode: "MXX" }).ok).toBe(false);
    expect(validateBankDepositAccount({ ...valid, instructionsEn: "x".repeat(2001) }).ok).toBe(false);
  });

  it("permits spaces, professional services, and open events only", () => {
    expect(isEligibleDepositBusiness("spaces", "open")).toBe(true);
    expect(isEligibleDepositBusiness("professional", "open")).toBe(true);
    expect(isEligibleDepositBusiness("events", "open")).toBe(true);
    expect(isEligibleDepositBusiness("events", "invitations")).toBe(false);
    expect(isEligibleDepositBusiness("restaurant", "open")).toBe(false);
    expect(isEligibleDepositBusiness("healthcare", "open")).toBe(false);
  });
});
