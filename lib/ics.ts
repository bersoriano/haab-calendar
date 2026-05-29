import { addDays, getDateKey, parseDateKey } from "./date";
import type { BookingRecord, ProviderInfo } from "./types";

export function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildIcsContent(
  booking: BookingRecord,
  provider: ProviderInfo,
  manageUrl: string,
) {
  const safeSummary = escapeIcsText(booking.serviceName);
  const baseDescription = `Client: ${booking.clientName}\nPhone: ${booking.clientPhone}\nNotes: ${booking.notes || "N/A"}`;
  const safeDescription = escapeIcsText(
    manageUrl ? `${baseDescription}\nManage this booking: ${manageUrl}` : baseDescription,
  );
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const eventId = `${booking.id}@haab-calendar.local`;

  if (booking.bookingType === "full-day") {
    const start = booking.dateKey.replaceAll("-", "");
    const end = getDateKey(addDays(parseDateKey(booking.dateKey), 1)).replaceAll("-", "");

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Haab Calendar//Booking Module//EN",
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

  const start = `${booking.dateKey.replaceAll("-", "")}T${(booking.startTime ?? "09:00").replace(":", "")}00`;
  const end = `${booking.dateKey.replaceAll("-", "")}T${(booking.endTime ?? "10:00").replace(":", "")}00`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Haab Calendar//Booking Module//EN",
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
