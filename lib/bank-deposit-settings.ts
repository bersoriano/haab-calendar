import type { RsvpMode, VerticalId } from "@/lib/types";

export type BankDepositAccount = {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  countryCode: string;
  currencyCode: string;
  accountNumber: string;
  clabe: string;
  iban: string;
  swiftBic: string;
  routingCode: string;
  instructionsEn: string;
  instructionsEs: string;
};

export function isEligibleDepositBusiness(vertical: VerticalId, rsvpMode?: RsvpMode): boolean {
  return vertical === "spaces" || vertical === "professional" ||
    (vertical === "events" && rsvpMode !== "invitations");
}

function readText(source: Record<string, unknown>, key: string, maxLength: number): string | null {
  const value = source[key];
  if (typeof value !== "string" || value.length > maxLength) return null;
  return value.trim();
}

export function validateBankDepositAccount(input: unknown):
  | { ok: true; account: BankDepositAccount }
  | { ok: false; message: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "Enter bank deposit details." };
  }
  const source = input as Record<string, unknown>;
  if (typeof source.enabled !== "boolean") {
    return { ok: false, message: "Choose whether bank deposits are enabled." };
  }

  const fields = {
    bankName: readText(source, "bankName", 120),
    accountHolder: readText(source, "accountHolder", 120),
    countryCode: readText(source, "countryCode", 2),
    currencyCode: readText(source, "currencyCode", 3),
    accountNumber: readText(source, "accountNumber", 64),
    clabe: readText(source, "clabe", 64),
    iban: readText(source, "iban", 64),
    swiftBic: readText(source, "swiftBic", 32),
    routingCode: readText(source, "routingCode", 64),
    instructionsEn: readText(source, "instructionsEn", 2000),
    instructionsEs: readText(source, "instructionsEs", 2000),
  };
  if (Object.values(fields).some((value) => value === null)) {
    return { ok: false, message: "Check bank fields and instruction lengths." };
  }
  const account = { enabled: source.enabled, ...fields } as BankDepositAccount;
  if (!account.bankName || !account.accountHolder) {
    return { ok: false, message: "Enter bank name and account holder." };
  }
  if (!/^[A-Z]{2}$/.test(account.countryCode) ||
      !Intl.supportedValuesOf("currency").includes(account.currencyCode)) {
    return { ok: false, message: "Enter a valid country and currency code." };
  }
  if (account.enabled && !account.accountNumber && !account.clabe && !account.iban) {
    return { ok: false, message: "Enter an account number, CLABE, or IBAN." };
  }
  return { ok: true, account };
}
