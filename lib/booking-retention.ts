import { hasResolvedEntitlement, type ProviderEntitlements } from "@/lib/entitlements/resolve";

export type BookingRetentionPolicy = "month" | "year" | "unknown";

export function isExtendedBookingRetentionEnabled(
  preference: boolean | undefined,
  entitlements?: ProviderEntitlements,
): boolean {
  return preference === true && Boolean(entitlements && hasResolvedEntitlement(entitlements, "booking_history_retention"));
}

/** Unknown paid access must not pretend an opted-in owner has shorter history. */
export function getBookingRetentionPolicy(
  preference: boolean | undefined,
  entitlements?: ProviderEntitlements,
): BookingRetentionPolicy {
  if (preference === true && !entitlements) return "unknown";
  return isExtendedBookingRetentionEnabled(preference, entitlements) ? "year" : "month";
}
