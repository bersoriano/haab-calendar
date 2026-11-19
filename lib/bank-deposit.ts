/** Parse a plain decimal entered in a service form. Never parse display cost text. */
export function parseDepositAmountMinor(value: string, currency: string): number | null {
  if (!/^[A-Z]{3}$/.test(currency) || !/^(0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    return null;
  }

  let fractionDigits: number;
  try {
    const digits = new Intl.NumberFormat("en", { style: "currency", currency })
      .resolvedOptions().maximumFractionDigits;
    if (digits === undefined) return null;
    fractionDigits = digits;
  } catch {
    return null;
  }

  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > fractionDigits) return null;
  const scale = 10 ** fractionDigits;
  const amount = Number(whole) * scale + Number(fraction.padEnd(fractionDigits, "0"));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function readDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError("Invalid date.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError("Invalid date.");
  }
  return date;
}

/** Retain every submitted proof attempt through twelve calendar months. */
export function getReceiptDeletionDate(
  serviceDate: string,
  paymentResolvedDate: string | null,
): string {
  const service = readDate(serviceDate);
  const resolved = paymentResolvedDate ? readDate(paymentResolvedDate) : null;
  const start = resolved && resolved > service ? resolved : service;
  const year = start.getUTCFullYear() + 1;
  const month = start.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)))
    .toISOString().slice(0, 10);
}
