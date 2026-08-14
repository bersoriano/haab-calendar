import { addDays, getDateKey, parseDateKey } from "./date";
import { zonedWallTimeToUtc } from "./timezone";
import type { BookingRecord, Lang, ProviderInfo } from "./types";

export function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** "20261011T130000Z" for a wall time in the provider's zone, or null. */
function anchorToProviderZone(dateKey: string, time: string, timezone: string) {
  const instant = timezone ? zonedWallTimeToUtc(dateKey, time, timezone) : null;

  return instant
    ? instant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
    : null;
}

export function buildIcsContent(
  booking: BookingRecord,
  provider: ProviderInfo,
  manageUrl: string,
  lang: Lang = "en",
) {
  const labels =
    lang === "es"
      ? {
          client: "Cliente",
          phone: "Teléfono",
          guests: "Comensales",
          notes: "Notas",
          notAvailable: "No aplica",
          manage: "Gestionar esta reserva",
          productLanguage: "ES",
        }
      : {
          client: "Client",
          phone: "Phone",
          guests: "Guests",
          notes: "Notes",
          notAvailable: "N/A",
          manage: "Manage this booking",
          productLanguage: "EN",
        };
  const safeSummary = escapeIcsText(booking.serviceName);
  // Party size is what the owner reads at service time, so it goes above notes.
  const guestsLine =
    typeof booking.partySize === "number" ? `${labels.guests}: ${booking.partySize}\n` : "";
  const baseDescription = `${labels.client}: ${booking.clientName}\n${labels.phone}: ${booking.clientPhone}\n${guestsLine}${labels.notes}: ${booking.notes || labels.notAvailable}`;
  const safeDescription = escapeIcsText(
    manageUrl ? `${baseDescription}\n${labels.manage}: ${manageUrl}` : baseDescription,
  );
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const eventId = `${booking.id}@haab-calendar.local`;

  if (booking.bookingType === "full-day") {
    const start = booking.dateKey.replaceAll("-", "");
    const end = getDateKey(addDays(parseDateKey(booking.dateKey), 1)).replaceAll("-", "");

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//Haab Calendar//Booking Module//${labels.productLanguage}`,
      "BEGIN:VEVENT",
      `UID:${eventId}`,
      `DTSTAMP:${stamp}`,
      `SUMMARY:${safeSummary}`,
      `DESCRIPTION:${safeDescription}`,
      `ORGANIZER:MAILTO:${provider.email}`,
      ...(manageUrl ? [`URL:${manageUrl}`] : []),
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
  }

  // Without a zone these are "floating" times per RFC 5545: they land at the
  // stated clock time wherever the invite is opened, which is eight hours wrong
  // for a client abroad. Anchoring them to the provider's zone as UTC instants
  // is understood by every calendar client and needs no VTIMEZONE block. A
  // provider with no zone set has nothing better than floating.
  const startInstant = anchorToProviderZone(
    booking.dateKey,
    booking.startTime ?? "09:00",
    provider.timezone,
  );
  const endInstant = anchorToProviderZone(
    booking.dateKey,
    booking.endTime ?? "10:00",
    provider.timezone,
  );
  const start =
    startInstant ??
    `${booking.dateKey.replaceAll("-", "")}T${(booking.startTime ?? "09:00").replace(":", "")}00`;
  const end =
    endInstant ??
    `${booking.dateKey.replaceAll("-", "")}T${(booking.endTime ?? "10:00").replace(":", "")}00`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Haab Calendar//Booking Module//${labels.productLanguage}`,
    "BEGIN:VEVENT",
    `UID:${eventId}`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${safeSummary}`,
    `DESCRIPTION:${safeDescription}`,
    `ORGANIZER:MAILTO:${provider.email}`,
    ...(manageUrl ? [`URL:${manageUrl}`] : []),
    `DTSTART:${start}`,
    `DTEND:${end}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
}
