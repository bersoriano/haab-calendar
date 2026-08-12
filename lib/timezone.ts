import type { Lang } from "@/lib/types";

/**
 * Time zones, said the way a provider would say them.
 *
 * An IANA id like "America/Mexico_City" is precise and unreadable, and a bare
 * "GMT-6" is readable and useless — neither is what someone picking their own
 * zone, or a visitor reading a booking page, actually wants. So one curated
 * table carries the wording for both surfaces, and they cannot drift apart.
 *
 * The list is not exhaustive by design. It covers the regions the product
 * serves; anything else still works, it just falls back to a label derived
 * from the id.
 */
export type TimeZoneEntry = {
  /** IANA identifier, the only value ever stored. */
  zone: string;
  city: { en: string; es: string };
  country: { en: string; es: string };
  /** Coarse grouping for the picker's <optgroup>. */
  region: TimeZoneRegion;
};

export type TimeZoneRegion =
  | "americas"
  | "europe"
  | "africa"
  | "asia"
  | "oceania";

export const TIME_ZONE_REGION_LABELS: Record<
  TimeZoneRegion,
  { en: string; es: string }
> = {
  americas: { en: "Americas", es: "América" },
  europe: { en: "Europe", es: "Europa" },
  africa: { en: "Africa", es: "África" },
  asia: { en: "Asia & Middle East", es: "Asia y Medio Oriente" },
  oceania: { en: "Oceania", es: "Oceanía" },
};

export const TIME_ZONES: readonly TimeZoneEntry[] = [
  // Americas
  { zone: "America/Anchorage", city: { en: "Anchorage", es: "Anchorage" }, country: { en: "United States", es: "Estados Unidos" }, region: "americas" },
  { zone: "America/Los_Angeles", city: { en: "Los Angeles", es: "Los Ángeles" }, country: { en: "United States", es: "Estados Unidos" }, region: "americas" },
  { zone: "America/Denver", city: { en: "Denver", es: "Denver" }, country: { en: "United States", es: "Estados Unidos" }, region: "americas" },
  { zone: "America/Phoenix", city: { en: "Phoenix", es: "Phoenix" }, country: { en: "United States", es: "Estados Unidos" }, region: "americas" },
  { zone: "America/Chicago", city: { en: "Chicago", es: "Chicago" }, country: { en: "United States", es: "Estados Unidos" }, region: "americas" },
  { zone: "America/New_York", city: { en: "New York", es: "Nueva York" }, country: { en: "United States", es: "Estados Unidos" }, region: "americas" },
  { zone: "America/Toronto", city: { en: "Toronto", es: "Toronto" }, country: { en: "Canada", es: "Canadá" }, region: "americas" },
  { zone: "America/Vancouver", city: { en: "Vancouver", es: "Vancouver" }, country: { en: "Canada", es: "Canadá" }, region: "americas" },
  { zone: "America/Tijuana", city: { en: "Tijuana", es: "Tijuana" }, country: { en: "Mexico", es: "México" }, region: "americas" },
  { zone: "America/Hermosillo", city: { en: "Hermosillo", es: "Hermosillo" }, country: { en: "Mexico", es: "México" }, region: "americas" },
  { zone: "America/Chihuahua", city: { en: "Chihuahua", es: "Chihuahua" }, country: { en: "Mexico", es: "México" }, region: "americas" },
  { zone: "America/Mexico_City", city: { en: "Mexico City", es: "Ciudad de México" }, country: { en: "Mexico", es: "México" }, region: "americas" },
  { zone: "America/Cancun", city: { en: "Cancún", es: "Cancún" }, country: { en: "Mexico", es: "México" }, region: "americas" },
  { zone: "America/Guatemala", city: { en: "Guatemala City", es: "Ciudad de Guatemala" }, country: { en: "Guatemala", es: "Guatemala" }, region: "americas" },
  { zone: "America/Costa_Rica", city: { en: "San José", es: "San José" }, country: { en: "Costa Rica", es: "Costa Rica" }, region: "americas" },
  { zone: "America/Panama", city: { en: "Panama City", es: "Ciudad de Panamá" }, country: { en: "Panama", es: "Panamá" }, region: "americas" },
  { zone: "America/Havana", city: { en: "Havana", es: "La Habana" }, country: { en: "Cuba", es: "Cuba" }, region: "americas" },
  { zone: "America/Santo_Domingo", city: { en: "Santo Domingo", es: "Santo Domingo" }, country: { en: "Dominican Republic", es: "República Dominicana" }, region: "americas" },
  { zone: "America/Puerto_Rico", city: { en: "San Juan", es: "San Juan" }, country: { en: "Puerto Rico", es: "Puerto Rico" }, region: "americas" },
  { zone: "America/Bogota", city: { en: "Bogotá", es: "Bogotá" }, country: { en: "Colombia", es: "Colombia" }, region: "americas" },
  { zone: "America/Lima", city: { en: "Lima", es: "Lima" }, country: { en: "Peru", es: "Perú" }, region: "americas" },
  { zone: "America/Caracas", city: { en: "Caracas", es: "Caracas" }, country: { en: "Venezuela", es: "Venezuela" }, region: "americas" },
  { zone: "America/Santiago", city: { en: "Santiago", es: "Santiago" }, country: { en: "Chile", es: "Chile" }, region: "americas" },
  { zone: "America/Argentina/Buenos_Aires", city: { en: "Buenos Aires", es: "Buenos Aires" }, country: { en: "Argentina", es: "Argentina" }, region: "americas" },
  { zone: "America/Montevideo", city: { en: "Montevideo", es: "Montevideo" }, country: { en: "Uruguay", es: "Uruguay" }, region: "americas" },
  { zone: "America/Asuncion", city: { en: "Asunción", es: "Asunción" }, country: { en: "Paraguay", es: "Paraguay" }, region: "americas" },
  { zone: "America/La_Paz", city: { en: "La Paz", es: "La Paz" }, country: { en: "Bolivia", es: "Bolivia" }, region: "americas" },
  { zone: "America/Sao_Paulo", city: { en: "São Paulo", es: "São Paulo" }, country: { en: "Brazil", es: "Brasil" }, region: "americas" },

  // Europe
  { zone: "Atlantic/Canary", city: { en: "Las Palmas", es: "Las Palmas" }, country: { en: "Spain", es: "España" }, region: "europe" },
  { zone: "Europe/Lisbon", city: { en: "Lisbon", es: "Lisboa" }, country: { en: "Portugal", es: "Portugal" }, region: "europe" },
  { zone: "Europe/London", city: { en: "London", es: "Londres" }, country: { en: "United Kingdom", es: "Reino Unido" }, region: "europe" },
  { zone: "Europe/Dublin", city: { en: "Dublin", es: "Dublín" }, country: { en: "Ireland", es: "Irlanda" }, region: "europe" },
  { zone: "Europe/Madrid", city: { en: "Madrid", es: "Madrid" }, country: { en: "Spain", es: "España" }, region: "europe" },
  { zone: "Europe/Paris", city: { en: "Paris", es: "París" }, country: { en: "France", es: "Francia" }, region: "europe" },
  { zone: "Europe/Brussels", city: { en: "Brussels", es: "Bruselas" }, country: { en: "Belgium", es: "Bélgica" }, region: "europe" },
  { zone: "Europe/Amsterdam", city: { en: "Amsterdam", es: "Ámsterdam" }, country: { en: "Netherlands", es: "Países Bajos" }, region: "europe" },
  { zone: "Europe/Berlin", city: { en: "Berlin", es: "Berlín" }, country: { en: "Germany", es: "Alemania" }, region: "europe" },
  { zone: "Europe/Zurich", city: { en: "Zurich", es: "Zúrich" }, country: { en: "Switzerland", es: "Suiza" }, region: "europe" },
  { zone: "Europe/Rome", city: { en: "Rome", es: "Roma" }, country: { en: "Italy", es: "Italia" }, region: "europe" },
  { zone: "Europe/Vienna", city: { en: "Vienna", es: "Viena" }, country: { en: "Austria", es: "Austria" }, region: "europe" },
  { zone: "Europe/Prague", city: { en: "Prague", es: "Praga" }, country: { en: "Czechia", es: "Chequia" }, region: "europe" },
  { zone: "Europe/Warsaw", city: { en: "Warsaw", es: "Varsovia" }, country: { en: "Poland", es: "Polonia" }, region: "europe" },
  { zone: "Europe/Stockholm", city: { en: "Stockholm", es: "Estocolmo" }, country: { en: "Sweden", es: "Suecia" }, region: "europe" },
  { zone: "Europe/Athens", city: { en: "Athens", es: "Atenas" }, country: { en: "Greece", es: "Grecia" }, region: "europe" },
  { zone: "Europe/Bucharest", city: { en: "Bucharest", es: "Bucarest" }, country: { en: "Romania", es: "Rumania" }, region: "europe" },
  { zone: "Europe/Istanbul", city: { en: "Istanbul", es: "Estambul" }, country: { en: "Türkiye", es: "Turquía" }, region: "europe" },
  { zone: "Europe/Moscow", city: { en: "Moscow", es: "Moscú" }, country: { en: "Russia", es: "Rusia" }, region: "europe" },

  // Africa
  { zone: "Africa/Casablanca", city: { en: "Casablanca", es: "Casablanca" }, country: { en: "Morocco", es: "Marruecos" }, region: "africa" },
  { zone: "Africa/Lagos", city: { en: "Lagos", es: "Lagos" }, country: { en: "Nigeria", es: "Nigeria" }, region: "africa" },
  { zone: "Africa/Cairo", city: { en: "Cairo", es: "El Cairo" }, country: { en: "Egypt", es: "Egipto" }, region: "africa" },
  { zone: "Africa/Nairobi", city: { en: "Nairobi", es: "Nairobi" }, country: { en: "Kenya", es: "Kenia" }, region: "africa" },
  { zone: "Africa/Johannesburg", city: { en: "Johannesburg", es: "Johannesburgo" }, country: { en: "South Africa", es: "Sudáfrica" }, region: "africa" },

  // Asia & Middle East
  { zone: "Asia/Jerusalem", city: { en: "Jerusalem", es: "Jerusalén" }, country: { en: "Israel", es: "Israel" }, region: "asia" },
  { zone: "Asia/Dubai", city: { en: "Dubai", es: "Dubái" }, country: { en: "United Arab Emirates", es: "Emiratos Árabes Unidos" }, region: "asia" },
  { zone: "Asia/Karachi", city: { en: "Karachi", es: "Karachi" }, country: { en: "Pakistan", es: "Pakistán" }, region: "asia" },
  { zone: "Asia/Kolkata", city: { en: "Mumbai", es: "Bombay" }, country: { en: "India", es: "India" }, region: "asia" },
  { zone: "Asia/Dhaka", city: { en: "Dhaka", es: "Daca" }, country: { en: "Bangladesh", es: "Bangladés" }, region: "asia" },
  { zone: "Asia/Bangkok", city: { en: "Bangkok", es: "Bangkok" }, country: { en: "Thailand", es: "Tailandia" }, region: "asia" },
  { zone: "Asia/Jakarta", city: { en: "Jakarta", es: "Yakarta" }, country: { en: "Indonesia", es: "Indonesia" }, region: "asia" },
  { zone: "Asia/Singapore", city: { en: "Singapore", es: "Singapur" }, country: { en: "Singapore", es: "Singapur" }, region: "asia" },
  { zone: "Asia/Kuala_Lumpur", city: { en: "Kuala Lumpur", es: "Kuala Lumpur" }, country: { en: "Malaysia", es: "Malasia" }, region: "asia" },
  { zone: "Asia/Manila", city: { en: "Manila", es: "Manila" }, country: { en: "Philippines", es: "Filipinas" }, region: "asia" },
  { zone: "Asia/Hong_Kong", city: { en: "Hong Kong", es: "Hong Kong" }, country: { en: "Hong Kong", es: "Hong Kong" }, region: "asia" },
  { zone: "Asia/Shanghai", city: { en: "Shanghai", es: "Shanghái" }, country: { en: "China", es: "China" }, region: "asia" },
  { zone: "Asia/Seoul", city: { en: "Seoul", es: "Seúl" }, country: { en: "South Korea", es: "Corea del Sur" }, region: "asia" },
  { zone: "Asia/Tokyo", city: { en: "Tokyo", es: "Tokio" }, country: { en: "Japan", es: "Japón" }, region: "asia" },

  // Oceania
  { zone: "Australia/Perth", city: { en: "Perth", es: "Perth" }, country: { en: "Australia", es: "Australia" }, region: "oceania" },
  { zone: "Australia/Brisbane", city: { en: "Brisbane", es: "Brisbane" }, country: { en: "Australia", es: "Australia" }, region: "oceania" },
  { zone: "Australia/Sydney", city: { en: "Sydney", es: "Sídney" }, country: { en: "Australia", es: "Australia" }, region: "oceania" },
  { zone: "Pacific/Auckland", city: { en: "Auckland", es: "Auckland" }, country: { en: "New Zealand", es: "Nueva Zelanda" }, region: "oceania" },
];

const TIME_ZONES_BY_ID = new Map(TIME_ZONES.map((entry) => [entry.zone, entry]));

/**
 * The column is `not null default 'UTC'`, so a stored "UTC" cannot be told
 * apart from a provider who never chose anything. Everything here treats it as
 * unset; a provider genuinely on UTC loses the label and nothing else.
 */
export const UNSET_TIME_ZONE = "UTC";

export function isValidTimeZone(zone?: string | null): boolean {
  const candidate = zone?.trim();

  if (!candidate) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate });
    return true;
  } catch {
    return false;
  }
}

/** A storable zone, or "" when there is nothing worth storing. */
export function normalizeTimeZone(zone?: string | null): string {
  const candidate = zone?.trim();

  if (!candidate || !isValidTimeZone(candidate)) {
    return "";
  }

  return candidate;
}

export function isUnsetTimeZone(zone?: string | null): boolean {
  const candidate = normalizeTimeZone(zone);
  return !candidate || candidate.toUpperCase() === UNSET_TIME_ZONE;
}

/**
 * The browser's own zone. This is what "detect my location" runs on: it is the
 * exact IANA id, needs no permission prompt, and cannot be refused — unlike
 * geolocation, which prompts and still only yields coordinates.
 */
export function detectTimeZone(): string {
  try {
    return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return "";
  }
}

export function findTimeZoneEntry(zone?: string | null): TimeZoneEntry | undefined {
  const candidate = zone?.trim();
  return candidate ? TIME_ZONES_BY_ID.get(candidate) : undefined;
}

/** "America/Argentina/Buenos_Aires" → "Buenos Aires", for uncurated zones. */
export function prettifyTimeZoneId(zone: string): string {
  const segments = zone.split("/");
  return (segments[segments.length - 1] ?? zone).replace(/_/g, " ");
}

/** "GMT-6", or "" when the runtime does not know the zone. */
export function formatTimeZoneOffset(
  zone: string,
  lang: Lang = "en",
  now: Date = new Date(),
): string {
  try {
    const parts = new Intl.DateTimeFormat(lang, {
      timeZone: zone,
      timeZoneName: "shortOffset",
    }).formatToParts(now);

    return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** "Mexico City, Mexico" / "Ciudad de México, México". */
export function formatTimeZonePlace(zone: string, lang: Lang = "en"): string {
  const entry = findTimeZoneEntry(zone);

  if (!entry) {
    return prettifyTimeZoneId(zone);
  }

  return `${entry.city[lang]}, ${entry.country[lang]}`;
}

/**
 * The full label a person reads: the place first, because that is what tells
 * them whether it is right, with the offset kept for visitors doing the math
 * from somewhere else.
 */
export function formatTimeZoneChoice(
  zone: string,
  lang: Lang = "en",
  now: Date = new Date(),
): string {
  const place = formatTimeZonePlace(zone, lang);
  const offset = formatTimeZoneOffset(zone, lang, now);

  return offset ? `${place} (${offset})` : place;
}

/** The local time in that zone right now, e.g. "2:37 PM" — a sanity check. */
export function formatTimeInZone(
  zone: string,
  lang: Lang = "en",
  now: Date = new Date(),
): string {
  try {
    return new Intl.DateTimeFormat(lang, {
      timeZone: zone,
      hour: "numeric",
      minute: "2-digit",
    }).format(now);
  } catch {
    return "";
  }
}

/** The zone's offset from UTC, in minutes, at a given instant. */
function getZoneOffsetMinutes(zone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return (asUtc - instant.getTime()) / 60_000;
}

/**
 * The instant a wall-clock time in a given zone actually refers to.
 *
 * Provider hours are stored as wall time ("09:00"), which is only an instant
 * once a zone is applied — an calendar invite that skips this step lands at
 * 09:00 wherever the recipient happens to be. Two passes, because the offset
 * to apply depends on the instant it is applied to, which is what daylight
 * saving changes.
 */
export function zonedWallTimeToUtc(
  dateKey: string,
  time: string,
  zone: string,
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  if (!isValidTimeZone(zone)) {
    return null;
  }

  const naive = Date.parse(`${dateKey}T${time}:00Z`);

  if (Number.isNaN(naive)) {
    return null;
  }

  try {
    const firstPass = naive - getZoneOffsetMinutes(zone, new Date(naive)) * 60_000;
    const secondPass =
      naive - getZoneOffsetMinutes(zone, new Date(firstPass)) * 60_000;

    return new Date(secondPass);
  } catch {
    return null;
  }
}

export type TimeZoneOptionGroup = {
  region: TimeZoneRegion;
  label: string;
  options: { zone: string; label: string }[];
};

/**
 * Picker contents. A saved zone outside the curated list is added to its
 * region rather than dropped, so opening Settings can never quietly rewrite a
 * zone the provider already relies on.
 */
export function getTimeZoneOptionGroups(
  lang: Lang = "en",
  selectedZone?: string,
  now: Date = new Date(),
): TimeZoneOptionGroup[] {
  const entries = [...TIME_ZONES];
  const selected = normalizeTimeZone(selectedZone);

  if (selected && !TIME_ZONES_BY_ID.has(selected)) {
    entries.push({
      zone: selected,
      city: { en: prettifyTimeZoneId(selected), es: prettifyTimeZoneId(selected) },
      country: { en: "", es: "" },
      region: guessRegion(selected),
    });
  }

  const groups = new Map<TimeZoneRegion, TimeZoneOptionGroup>();

  for (const entry of entries) {
    const group = groups.get(entry.region) ?? {
      region: entry.region,
      label: TIME_ZONE_REGION_LABELS[entry.region][lang],
      options: [],
    };

    const place = entry.country[lang]
      ? `${entry.city[lang]}, ${entry.country[lang]}`
      : entry.city[lang];
    const offset = formatTimeZoneOffset(entry.zone, lang, now);

    group.options.push({
      zone: entry.zone,
      label: offset ? `${place} (${offset})` : place,
    });
    groups.set(entry.region, group);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    options: group.options.sort((a, b) => a.label.localeCompare(b.label, lang)),
  }));
}

function guessRegion(zone: string): TimeZoneRegion {
  const area = zone.split("/")[0];

  switch (area) {
    case "Europe":
      return "europe";
    case "Africa":
      return "africa";
    case "Asia":
      return "asia";
    case "Australia":
    case "Pacific":
      return "oceania";
    default:
      return "americas";
  }
}
