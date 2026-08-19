import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasEntitlement } from "@/lib/entitlements/server";
import {
  BUSY_FRESHNESS,
  classifySnapshotFreshness,
  isBlocked,
  zonedWallTimeToInstant,
} from "@/lib/google/busy";
import { loadActiveBusyIntervals, refreshProviderBusySnapshot } from "@/lib/google/busy-refresh";
import type { GoogleCalendarClient } from "@/lib/google/calendar-client";
import { getConnection, type GoogleConnectionRow } from "@/lib/google/connections";
import { logger, type Logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The check that runs immediately before a booking is written.
 *
 * Slot browsing may read a cached snapshot — a list of times is a hint, and
 * refusing to draw one because a refresh is a minute late would be worse than
 * showing a slot that turns out to be taken. The final write is different: it
 * is the moment the promise is made, so it asks Google directly whenever the
 * cache is not fresh enough to stand behind.
 *
 * When Google cannot answer, this fails closed. A provider who turned on busy
 * blocking asked for their outside commitments to be respected; booking over
 * them because Google timed out would break exactly the promise the feature
 * exists to keep.
 */

export type AvailabilityDecision =
  | { allowed: true; reason: "not_enabled" | "no_sources" | "free" }
  | { allowed: false; reason: "busy"; retryable: false }
  | { allowed: false; reason: "unverifiable"; retryable: true };

export type GuardInput = {
  providerId: string;
  /** The absolute interval the booking would occupy. */
  startsAt: string;
  endsAt: string;
  client?: SupabaseClient;
  createClient?: (connection: GoogleConnectionRow) => Promise<GoogleCalendarClient>;
  now?: Date;
  logger?: Logger;
};

export async function assertGoogleAvailability(
  input: GuardInput,
): Promise<AvailabilityDecision> {
  const admin = input.client ?? createAdminClient();
  const now = input.now ?? new Date();
  const log = (input.logger ?? logger).child({ providerId: input.providerId });

  let entitled: boolean;

  try {
    entitled = await hasEntitlement(
      input.providerId,
      "google_calendar_busy_blocking",
      admin,
    );
  } catch {
    // The entitlement itself is unresolvable. Refusing every booking for every
    // provider because one lookup failed would be worse than the risk this
    // feature guards against, so the booking proceeds under Haab's own rules —
    // which are always enforced transactionally regardless.
    log.error("entitlements.billing_read_failed", { providerId: input.providerId });
    return { allowed: true, reason: "not_enabled" };
  }

  if (!entitled) {
    return { allowed: true, reason: "not_enabled" };
  }

  const connection = await getConnection(input.providerId, admin);

  if (!connection || connection.status !== "connected") {
    // Busy blocking is entitled but not usable. The provider is told elsewhere;
    // a booking is not the place to enforce a configuration problem.
    return { allowed: true, reason: "not_enabled" };
  }

  const cached = await loadActiveBusyIntervals({
    providerId: input.providerId,
    from: input.startsAt,
    to: input.endsAt,
    client: admin,
  });

  if (cached.sourceCount === 0) {
    return { allowed: true, reason: "no_sources" };
  }

  const proposed = { startsAt: input.startsAt, endsAt: input.endsAt };
  const freshness = classifySnapshotFreshness(cached.oldestRefreshedAt, now);

  // A fresh cache already says no — no point asking Google to confirm it.
  if (freshness === "fresh" && isBlocked(proposed, cached.intervals)) {
    log.info("google.busy.final_check_blocked", { outcome: "cached" });
    return { allowed: false, reason: "busy", retryable: false };
  }

  // Otherwise ask Google. Even a fresh cache that says "free" is confirmed here:
  // the whole window between the last refresh and this instant is exactly where
  // a newly created meeting would hide.
  try {
    const refreshed = await refreshProviderBusySnapshot({
      providerId: input.providerId,
      client: admin,
      createClient: input.createClient,
      now,
      logger: input.logger,
    });

    if (refreshed.skipped === "no_sources") {
      return { allowed: true, reason: "no_sources" };
    }

    if (refreshed.failedSources > 0) {
      // Some calendar could not be read. "No busy time returned" and "we could
      // not ask" must not be treated alike.
      log.warn("google.busy.final_check_failed", { errorCode: "source_unreadable" });
      return { allowed: false, reason: "unverifiable", retryable: true };
    }

    const live = await loadActiveBusyIntervals({
      providerId: input.providerId,
      from: input.startsAt,
      to: input.endsAt,
      client: admin,
    });

    if (isBlocked(proposed, live.intervals)) {
      log.info("google.busy.final_check_blocked", { outcome: "live" });
      return { allowed: false, reason: "busy", retryable: false };
    }

    return { allowed: true, reason: "free" };
  } catch {
    // Google was unreachable. If the cache is still inside the hard-stale
    // window it is evidence enough to proceed on; past that it is not evidence
    // of anything and the booking is refused with a retryable message.
    if (freshness === "fresh" || freshness === "stale") {
      log.warn("google.busy.cache_stale", { outcome: "fell_back_to_cache" });
      return isBlocked(proposed, cached.intervals)
        ? { allowed: false, reason: "busy", retryable: false }
        : { allowed: true, reason: "free" };
    }

    log.error("google.busy.final_check_failed", { errorCode: "google_unreachable" });
    return { allowed: false, reason: "unverifiable", retryable: true };
  }
}

export const BUSY_GUARD_THRESHOLDS = BUSY_FRESHNESS;

/**
 * The same check, stated in the terms a booking is written in.
 *
 * Routes hold a date, a clock time, and a provider — not instants. Converting
 * in each of them would be the same three lines repeated five times, and the
 * one that got it wrong would silently compare a local time against absolute
 * busy intervals and let every booking through.
 *
 * An all-day booking (a service with no clock times) is not checked: it does
 * not claim a specific interval, so there is nothing for a busy interval to
 * overlap with.
 */
export async function assertGoogleAvailabilityForBooking(
  input: Omit<GuardInput, "startsAt" | "endsAt"> & {
    dateKey: string;
    startTime?: string | null;
    endTime?: string | null;
    providerTimeZone: string;
  },
): Promise<AvailabilityDecision> {
  const { dateKey, startTime, endTime, providerTimeZone, ...rest } = input;

  if (!startTime || !endTime) {
    return { allowed: true, reason: "not_enabled" };
  }

  let startsAt: string;
  let endsAt: string;

  try {
    startsAt = zonedWallTimeToInstant(`${dateKey}T${startTime.slice(0, 5)}:00`, providerTimeZone);
    endsAt = zonedWallTimeToInstant(`${dateKey}T${endTime.slice(0, 5)}:00`, providerTimeZone);
  } catch {
    // A time that cannot be placed on a clock cannot be checked against one.
    // Failing closed here matches the rest of the guard.
    return { allowed: false, reason: "unverifiable", retryable: true };
  }

  return assertGoogleAvailability({ ...rest, startsAt, endsAt });
}
