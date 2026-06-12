import { buildManagePath } from "@/lib/public-url";
import type { VerticalId } from "@/lib/types";

type BookingLike = {
  id: string;
  manageToken?: string;
};

type StoreLike<B extends BookingLike> = {
  bookings: B[];
};

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateManageToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export function findBookingByToken<B extends BookingLike>(
  store: StoreLike<B>,
  token: string,
): B | undefined {
  if (!token) return undefined;
  return store.bookings.find((booking) => booking.manageToken === token);
}

export function backfillManageTokens<B extends BookingLike, S extends StoreLike<B>>(
  store: S,
): { changed: boolean; store: S } {
  let changed = false;
  const bookings = store.bookings.map((booking) => {
    if (booking.manageToken) {
      return booking;
    }
    changed = true;
    return { ...booking, manageToken: generateManageToken() };
  });

  if (!changed) {
    return { changed: false, store };
  }

  return { changed: true, store: { ...store, bookings } };
}

export function buildManageUrl(slug: string, token: string, vertical: VerticalId): string {
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";

  return `${origin}${buildManagePath(vertical, slug, token)}`;
}
