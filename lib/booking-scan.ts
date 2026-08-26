import {
  parsePublicVerticalSegment,
  validateProviderSlug,
} from "@/lib/public-url";
import type { BookingStatus } from "@/lib/types";

export type AppointmentQrCode = {
  verticalSegment: string;
  providerSlug: string;
  token: string;
};

const MANAGE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export function getAppointmentQrPayload(
  booking: { status: BookingStatus; manageToken?: string },
  manageUrl: string,
) {
  if (booking.status === "cancelled" || !booking.manageToken || !manageUrl) {
    return null;
  }

  return manageUrl;
}

/**
 * Accepts only Haab private-manage URLs. Appointment data never needs to be
 * embedded in the QR itself; the server resolves the opaque token instead.
 *
 * `expectedOrigin` takes a list because a printed QR outlives the origin that
 * minted it: after the site moves to a new domain, every code already in a
 * customer's wallet still carries the old one, and this check compares strings,
 * so a redirect on the retired host cannot help. The caller decides which
 * origins it still owns (lib/site-url.ts); an empty list trusts none of them.
 */
export function parseAppointmentQrCode(
  code: string,
  expectedOrigin: string | readonly string[],
): AppointmentQrCode | null {
  if (!code || code.length > 2_048) return null;

  let url: URL;
  try {
    url = new URL(code);
  } catch {
    return null;
  }

  const acceptedOrigins =
    typeof expectedOrigin === "string" ? [expectedOrigin] : expectedOrigin;

  if (
    !acceptedOrigins.includes(url.origin) ||
    url.username ||
    url.password ||
    url.hash
  ) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 4 || segments[2] !== "manage") return null;

  const [verticalSegment, encodedProviderSlug, , encodedToken] = segments;
  let providerSlug: string;
  let token: string;
  try {
    providerSlug = decodeURIComponent(encodedProviderSlug);
    token = decodeURIComponent(encodedToken);
  } catch {
    return null;
  }

  if (
    !parsePublicVerticalSegment(verticalSegment) ||
    !validateProviderSlug(providerSlug).ok ||
    !MANAGE_TOKEN_PATTERN.test(token)
  ) {
    return null;
  }

  return { verticalSegment, providerSlug, token };
}
