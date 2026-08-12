import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  deleteBlobs: vi.fn(),
  requireSuperAdmin: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@vercel/blob", () => ({
  del: mocks.deleteBlobs,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/supabase/publication", () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}));

import {
  collectVercelBlobUrls,
  deleteManagedAccount,
  isVercelBlobUrl,
  listAccountDeletionCleanupJobs,
  normalizeAccountEmail,
  retryAccountDeletionCleanup,
  validateAccountDeletionTarget,
} from "@/lib/supabase/account-deletion";

type CleanupRow = {
  id: string;
  target_user_id: string;
  blob_urls: string[];
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

function makeAdmin(options?: {
  targetEmail?: string | null;
  providerRows?: Array<{
    logo_image_url: string | null;
    header_image_url: string | null;
    gallery_image_urls: unknown;
  }>;
  authDeleteError?: Error;
  cleanupInsertError?: Error;
  cleanupDeleteError?: Error;
  cleanupUpdateError?: Error;
  initialJobs?: CleanupRow[];
}) {
  const targetEmail = options?.targetEmail === undefined
    ? "target@example.com"
    : options.targetEmail;
  const actions: string[] = [];
  const jobs = new Map(
    (options?.initialJobs ?? []).map((job) => [job.id, { ...job }]),
  );

  const providerQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  providerQuery.select = vi.fn(() => providerQuery);
  providerQuery.eq = vi.fn(() => providerQuery);
  providerQuery.returns = vi.fn(async () => ({
    data: options?.providerRows ?? [],
    error: null,
  }));

  const cleanupTable = {
    insert: vi.fn(async (value: CleanupRow) => {
      actions.push("cleanup-insert");
      if (options?.cleanupInsertError) {
        return { error: options.cleanupInsertError };
      }
      jobs.set(value.id, { ...value });
      return { error: null };
    }),
    delete: vi.fn(() => ({
      eq: vi.fn(async (_column: string, id: string) => {
        actions.push("cleanup-delete");
        if (options?.cleanupDeleteError) {
          return { error: options.cleanupDeleteError };
        }
        jobs.delete(id);
        return { error: null };
      }),
    })),
    update: vi.fn((value: Partial<CleanupRow>) => ({
      eq: vi.fn(async (_column: string, id: string) => {
        actions.push("cleanup-update");
        if (options?.cleanupUpdateError) {
          return { error: options.cleanupUpdateError };
        }
        const current = jobs.get(id);
        if (current) jobs.set(id, { ...current, ...value });
        return { error: null };
      }),
    })),
    select: vi.fn(() => {
      const query = {
        order: vi.fn(async () => ({
          data: [...jobs.values()],
          error: null,
        })),
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => {
            const first = [...jobs.values()][0] ?? null;
            return { data: first, error: null };
          }),
        })),
      };
      return query;
    }),
  };

  const auth = {
    admin: {
      getUserById: vi.fn(async () => ({
        data: { user: targetEmail ? { id: "target-user", email: targetEmail } : null },
        error: null,
      })),
      deleteUser: vi.fn(async () => {
        actions.push("auth-delete");
        return options?.authDeleteError
          ? { data: { user: null }, error: options.authDeleteError }
          : {
              data: {
                user: targetEmail
                  ? { id: "target-user", email: targetEmail }
                  : null,
              },
              error: null,
            };
      }),
    },
  };

  return {
    client: {
      auth,
      from: vi.fn((table: string) => {
        if (table === "providers") return providerQuery;
        if (table === "account_deletion_cleanup_jobs") return cleanupTable;
        throw new Error(`Unexpected table: ${table}`);
      }),
    },
    actions,
    jobs,
  };
}

describe("account deletion policy", () => {
  it("normalizes surrounding whitespace and email case", () => {
    expect(normalizeAccountEmail(" Target.User@Example.COM ")).toBe(
      "target.user@example.com",
    );
  });

  it("rejects a confirmation email that does not identify the target", () => {
    expect(() =>
      validateAccountDeletionTarget(
        "target@example.com",
        "different@example.com",
      ),
    ).toThrowError(
      expect.objectContaining({ code: "confirmation_mismatch" }),
    );
  });

  it("blocks deletion of the sole super-admin account", () => {
    expect(() =>
      validateAccountDeletionTarget(
        "bsorianodev@gmail.com",
        " BSORIANODEV@gmail.com ",
      ),
    ).toThrowError(expect.objectContaining({ code: "protected_account" }));
  });

  it("allows an exactly confirmed demo-owner account", () => {
    expect(() =>
      validateAccountDeletionTarget(
        "public-examples+doctors@haab-calendar.invalid",
        " PUBLIC-EXAMPLES+DOCTORS@haab-calendar.invalid ",
      ),
    ).not.toThrow();
  });

  it.each([
    "https://store.public.blob.vercel-storage.com/provider-headers/header.png",
    "https://store.private.blob.vercel-storage.com/provider-logos/logo.webp",
  ])("recognizes a Vercel Blob URL: %s", (url) => {
    expect(isVercelBlobUrl(url)).toBe(true);
  });

  it.each([
    "http://store.public.blob.vercel-storage.com/header.png",
    "https://blob.vercel-storage.com.evil.example/header.png",
    "https://cdn.example.com/header.png",
    "not-a-url",
  ])("rejects a non-Vercel Blob URL: %s", (url) => {
    expect(isVercelBlobUrl(url)).toBe(false);
  });

  it("collects current logo, header, and gallery blobs without duplicates", () => {
    expect(
      collectVercelBlobUrls([
        {
          logo_image_url:
            "https://store.public.blob.vercel-storage.com/provider-logos/logo.png",
          header_image_url:
            "https://store.public.blob.vercel-storage.com/provider-headers/header.png",
          gallery_image_urls: [
            "https://store.public.blob.vercel-storage.com/provider-gallery/one.png",
            "https://cdn.example.com/external.png",
          ],
        },
        {
          logo_image_url:
            "https://store.public.blob.vercel-storage.com/provider-logos/logo.png",
          header_image_url: null,
          gallery_image_urls: [
            "https://store.public.blob.vercel-storage.com/provider-gallery/two.png",
          ],
        },
      ]),
    ).toEqual([
      "https://store.public.blob.vercel-storage.com/provider-logos/logo.png",
      "https://store.public.blob.vercel-storage.com/provider-headers/header.png",
      "https://store.public.blob.vercel-storage.com/provider-gallery/one.png",
      "https://store.public.blob.vercel-storage.com/provider-gallery/two.png",
    ]);
  });
});

describe("account deletion orchestration", () => {
  beforeEach(() => {
    mocks.createAdminClient.mockReset();
    mocks.deleteBlobs.mockReset();
    mocks.requireSuperAdmin.mockReset();
    mocks.requireSuperAdmin.mockResolvedValue({
      id: "super-admin",
      email: "bsorianodev@gmail.com",
    });
    mocks.deleteBlobs.mockResolvedValue(undefined);
  });

  it("stops before privileged operations when caller is unauthorized", async () => {
    mocks.requireSuperAdmin.mockRejectedValue(new Error("Not found."));

    await expect(
      deleteManagedAccount("target-user", "target@example.com"),
    ).rejects.toThrow("Not found.");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects mismatched confirmation without deleting account", async () => {
    const admin = makeAdmin();
    mocks.createAdminClient.mockReturnValue(admin.client);

    await expect(
      deleteManagedAccount("target-user", "wrong@example.com"),
    ).rejects.toMatchObject({ code: "confirmation_mismatch" });
    expect(admin.actions).toEqual([]);
  });

  it("blocks sole super-admin deletion server-side", async () => {
    const admin = makeAdmin({ targetEmail: "BSorianoDev@gmail.com" });
    mocks.createAdminClient.mockReturnValue(admin.client);

    await expect(
      deleteManagedAccount("super-admin", "bsorianodev@gmail.com"),
    ).rejects.toMatchObject({ code: "protected_account" });
    expect(admin.actions).toEqual([]);
  });

  it("allows hard deletion of a confirmed demo-owner account", async () => {
    const admin = makeAdmin({
      targetEmail: "public-examples+doctors@haab-calendar.invalid",
    });
    mocks.createAdminClient.mockReturnValue(admin.client);

    await expect(
      deleteManagedAccount(
        "target-user",
        "public-examples+doctors@haab-calendar.invalid",
      ),
    ).resolves.toEqual({ userId: "target-user", cleanupPending: false });
    expect(admin.actions).toEqual(["auth-delete"]);
    expect(admin.client.auth.admin.deleteUser).toHaveBeenCalledWith(
      "target-user",
      false,
    );
  });

  it("deletes an account without creating cleanup when no current blobs exist", async () => {
    const admin = makeAdmin({
      providerRows: [
        {
          logo_image_url: "https://cdn.example.com/logo.png",
          header_image_url: null,
          gallery_image_urls: [],
        },
      ],
    });
    mocks.createAdminClient.mockReturnValue(admin.client);

    await expect(
      deleteManagedAccount("target-user", "target@example.com"),
    ).resolves.toEqual({ userId: "target-user", cleanupPending: false });
    expect(admin.actions).toEqual(["auth-delete"]);
    expect(mocks.deleteBlobs).not.toHaveBeenCalled();
  });

  it("persists cleanup before hard deletion then removes blobs and job", async () => {
    const blobUrl =
      "https://store.public.blob.vercel-storage.com/provider-logos/logo.png";
    const admin = makeAdmin({
      providerRows: [
        {
          logo_image_url: blobUrl,
          header_image_url: null,
          gallery_image_urls: [],
        },
      ],
    });
    mocks.createAdminClient.mockReturnValue(admin.client);
    mocks.deleteBlobs.mockImplementation(async () => {
      admin.actions.push("blob-delete");
    });

    await expect(
      deleteManagedAccount("target-user", "target@example.com"),
    ).resolves.toEqual({ userId: "target-user", cleanupPending: false });
    expect(admin.actions).toEqual([
      "cleanup-insert",
      "auth-delete",
      "blob-delete",
      "cleanup-delete",
    ]);
    expect(mocks.deleteBlobs).toHaveBeenCalledWith([blobUrl]);
    expect(admin.jobs.size).toBe(0);
  });

  it("rolls back cleanup job and leaves blobs when Auth deletion fails", async () => {
    const blobUrl =
      "https://store.public.blob.vercel-storage.com/provider-logos/logo.png";
    const admin = makeAdmin({
      providerRows: [
        {
          logo_image_url: blobUrl,
          header_image_url: null,
          gallery_image_urls: [],
        },
      ],
      authDeleteError: new Error("Auth unavailable"),
    });
    mocks.createAdminClient.mockReturnValue(admin.client);

    await expect(
      deleteManagedAccount("target-user", "target@example.com"),
    ).rejects.toMatchObject({ code: "deletion_failed" });
    expect(admin.actions).toEqual([
      "cleanup-insert",
      "auth-delete",
      "cleanup-delete",
    ]);
    expect(admin.jobs.size).toBe(0);
    expect(mocks.deleteBlobs).not.toHaveBeenCalled();
  });

  it("keeps retry state when Blob deletion fails after account deletion", async () => {
    const blobUrl =
      "https://store.public.blob.vercel-storage.com/provider-logos/logo.png";
    const admin = makeAdmin({
      providerRows: [
        {
          logo_image_url: blobUrl,
          header_image_url: null,
          gallery_image_urls: [],
        },
      ],
    });
    mocks.createAdminClient.mockReturnValue(admin.client);
    mocks.deleteBlobs.mockRejectedValue(new Error("Blob service unavailable"));

    await expect(
      deleteManagedAccount("target-user", "target@example.com"),
    ).resolves.toEqual({ userId: "target-user", cleanupPending: true });
    expect(admin.actions).toEqual([
      "cleanup-insert",
      "auth-delete",
      "cleanup-update",
    ]);
    expect([...admin.jobs.values()][0]).toMatchObject({
      attempt_count: 1,
      last_error: "Blob service unavailable",
    });
  });

  it("lists opaque cleanup summaries without deleted account data", async () => {
    const admin = makeAdmin({
      initialJobs: [
        {
          id: "cleanup-job",
          target_user_id: "deleted-user",
          blob_urls: [
            "https://store.public.blob.vercel-storage.com/provider-logos/logo.png",
          ],
          attempt_count: 2,
          last_error: "Blob service unavailable",
          created_at: "2026-08-12T12:00:00.000Z",
          updated_at: "2026-08-12T12:05:00.000Z",
        },
      ],
    });
    mocks.createAdminClient.mockReturnValue(admin.client);

    await expect(listAccountDeletionCleanupJobs()).resolves.toEqual([
      {
        id: "cleanup-job",
        attemptCount: 2,
        lastAttemptFailed: true,
        createdAt: "2026-08-12T12:00:00.000Z",
        updatedAt: "2026-08-12T12:05:00.000Z",
      },
    ]);
  });

  it("retries idempotent Blob deletion and removes successful job", async () => {
    const blobUrl =
      "https://store.public.blob.vercel-storage.com/provider-logos/logo.png";
    const admin = makeAdmin({
      targetEmail: null,
      initialJobs: [
        {
          id: "cleanup-job",
          target_user_id: "deleted-user",
          blob_urls: [blobUrl],
          attempt_count: 1,
          last_error: "Previous failure",
          created_at: "2026-08-12T12:00:00.000Z",
          updated_at: "2026-08-12T12:05:00.000Z",
        },
      ],
    });
    mocks.createAdminClient.mockReturnValue(admin.client);

    await expect(retryAccountDeletionCleanup("cleanup-job")).resolves.toEqual({
      jobId: "cleanup-job",
      cleanupPending: false,
    });
    expect(mocks.deleteBlobs).toHaveBeenCalledWith([blobUrl]);
    expect(admin.jobs.size).toBe(0);
  });

  it("removes a stale job without deleting blobs when Auth target still exists", async () => {
    const blobUrl =
      "https://store.public.blob.vercel-storage.com/provider-logos/logo.png";
    const admin = makeAdmin({
      targetEmail: "target@example.com",
      initialJobs: [
        {
          id: "cleanup-job",
          target_user_id: "target-user",
          blob_urls: [blobUrl],
          attempt_count: 1,
          last_error: "Cleanup-job rollback failed",
          created_at: "2026-08-12T12:00:00.000Z",
          updated_at: "2026-08-12T12:05:00.000Z",
        },
      ],
    });
    mocks.createAdminClient.mockReturnValue(admin.client);

    await expect(retryAccountDeletionCleanup("cleanup-job")).resolves.toEqual({
      jobId: "cleanup-job",
      cleanupPending: false,
    });
    expect(mocks.deleteBlobs).not.toHaveBeenCalled();
    expect(admin.jobs.size).toBe(0);
  });

  it("returns not found when cleanup retry job no longer exists", async () => {
    const admin = makeAdmin();
    mocks.createAdminClient.mockReturnValue(admin.client);

    await expect(
      retryAccountDeletionCleanup("missing-job"),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(mocks.deleteBlobs).not.toHaveBeenCalled();
  });
});
