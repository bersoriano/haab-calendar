import { parseDateKey } from "@/lib/date";
import type { Lang } from "@/lib/types";

/**
 * The decisions behind the details step's live summary, kept apart from the
 * markup so they can be tested on their own.
 */

export type DateTile = { month: string; day: string; weekday: string };

/**
 * The three lines on the calendar tile: "OCT" / "1" / "THU". Spanish
 * abbreviations come with a trailing dot ("oct.") that a tile has no room for.
 */
export function getDateTile(dateKey: string, lang: Lang = "en"): DateTile {
  const date = parseDateKey(dateKey);
  const strip = (value: string) => value.replace(/\.$/, "").toLocaleUpperCase(lang);

  return {
    month: strip(new Intl.DateTimeFormat(lang, { month: "short" }).format(date)),
    day: String(date.getDate()),
    weekday: strip(new Intl.DateTimeFormat(lang, { weekday: "short" }).format(date)),
  };
}

export type SummaryRowKey = "name" | "email" | "phone" | "partySize" | "notes";

/**
 * - filled: there is a value to show
 * - missing: required and still empty, so it asks for it
 * - optional-empty: optional and empty, which is fine and says so quietly
 */
export type SummaryRowStatus = "filled" | "missing" | "optional-empty";

export type SummaryRow = {
  key: SummaryRowKey;
  label: string;
  value: string;
  status: SummaryRowStatus;
};

/**
 * One row per field of the details form, in form order. Whether a field is
 * required mirrors what confirming validates: name, email and phone always,
 * party size only for services that seat a number of guests, notes never.
 */
export function getSummaryClientRows({
  values,
  requiresPartySize,
  labels,
}: {
  values: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    partySize: string;
    notes: string;
  };
  requiresPartySize: boolean;
  labels: Record<SummaryRowKey, string>;
}): SummaryRow[] {
  const row = (key: SummaryRowKey, raw: string, required: boolean): SummaryRow => {
    const value = raw.trim();

    return {
      key,
      label: labels[key],
      value,
      status: value ? "filled" : required ? "missing" : "optional-empty",
    };
  };

  return [
    row("name", values.clientName, true),
    row("email", values.clientEmail, true),
    row("phone", values.clientPhone, true),
    ...(requiresPartySize ? [row("partySize", values.partySize, true)] : []),
    row("notes", values.notes, false),
  ];
}
