import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createGoogleCalendarClient,
  type GoogleCalendarClient,
} from "@/lib/google/calendar-client";
import { decryptSecret, encryptSecret, type SealedSecret } from "@/lib/google/crypto";
import {
  GoogleOAuthError,
  refreshAccessToken,
  revokeRefreshToken,
} from "@/lib/google/oauth";
import { logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reading and writing the Google connection.
 *
 * Everything goes through the service role: the connection row holds an
 * encrypted refresh token and the calendar Haab is allowed to write to, and no
 * client role has any grant on it. The plaintext token exists only inside this
 * module's call stack, never in a return value that escapes it.
 */

const CONNECTION_SELECT = `
  id, provider_id, connection_generation, google_account_email,
  refresh_token_ciphertext, refresh_token_iv, refresh_token_auth_tag,
  refresh_token_key_version, granted_scopes, target_calendar_id,
  target_calendar_summary, target_calendar_timezone, status, last_error_code,
  last_synced_at, reconciled_at, two_way_enabled, deletion_cancels_booking,
  busy_blocking_enabled
`;

export type GoogleConnectionRow = {
  id: string;
  provider_id: string;
  connection_generation: string;
  google_account_email: string | null;
  refresh_token_ciphertext: string;
  refresh_token_iv: string;
  refresh_token_auth_tag: string;
  refresh_token_key_version: number;
  granted_scopes: string[];
  target_calendar_id: string | null;
  target_calendar_summary: string | null;
  target_calendar_timezone: string | null;
  status: "connected" | "needs_reauth" | "paused" | "disconnected";
  last_error_code: string | null;
  last_synced_at: string | null;
  reconciled_at: string | null;
  /** Off until the provider opts in, having been told what it does. */
  two_way_enabled: boolean;
  deletion_cancels_booking: boolean;
  busy_blocking_enabled: boolean;
};

/** What a browser may see. Deliberately without the token or the calendar id. */
export type GoogleConnectionView = {
  connected: boolean;
  status: GoogleConnectionRow["status"];
  accountEmail: string | null;
  calendarSummary: string | null;
  calendarTimezone: string | null;
  lastSyncedAt: string | null;
  lastErrorCode: string | null;
};

export function toConnectionView(
  row: GoogleConnectionRow | null,
): GoogleConnectionView | null {
  if (!row) {
    return null;
  }

  // The calendar *id* is often the account's email address, so the summary is
  // what the UI shows and the id stays server-side.
  return {
    connected: row.status === "connected" && Boolean(row.target_calendar_id),
    status: row.status,
    accountEmail: row.google_account_email,
    calendarSummary: row.target_calendar_summary,
    calendarTimezone: row.target_calendar_timezone,
    lastSyncedAt: row.last_synced_at,
    lastErrorCode: row.last_error_code,
  };
}

export async function getConnection(
  providerId: string,
  client?: SupabaseClient,
): Promise<GoogleConnectionRow | null> {
  const admin = client ?? createAdminClient();

  const { data, error } = await admin
    .from("provider_google_calendar_connections")
    .select(CONNECTION_SELECT)
    .eq("provider_id", providerId)
    .maybeSingle<GoogleConnectionRow>();

  if (error) {
    throw new Error("Could not load the Google connection.");
  }

  return data;
}

export async function saveConnection(
  input: {
    providerId: string;
    refreshToken: string;
    grantedScopes: string[];
    accountEmail?: string;
    accountSubject?: string;
  },
  client?: SupabaseClient,
): Promise<GoogleConnectionRow> {
  const admin = client ?? createAdminClient();
  const sealed = encryptSecret(input.refreshToken);
  const existing = await getConnection(input.providerId, admin);

  if (existing) {
    // Not an upsert. The mapping foreign key points at
    // (connection_id, provider_id, connection_generation) with no ON UPDATE, so
    // rotating the generation on the live row orphans every mapping and the
    // database refuses the write — which broke reconnect for exactly the
    // providers who had projected at least one booking. Deleting first also
    // revokes the previous grant instead of overwriting the only copy of it.
    const released = await deleteConnection(input.providerId, { client: admin });

    if (!released.deleted) {
      // The old grant is still live at Google and now unrevocable if we write
      // over it. Better to fail the reconnect and keep the token that works.
      throw new Error("Could not release the previous Google connection.");
    }
  }

  const { data, error } = await admin
    .from("provider_google_calendar_connections")
    .insert(
      {
        provider_id: input.providerId,
        // A new grant is a new generation: anything in flight against the old
        // one is stale, without having to hunt it down.
        connection_generation: crypto.randomUUID(),
        google_account_email: input.accountEmail ?? null,
        google_account_subject: input.accountSubject ?? null,
        refresh_token_ciphertext: sealed.ciphertext,
        refresh_token_iv: sealed.iv,
        refresh_token_auth_tag: sealed.authTag,
        refresh_token_key_version: sealed.keyVersion,
        granted_scopes: input.grantedScopes,
        status: "connected",
        last_error_code: null,
        // A reconnect starts over. The previous calendar may belong to a
        // different Google account entirely, so keeping it selected would point
        // the new grant at a calendar the new account may not even have.
        target_calendar_id: null,
        target_calendar_summary: null,
        target_calendar_timezone: null,
        reconciled_at: null,
      },
    )
    .select(CONNECTION_SELECT)
    .single<GoogleConnectionRow>();

  if (error) {
    throw new Error("Could not save the Google connection.");
  }

  return data;
}

export async function setTargetCalendar(
  input: {
    providerId: string;
    calendarId: string;
    summary: string;
    timeZone?: string;
  },
  client?: SupabaseClient,
) {
  const admin = client ?? createAdminClient();

  const { error } = await admin
    .from("provider_google_calendar_connections")
    .update({
      target_calendar_id: input.calendarId,
      target_calendar_summary: input.summary,
      target_calendar_timezone: input.timeZone ?? null,
    })
    .eq("provider_id", input.providerId);

  if (error) {
    throw new Error("Could not select the Google calendar.");
  }
}

export async function markConnectionStatus(
  input: {
    providerId: string;
    status: GoogleConnectionRow["status"];
    errorCode?: string | null;
  },
  client?: SupabaseClient,
) {
  const admin = client ?? createAdminClient();

  await admin
    .from("provider_google_calendar_connections")
    .update({ status: input.status, last_error_code: input.errorCode ?? null })
    .eq("provider_id", input.providerId);
}

/**
 * Removes the connection and everything derived from it.
 *
 * Always available, entitlement or not: a provider must be able to revoke
 * access to their own calendar even after their plan lapses, and account
 * deletion depends on this working unconditionally.
 */
export async function deleteConnection(
  providerId: string,
  options: { client?: SupabaseClient; fetchImpl?: typeof fetch } = {},
): Promise<{ deleted: boolean; revoked: boolean; revocationQueued: boolean }> {
  const admin = options.client ?? createAdminClient();
  const connection = await getConnection(providerId, admin);

  if (!connection) {
    return { deleted: true, revoked: false, revocationQueued: false };
  }

  let revoked = false;
  let revocationQueued = false;
  let sealed: SealedSecret | undefined;

  try {
    sealed = {
      ciphertext: connection.refresh_token_ciphertext,
      iv: connection.refresh_token_iv,
      authTag: connection.refresh_token_auth_tag,
      keyVersion: connection.refresh_token_key_version,
    };

    revoked = await revokeRefreshToken(decryptSecret(sealed), options.fetchImpl);
  } catch {
    // An unopenable token cannot be revoked. Nothing more to try, and no point
    // queueing a job that would fail the same way.
    sealed = undefined;
  }

  if (!revoked && sealed) {
    // Google was unreachable. The row is about to be deleted, so the sealed
    // token is carried into a job that survives it — otherwise the grant stays
    // alive at Google with nothing left to revoke it from.
    const { error } = await admin.from("google_revocation_jobs").insert({
      provider_id: providerId,
      refresh_token_ciphertext: sealed.ciphertext,
      refresh_token_iv: sealed.iv,
      refresh_token_auth_tag: sealed.authTag,
      refresh_token_key_version: sealed.keyVersion,
    });

    revocationQueued = !error;

    if (error) {
      // Deleting now would strand the grant with no way to revoke it. Better to
      // fail the disconnect and let the provider try again.
      logger.error("google.revocation.failed", {
        providerId,
        errorCode: "revocation_job_write_failed",
      });
      return { deleted: false, revoked: false, revocationQueued: false };
    }

    logger.info("google.revocation.enqueued", { providerId });
  }

  // Mappings and reconciliation jobs cascade from the connection row.
  const { error: deleteError } = await admin
    .from("provider_google_calendar_connections")
    .delete()
    .eq("provider_id", providerId);

  if (deleteError) {
    return { deleted: false, revoked, revocationQueued };
  }

  logger.info("google.connection.disconnected", { providerId });

  return { deleted: true, revoked, revocationQueued };
}

/**
 * Retries the revocations Google was not available for.
 *
 * The job holds the sealed token and nothing that identifies a person. On
 * success — or once the attempts are spent — the row goes, so the ciphertext
 * does not linger.
 */
export async function runGoogleRevocationWorker(
  options: { client?: SupabaseClient; fetchImpl?: typeof fetch; workerId?: string } = {},
): Promise<{ claimed: boolean; revoked: boolean }> {
  const admin = options.client ?? createAdminClient();
  const workerId = options.workerId ?? `google-revoke-${randomUUID()}`;

  const { data: job, error } = await admin.rpc("claim_google_revocation_job", {
    p_worker_id: workerId,
  });

  if (error) {
    throw new Error("Could not claim a Google revocation job.");
  }

  // Same as the reconciliation claim: an empty claim comes back as a row of
  // nulls, not as null, so the id is the real test.
  const claimed = job as null | {
    id: string;
    provider_id: string | null;
    refresh_token_ciphertext: string;
    refresh_token_iv: string;
    refresh_token_auth_tag: string;
    refresh_token_key_version: number;
    attempt_count: number;
  };

  if (!claimed?.id) {
    return { claimed: false, revoked: false };
  }

  let revoked = false;

  try {
    revoked = await revokeRefreshToken(
      decryptSecret({
        ciphertext: claimed.refresh_token_ciphertext,
        iv: claimed.refresh_token_iv,
        authTag: claimed.refresh_token_auth_tag,
        keyVersion: claimed.refresh_token_key_version,
      }),
      options.fetchImpl,
    );
  } catch {
    revoked = false;
  }

  const exhausted = claimed.attempt_count >= 8;

  if (revoked || exhausted) {
    await admin
      .from("google_revocation_jobs")
      .update({
        status: revoked ? "completed" : "dead_letter",
        completed_at: new Date().toISOString(),
        last_error_code: revoked ? null : "revocation_attempts_exhausted",
      })
      .eq("id", claimed.id);

    logger.info(revoked ? "google.revocation.completed" : "google.revocation.failed", {
      providerId: claimed.provider_id ?? undefined,
      attemptCount: claimed.attempt_count,
    });
  }

  return { claimed: true, revoked };
}

/**
 * An authorized client for this connection.
 *
 * The access token is fetched fresh from the refresh token every time rather
 * than stored: an access token lives an hour, and keeping one in the database
 * would be a second secret to protect for no benefit.
 */
export async function createClientForConnection(
  connection: GoogleConnectionRow,
  options: { fetchImpl?: typeof fetch; client?: SupabaseClient } = {},
): Promise<GoogleCalendarClient> {
  const refreshToken = decryptSecret({
    ciphertext: connection.refresh_token_ciphertext,
    iv: connection.refresh_token_iv,
    authTag: connection.refresh_token_auth_tag,
    keyVersion: connection.refresh_token_key_version,
  });

  try {
    const tokens = await refreshAccessToken(refreshToken, options.fetchImpl);

    // Google returns a refresh token only when it issues a new grant. Writing
    // an undefined over the stored one would destroy the connection.
    if (tokens.refreshToken && tokens.refreshToken !== refreshToken) {
      const sealed = encryptSecret(tokens.refreshToken);
      const admin = options.client ?? createAdminClient();

      await admin
        .from("provider_google_calendar_connections")
        .update({
          refresh_token_ciphertext: sealed.ciphertext,
          refresh_token_iv: sealed.iv,
          refresh_token_auth_tag: sealed.authTag,
          refresh_token_key_version: sealed.keyVersion,
        })
        .eq("id", connection.id);
    }

    return createGoogleCalendarClient({
      accessToken: tokens.accessToken,
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    // A refused refresh means the user revoked access or the grant expired.
    // The connection needs a human, so it is marked rather than retried.
    if (error instanceof GoogleOAuthError && !error.retryable) {
      await markConnectionStatus(
        {
          providerId: connection.provider_id,
          status: "needs_reauth",
          errorCode: error.code,
        },
        options.client,
      );
    }

    throw error;
  }
}
