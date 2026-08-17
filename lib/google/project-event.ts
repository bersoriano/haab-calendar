import "server-only";

import {
  GoogleApiError,
  type GoogleCalendarClient,
  type GoogleEvent,
  type ManagedEventBody,
} from "@/lib/google/calendar-client";
import { isHaabManagedEvent } from "@/lib/google/ids";

/**
 * Create-or-update for one managed event, with ownership checked in between.
 *
 * Google has no upsert. The sequence is read, decide, write — and the decision
 * is not "does it exist" but "is it ours". A deterministic id can collide with
 * an event this deployment did not create: another Haab deployment sharing the
 * calendar, a restored backup, or an id a human happened to reuse. Writing to
 * that event would corrupt somebody else's data, so a mismatch is refused
 * permanently rather than retried or overwritten.
 */

export type ProjectionOwner = { namespace: string; providerId: string };

export type ProjectionResult =
  | { outcome: "inserted"; event: GoogleEvent }
  | { outcome: "patched"; event: GoogleEvent }
  | { outcome: "deleted" }
  | { outcome: "already_absent" }
  | { outcome: "collision" };

function ownsEvent(event: GoogleEvent, owner: ProjectionOwner, bookingId: string) {
  const properties = event.extendedProperties?.private;

  return (
    isHaabManagedEvent(properties, owner) && properties?.haabBookingId === bookingId
  );
}

/**
 * Merges Haab's private properties into whatever is already there.
 *
 * A provider may have their own private properties on the event — another tool's
 * markers, their own notes. Those are not ours to discard, so the patch carries
 * the union rather than a replacement.
 */
function mergePrivateProperties(
  existing: GoogleEvent,
  next: Record<string, string>,
): Record<string, string> {
  return { ...(existing.extendedProperties?.private ?? {}), ...next };
}

export async function projectManagedEvent(input: {
  client: GoogleCalendarClient;
  calendarId: string;
  eventId: string;
  bookingId: string;
  owner: ProjectionOwner;
  body: ManagedEventBody;
}): Promise<ProjectionResult> {
  const { client, calendarId, eventId, bookingId, owner, body } = input;

  const existing = await client.getEvent(calendarId, eventId);

  if (!existing) {
    try {
      const created = await client.insertEvent(calendarId, eventId, body);
      return { outcome: "inserted", event: created };
    } catch (error) {
      // 409 means the id was taken between the read and the write. Whoever took
      // it might be us on a concurrent delivery, or might not — so the recovery
      // path is the same ownership check, not a blind overwrite.
      if (error instanceof GoogleApiError && error.status === 409) {
        const raced = await client.getEvent(calendarId, eventId);

        if (!raced || !ownsEvent(raced, owner, bookingId)) {
          return { outcome: "collision" };
        }

        const patched = await client.patchEvent(
          calendarId,
          eventId,
          { ...body, privateProperties: mergePrivateProperties(raced, body.privateProperties) },
          raced.etag,
        );

        return { outcome: "patched", event: patched };
      }

      throw error;
    }
  }

  if (!ownsEvent(existing, owner, bookingId)) {
    return { outcome: "collision" };
  }

  try {
    const patched = await client.patchEvent(
      calendarId,
      eventId,
      { ...body, privateProperties: mergePrivateProperties(existing, body.privateProperties) },
      existing.etag,
    );

    return { outcome: "patched", event: patched };
  } catch (error) {
    // 412: the event changed after we read it. Read again, re-verify ownership,
    // and try once. Bounded deliberately — an event changing faster than we can
    // patch it is a live edit, and the outbox will bring us back anyway.
    if (error instanceof GoogleApiError && error.status === 412) {
      const fresh = await client.getEvent(calendarId, eventId);

      if (!fresh) {
        const created = await client.insertEvent(calendarId, eventId, body);
        return { outcome: "inserted", event: created };
      }

      if (!ownsEvent(fresh, owner, bookingId)) {
        return { outcome: "collision" };
      }

      const patched = await client.patchEvent(
        calendarId,
        eventId,
        { ...body, privateProperties: mergePrivateProperties(fresh, body.privateProperties) },
        fresh.etag,
      );

      return { outcome: "patched", event: patched };
    }

    throw error;
  }
}

/**
 * Removes a managed event, and only a managed one.
 *
 * The read comes first for the same reason as above: a deterministic id is not
 * proof of ownership, and deleting somebody else's event is worse than leaving
 * a stale one behind.
 */
export async function retractManagedEvent(input: {
  client: GoogleCalendarClient;
  calendarId: string;
  eventId: string;
  bookingId: string;
  owner: ProjectionOwner;
}): Promise<ProjectionResult> {
  const { client, calendarId, eventId, bookingId, owner } = input;

  const existing = await client.getEvent(calendarId, eventId);

  if (!existing) {
    return { outcome: "already_absent" };
  }

  if (!ownsEvent(existing, owner, bookingId)) {
    return { outcome: "collision" };
  }

  await client.deleteEvent(calendarId, eventId, existing.etag);

  return { outcome: "deleted" };
}
