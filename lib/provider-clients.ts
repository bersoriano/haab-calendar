import { csvCell, UTF8_BOM } from "@/lib/csv";
import { getDateTimeKeysInTimeZone } from "@/lib/date";
import type { Lang } from "@/lib/types";

/** Someone who has booked with a provider. Outlives their bookings. */
export type ProviderClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  firstBookedAt: string;
  lastBookedAt: string;
  bookingCount: number;
};

const CSV_HEADERS: Record<Lang, readonly string[]> = {
  en: ["Name", "Email", "Phone", "First booking", "Last booking", "Bookings"],
  es: ["Nombre", "Correo electrónico", "Teléfono", "Primera reserva", "Última reserva", "Reservas"],
};

const CSV_FILE_STEM: Record<Lang, string> = { en: "clients", es: "clientes" };

/** Dates in the provider's zone: a booking at 23:00 belongs to that day. */
function dateInZone(value: string, timeZone: string | undefined) {
  return getDateTimeKeysInTimeZone(new Date(value), timeZone).dateKey;
}

export function toClientsCsv(
  clients: readonly ProviderClient[],
  options: { lang: Lang; timeZone?: string },
) {
  const rows = clients.map((client) =>
    [
      csvCell(client.name),
      csvCell(client.email),
      csvCell(client.phone),
      dateInZone(client.firstBookedAt, options.timeZone),
      dateInZone(client.lastBookedAt, options.timeZone),
      String(client.bookingCount),
    ].join(","),
  );

  return `${UTF8_BOM}${[CSV_HEADERS[options.lang].join(","), ...rows].join("\r\n")}\r\n`;
}

export function clientsCsvFileName(lang: Lang, timeZone: string | undefined, now: Date) {
  return `${CSV_FILE_STEM[lang]}-${getDateTimeKeysInTimeZone(now, timeZone).dateKey}.csv`;
}

/** Matches on what a provider would search by when someone asks to be removed. */
export function filterClients(clients: readonly ProviderClient[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...clients];

  return clients.filter((client) =>
    [client.name, client.email, client.phone].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
}
