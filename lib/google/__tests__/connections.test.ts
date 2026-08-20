import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("Connection tests must inject a client.");
  },
}));

import { encryptSecret } from "@/lib/google/crypto";
import {
  createClientForConnection,
  deleteConnection,
  runGoogleRevocationWorker,
  getConnection,
  markConnectionStatus,
  saveConnection,
  setTargetCalendar,
  toConnectionView,
  type GoogleConnectionRow,
} from "@/lib/google/connections";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const REFRESH = "1//0g-stored-refresh-token";

function sealedRow(overrides: Partial<GoogleConnectionRow> = {}): GoogleConnectionRow {
  const sealed = encryptSecret(REFRESH);

  return {
    id: "conn-1",
    provider_id: PROVIDER,
    connection_generation: "gen-1",
    google_account_email: "owner@example.invalid",
    refresh_token_ciphertext: sealed.ciphertext,
    refresh_token_iv: sealed.iv,
    refresh_token_auth_tag: sealed.authTag,
    refresh_token_key_version: sealed.keyVersion,
    granted_scopes: ["https://www.googleapis.com/auth/calendar.events"],
    target_calendar_id: "owner@example.invalid",
    target_calendar_summary: "Work",
    target_calendar_timezone: "America/Mexico_City",
    status: "connected",
    last_error_code: null,
    last_synced_at: null,
    reconciled_at: null,
    two_way_enabled: false,
    deletion_cancels_booking: false,
    busy_blocking_enabled: false,
    ...overrides,
  };
}

function makeClient(
  row: GoogleConnectionRow | null = sealedRow(),
  options?: { insertError?: { message: string }; deleteError?: { message: string } },
) {
  const writes: Array<{ op: string; payload: unknown }> = [];

  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: row, error: null }),
    single: async () => ({ data: row, error: null }),
    update: (payload: unknown) => {
      writes.push({ op: "update", payload });
      return { ...query, eq: async () => ({ error: null }) };
    },
    upsert: (payload: unknown) => {
      writes.push({ op: "upsert", payload });
      return query;
    },
    // Awaitable for the revocation job, chainable for the connection row, which
    // reads its insert back through .select().single().
    insert: (payload: unknown) => {
      writes.push({ op: "insert", payload });
      const result = { error: options?.insertError ?? null };

      return {
        ...query,
        select: () => query,
        then: (resolve: (value: typeof result) => unknown) => resolve(result),
      };
    },
    delete: () => {
      writes.push({ op: "delete", payload: null });
      return { eq: async () => ({ error: options?.deleteError ?? null }) };
    },
  };

  // saveConnection releases the old grant through deleteConnection, which uses
  // the global fetch. Recording it in `writes` is what makes "revoked before
  // the new ciphertext was written" an assertion about order rather than a
  // guess.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      writes.push({ op: "revoke", payload: String(init?.body ?? "") });
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );

  return {
    client: { from: (table: string) => ({ ...query, table }) } as unknown as SupabaseClient,
    writes,
  };
}

/**
 * The write that stores the connection itself.
 *
 * A reconnect also writes a revocation job, which carries ciphertext too; the
 * generation is what tells the two apart.
 */
function connectionWrite(writes: Array<{ op: string; payload: unknown }>) {
  return writes.find(
    (write) =>
      write.op === "insert" &&
      typeof write.payload === "object" &&
      write.payload !== null &&
      "connection_generation" in write.payload,
  );
}

function tokenFetch(body: Record<string, unknown>, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  vi.stubEnv("GOOGLE_OAUTH_REDIRECT_URI", "https://haab.test/cb");
  vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 9).toString("base64"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("toConnectionView", () => {
  it("hides the calendar id, which is usually an email address", () => {
    const view = toConnectionView(sealedRow());

    expect(view).toEqual({
      connected: true,
      status: "connected",
      accountEmail: "owner@example.invalid",
      calendarSummary: "Work",
      calendarTimezone: "America/Mexico_City",
      lastSyncedAt: null,
      lastErrorCode: null,
    });
    expect(view).not.toHaveProperty("target_calendar_id");
  });

  it("never exposes the sealed token", () => {
    expect(JSON.stringify(toConnectionView(sealedRow()))).not.toMatch(
      /ciphertext|auth_tag|iv/,
    );
  });

  it("is not connected until a calendar has been chosen", () => {
    expect(toConnectionView(sealedRow({ target_calendar_id: null }))?.connected).toBe(
      false,
    );
  });

  it("is not connected when the grant needs renewing", () => {
    expect(toConnectionView(sealedRow({ status: "needs_reauth" }))?.connected).toBe(false);
  });

  it("has nothing to say about a provider with no connection", () => {
    expect(toConnectionView(null)).toBeNull();
  });
});

describe("getConnection", () => {
  it("returns the stored row", async () => {
    const { client } = makeClient();

    await expect(getConnection(PROVIDER, client)).resolves.toMatchObject({
      provider_id: PROVIDER,
    });
  });

  it("returns nothing for a provider that never connected", async () => {
    const { client } = makeClient(null);

    await expect(getConnection(PROVIDER, client)).resolves.toBeNull();
  });
});

describe("saveConnection", () => {
  it("seals the refresh token before it reaches the database", async () => {
    const { client, writes } = makeClient();

    await saveConnection(
      {
        providerId: PROVIDER,
        refreshToken: REFRESH,
        grantedScopes: ["scope"],
        accountEmail: "owner@example.invalid",
      },
      client,
    );

    const payload = connectionWrite(writes)!.payload as Record<string, unknown>;
    expect(JSON.stringify(payload)).not.toContain(REFRESH);
    expect(payload.refresh_token_ciphertext).toEqual(expect.any(String));
    expect(payload.refresh_token_key_version).toBe(1);
  });

  it("inserts without deleting anything on a first connect", async () => {
    const { client, writes } = makeClient(null);

    await saveConnection(
      { providerId: PROVIDER, refreshToken: REFRESH, grantedScopes: [] },
      client,
    );

    expect(writes.some((write) => write.op === "delete")).toBe(false);
    expect(connectionWrite(writes)?.op).toBe("insert");
  });

  it("deletes the old connection before inserting the new one", async () => {
    // Not an upsert: the mapping foreign key has no ON UPDATE, so rotating the
    // generation on the live row is rejected once any booking is projected.
    const { client, writes } = makeClient();

    await saveConnection(
      { providerId: PROVIDER, refreshToken: REFRESH, grantedScopes: [] },
      client,
    );

    const deletedAt = writes.findIndex((write) => write.op === "delete");
    const inserted = connectionWrite(writes);

    expect(deletedAt).toBeGreaterThanOrEqual(0);
    expect(writes.indexOf(inserted!)).toBeGreaterThan(deletedAt);

    const payload = inserted!.payload as Record<string, unknown>;
    expect(payload.connection_generation).toEqual(expect.any(String));
    expect(payload.connection_generation).not.toBe("gen-1");
    expect(payload.status).toBe("connected");
  });

  it("revokes the previous grant before the new ciphertext is written", async () => {
    const { client, writes } = makeClient();

    await saveConnection(
      { providerId: PROVIDER, refreshToken: "1//0g-new-refresh-token", grantedScopes: [] },
      client,
    );

    const revokedAt = writes.findIndex((write) => write.op === "revoke");
    expect(revokedAt).toBeGreaterThanOrEqual(0);
    expect(writes.indexOf(connectionWrite(writes)!)).toBeGreaterThan(revokedAt);

    // The token revoked is the old one, not the one being stored.
    expect(String(writes[revokedAt].payload)).toContain(encodeURIComponent(REFRESH));
  });

  it("writes nothing when the previous connection cannot be released", async () => {
    // Overwriting the only copy of a grant that is still live at Google leaves
    // nothing able to revoke it. Failing the reconnect keeps the token that
    // works.
    const { client, writes } = makeClient(sealedRow(), {
      deleteError: { message: "nope" },
    });

    await expect(
      saveConnection(
        { providerId: PROVIDER, refreshToken: REFRESH, grantedScopes: [] },
        client,
      ),
    ).rejects.toThrow();

    expect(connectionWrite(writes)).toBeUndefined();
  });
});

describe("setTargetCalendar and markConnectionStatus", () => {
  it("stores the chosen calendar with its label", async () => {
    const { client, writes } = makeClient();

    await setTargetCalendar(
      { providerId: PROVIDER, calendarId: "cal-1", summary: "Work", timeZone: "UTC" },
      client,
    );

    expect(writes[0].payload).toMatchObject({
      target_calendar_id: "cal-1",
      target_calendar_summary: "Work",
      target_calendar_timezone: "UTC",
    });
  });

  it("records a status change with its code", async () => {
    const { client, writes } = makeClient();

    await markConnectionStatus(
      { providerId: PROVIDER, status: "needs_reauth", errorCode: "token_rejected" },
      client,
    );

    expect(writes[0].payload).toEqual({
      status: "needs_reauth",
      last_error_code: "token_rejected",
    });
  });
});

describe("createClientForConnection", () => {
  it("mints an access token from the stored refresh token", async () => {
    const { client } = makeClient();
    const fetchImpl = tokenFetch({ access_token: "ya29.new", expires_in: 3600 });

    const google = await createClientForConnection(sealedRow(), { fetchImpl, client });

    expect(google.listCalendars).toBeTypeOf("function");
    const body = String(
      (
        (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
          .calls[0][1] as RequestInit
      ).body,
    );
    expect(body).toContain("grant_type=refresh_token");
  });

  it("keeps the stored token when Google returns none", async () => {
    const { client, writes } = makeClient();

    await createClientForConnection(sealedRow(), {
      fetchImpl: tokenFetch({ access_token: "ya29.new", expires_in: 3600 }),
      client,
    });

    // Writing an undefined over the stored refresh token would kill the
    // connection at the next expiry.
    expect(writes.filter((write) => write.op === "update")).toHaveLength(0);
  });

  it("stores a rotated refresh token when Google issues one", async () => {
    const { client, writes } = makeClient();

    await createClientForConnection(sealedRow(), {
      fetchImpl: tokenFetch({
        access_token: "ya29.new",
        refresh_token: "1//rotated",
        expires_in: 3600,
      }),
      client,
    });

    const update = writes.find((write) => write.op === "update");
    expect(JSON.stringify(update?.payload)).not.toContain("1//rotated");
    expect(update?.payload).toMatchObject({
      refresh_token_ciphertext: expect.any(String),
    });
  });

  it("marks the connection for reauth when the grant was revoked", async () => {
    const { client, writes } = makeClient();

    await expect(
      createClientForConnection(sealedRow(), {
        fetchImpl: tokenFetch({ error: "invalid_grant" }, 400),
        client,
      }),
    ).rejects.toMatchObject({ code: "token_rejected" });

    expect(writes.find((write) => write.op === "update")?.payload).toMatchObject({
      status: "needs_reauth",
    });
  });

  it("leaves the status alone for a transient Google failure", async () => {
    const { client, writes } = makeClient();

    await expect(
      createClientForConnection(sealedRow(), {
        fetchImpl: tokenFetch({}, 503),
        client,
      }),
    ).rejects.toMatchObject({ retryable: true });

    // An outage is not a revoked grant; forcing a reconnect would be wrong.
    expect(writes).toHaveLength(0);
  });
});

describe("deleteConnection", () => {
  it("revokes at Google as well as deleting locally", async () => {
    const { client, writes } = makeClient();
    const fetchImpl = tokenFetch({});

    await deleteConnection(PROVIDER, { client, fetchImpl });

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/revoke");
    expect(String((init as RequestInit).body)).toContain(encodeURIComponent(REFRESH));
    expect(writes.some((write) => write.op === "delete")).toBe(true);
  });

  it("queues a revocation job when Google cannot be reached, then deletes", async () => {
    const { client, writes } = makeClient();
    const failing = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    // A provider disconnecting must never be blocked by Google being down —
    // but the grant must not be stranded either, so the sealed token moves into
    // a job that outlives the connection row.
    const result = await deleteConnection(PROVIDER, { client, fetchImpl: failing });

    expect(result).toMatchObject({ deleted: true, revoked: false, revocationQueued: true });
    const queued = writes.find((write) => write.op === "insert");
    expect(queued?.payload).toMatchObject({
      provider_id: PROVIDER,
      refresh_token_key_version: 1,
    });
    // The job carries ciphertext, never the token itself.
    expect(JSON.stringify(queued?.payload)).not.toContain(REFRESH);
    expect(writes.some((write) => write.op === "delete")).toBe(true);
  });

  it("refuses to delete when the revocation job could not be queued", async () => {
    const { client, writes } = makeClient(sealedRow(), {
      insertError: { message: "read only" },
    });
    const failing = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    const result = await deleteConnection(PROVIDER, { client, fetchImpl: failing });

    // Deleting here would leave the grant alive at Google with nothing left to
    // revoke it from.
    expect(result.deleted).toBe(false);
    expect(writes.some((write) => write.op === "delete")).toBe(false);
  });

  it("reports a failed deletion rather than claiming success", async () => {
    const { client } = makeClient(sealedRow(), { deleteError: { message: "denied" } });

    const result = await deleteConnection(PROVIDER, {
      client,
      fetchImpl: tokenFetch({}),
    });

    expect(result.deleted).toBe(false);
  });

  it("does not queue a job when revocation already succeeded", async () => {
    const { client, writes } = makeClient();

    const result = await deleteConnection(PROVIDER, { client, fetchImpl: tokenFetch({}) });

    expect(result).toMatchObject({ revoked: true, revocationQueued: false });
    expect(writes.some((write) => write.op === "insert")).toBe(false);
  });

  it("still deletes when the stored token cannot be opened", async () => {
    const { client, writes } = makeClient(
      sealedRow({ refresh_token_ciphertext: "not-real-ciphertext" }),
    );

    await deleteConnection(PROVIDER, { client, fetchImpl: tokenFetch({}) });

    expect(writes.some((write) => write.op === "delete")).toBe(true);
  });

  it("has nothing to do for a provider with no connection", async () => {
    const { client, writes } = makeClient(null);

    const result = await deleteConnection(PROVIDER, { client, fetchImpl: tokenFetch({}) });

    expect(result).toEqual({ deleted: true, revoked: false, revocationQueued: false });
    expect(writes).toHaveLength(0);
  });
});

describe("runGoogleRevocationWorker", () => {
  function workerClient(job: Record<string, unknown> | null) {
    const writes: Array<{ op: string; payload: unknown }> = [];

    const query = {
      update: (payload: unknown) => {
        writes.push({ op: "update", payload });
        return { eq: async () => ({ error: null }) };
      },
    };

    return {
      client: {
        rpc: async () => ({ data: job, error: null }),
        from: () => query,
      } as unknown as SupabaseClient,
      writes,
    };
  }

  it("treats an all-null claim row as no job at all", async () => {
    // The RPC returns SQL NULL when nothing is claimable, but PostgREST hands
    // that back as an object of nulls. Believing it meant reporting a claim
    // that never happened.
    const { client, writes } = workerClient({
      id: null,
      provider_id: null,
      refresh_token_ciphertext: null,
      refresh_token_iv: null,
      refresh_token_auth_tag: null,
      refresh_token_key_version: null,
      attempt_count: null,
    });

    const result = await runGoogleRevocationWorker({
      client,
      fetchImpl: tokenFetch({}),
    });

    expect(result).toEqual({ claimed: false, revoked: false });
    expect(writes).toHaveLength(0);
  });

  it("does nothing when the claim is genuinely null", async () => {
    const { client } = workerClient(null);

    await expect(
      runGoogleRevocationWorker({ client, fetchImpl: tokenFetch({}) }),
    ).resolves.toEqual({ claimed: false, revoked: false });
  });

  it("revokes a real job and marks it completed", async () => {
    const sealed = encryptSecret(REFRESH);
    const { client, writes } = workerClient({
      id: "job-1",
      provider_id: PROVIDER,
      refresh_token_ciphertext: sealed.ciphertext,
      refresh_token_iv: sealed.iv,
      refresh_token_auth_tag: sealed.authTag,
      refresh_token_key_version: sealed.keyVersion,
      attempt_count: 1,
    });

    const result = await runGoogleRevocationWorker({
      client,
      fetchImpl: tokenFetch({}),
    });

    expect(result).toEqual({ claimed: true, revoked: true });
    expect(writes[0].payload).toMatchObject({ status: "completed" });
  });

  it("dead-letters once the attempts are spent", async () => {
    const sealed = encryptSecret(REFRESH);
    const failing = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    const { client, writes } = workerClient({
      id: "job-1",
      provider_id: PROVIDER,
      refresh_token_ciphertext: sealed.ciphertext,
      refresh_token_iv: sealed.iv,
      refresh_token_auth_tag: sealed.authTag,
      refresh_token_key_version: sealed.keyVersion,
      attempt_count: 8,
    });

    const result = await runGoogleRevocationWorker({ client, fetchImpl: failing });

    expect(result).toEqual({ claimed: true, revoked: false });
    expect(writes[0].payload).toMatchObject({
      status: "dead_letter",
      last_error_code: "revocation_attempts_exhausted",
    });
  });

  it("leaves a job alone while it still has attempts left", async () => {
    const sealed = encryptSecret(REFRESH);
    const failing = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    const { client, writes } = workerClient({
      id: "job-1",
      provider_id: PROVIDER,
      refresh_token_ciphertext: sealed.ciphertext,
      refresh_token_iv: sealed.iv,
      refresh_token_auth_tag: sealed.authTag,
      refresh_token_key_version: sealed.keyVersion,
      attempt_count: 2,
    });

    await runGoogleRevocationWorker({ client, fetchImpl: failing });

    // The claim already pushed available_at forward; nothing else to write.
    expect(writes).toHaveLength(0);
  });
});
