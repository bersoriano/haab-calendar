import {
  formatTimeZoneChoice,
  isUnsetTimeZone,
  normalizeTimeZone,
} from "./timezone";
import type { Lang } from "./types";

/**
 * The decisions behind the public booking page's identity band, kept apart from
 * the markup so they can be reasoned about — and tested — on their own.
 */

/** What the live slot is currently saying, and in what voice. */
export type PublicHeaderSlotTone = "idle" | "pending" | "warning" | "error";

export type PublicHeaderSlot = {
  tone: PublicHeaderSlotTone;
  text: string;
};

/**
 * An uploaded logo may or may not be a wordmark, and nothing about the image
 * tells us which. Rather than print the provider's name twice whenever it is,
 * the mark speaks for the brand and the name goes to assistive technology.
 * A provider with no logo has nothing else to identify the page, so there the
 * name is the mark.
 */
export function shouldShowProviderNameVisually(logoImageUrl?: string): boolean {
  return !logoImageUrl?.trim();
}

/**
 * Where a visitor should read the page's times — "Ciudad de México, México
 * (GMT-6)", not "America/Mexico_City" and not a bare "GMT-6". The place leads
 * because that is what a person recognises; the offset trails for whoever is
 * reading from somewhere else. An unknown or unsupported zone yields nothing
 * rather than a wrong label.
 */
export function formatTimeZoneLabel(
  timeZone: string | undefined,
  lang: Lang = "en",
  now: Date = new Date(),
): string {
  const zone = normalizeTimeZone(timeZone);

  if (!zone) {
    return "";
  }

  // The providers table declares `timezone text not null default 'UTC'`, so a
  // bare "UTC" is indistinguishable from a provider who never set one. Stating
  // GMT+0 to a client of a provider who simply left the field alone is worse
  // than saying nothing, so an unset-looking zone is treated as unset. The cost
  // is that a provider genuinely on UTC loses the clause.
  if (isUnsetTimeZone(zone)) {
    return "";
  }

  return formatTimeZoneChoice(zone, lang, now);
}

/**
 * The band is the only surface mounted for the whole public flow, so the slot
 * has to carry whatever is most worth knowing at this instant. Order matters:
 * a failure outranks the work that failed, and the work outranks the standing
 * description of the page.
 */
export function resolvePublicHeaderSlot({
  bookingsNoun,
  timesShownIn,
  holdingSpotLabel,
  timeZoneLabel,
  isAdvancing,
  errorMessage,
  warningMessage,
}: {
  /** Vertical- and language-aware plural, e.g. "Registrations", "Citas". */
  bookingsNoun: string;
  /** Leading phrase for the offset, e.g. "Times shown in". */
  timesShownIn: string;
  /** What to say while the flow is mid-transition. */
  holdingSpotLabel: string;
  timeZoneLabel: string;
  /** The flow is fading out or a hold is being created server-side. */
  isAdvancing: boolean;
  errorMessage?: string | null;
  /** A hold running out — outranks the idle line, not a hard failure. */
  warningMessage?: string | null;
}): PublicHeaderSlot {
  const error = errorMessage?.trim();

  // An advancing flag left true on a failure path would otherwise strand the
  // band on "Holding your spot…" forever, so the error wins outright.
  if (error) {
    return { tone: "error", text: error };
  }

  if (isAdvancing) {
    return { tone: "pending", text: holdingSpotLabel };
  }

  const warning = warningMessage?.trim();

  if (warning) {
    return { tone: "warning", text: warning };
  }

  const zone = timeZoneLabel.trim();
  const idle = zone ? `${bookingsNoun} · ${timesShownIn} ${zone}` : bookingsNoun;

  return { tone: "idle", text: idle };
}
