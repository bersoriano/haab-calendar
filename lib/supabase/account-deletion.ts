import "server-only";

import { del } from "@vercel/blob";

import { deleteConnection } from "@/lib/google/connections";
import { SUPER_ADMIN_EMAIL } from "@/lib/super-admin-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/supabase/publication";

export type AccountDeletionErrorCode =
  | "not_found"
  | "confirmation_mismatch"
  | "protected_account"
  | "deletion_failed"
  | "cleanup_persistence_failed";

export class AccountDeletionError extends Error {
  constructor(
    public readonly code: AccountDeletionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AccountDeletionError";
  }
}

export type ProviderImageRow = {
  id: string;
  logo_image_url: string | null;
  header_image_url: string | null;
  gallery_image_urls: unknown;
};

type CleanupJobRow = {
  id: string;
  target_user_id: string;
  blob_urls: string[];
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountDeletionCleanupSummary = {
  id: string;
  attemptCount: number;
  lastAttemptFailed: boolean;
  createdAt: string;
  updatedAt: string;
};

export function normalizeAccountEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateAccountDeletionTarget(
  targetEmail: string,
  confirmationEmail: string,
) {
  const normalizedTarget = normalizeAccountEmail(targetEmail);

  if (normalizedTarget === normalizeAccountEmail(SUPER_ADMIN_EMAIL)) {
    throw new AccountDeletionError(
      "protected_account",
      "The sole super-admin account cannot be deleted.",
    );
  }

  if (normalizedTarget !== normalizeAccountEmail(confirmationEmail)) {
    throw new AccountDeletionError(
      "confirmation_mismatch",
      "Confirmation email does not match the target account.",
    );
  }
}

export function isVercelBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export function collectVercelBlobUrls(rows: ProviderImageRow[]) {
  const urls = new Set<string>();

  for (const row of rows) {
    const candidates: unknown[] = [row.logo_image_url, row.header_image_url];

    if (Array.isArray(row.gallery_image_urls)) {
      candidates.push(...row.gallery_image_urls);
    }

    for (const candidate of candidates) {
      if (typeof candidate === "string" && isVercelBlobUrl(candidate)) {
        urls.add(candidate);
      }
    }
  }

  return [...urls];
}

function boundedErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

async function removeCleanupJob(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string,
) {
  return admin
    .from("account_deletion_cleanup_jobs")
    .delete()
    .eq("id", jobId);
}

async function recordCleanupFailure(
  admin: ReturnType<typeof createAdminClient>,
  job: Pick<CleanupJobRow, "id" | "attempt_count">,
  error: unknown,
) {
  return admin
    .from("account_deletion_cleanup_jobs")
    .update({
      attempt_count: job.attempt_count + 1,
      last_error: boundedErrorMessage(error),
    })
    .eq("id", job.id);
}

export async function deleteManagedAccount(
  userId: string,
  confirmationEmail: string,
) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data: targetData, error: targetError } =
    await admin.auth.admin.getUserById(userId);
  const target = targetData?.user;

  if (targetError || !target?.email) {
    throw new AccountDeletionError("not_found", "User not found.");
  }

  validateAccountDeletionTarget(target.email, confirmationEmail);

  const { data: providers, error: providersError } = await admin
    .from("providers")
    .select("id, logo_image_url, header_image_url, gallery_image_urls")
    .eq("owner_user_id", userId)
    .returns<ProviderImageRow[]>();

  if (providersError) {
    throw new AccountDeletionError(
      "cleanup_persistence_failed",
      "Could not prepare account deletion.",
    );
  }

  const blobUrls = collectVercelBlobUrls(providers ?? []);
  const cleanupJobId = blobUrls.length > 0 ? crypto.randomUUID() : undefined;

  if (cleanupJobId) {
    const { error: insertError } = await admin
      .from("account_deletion_cleanup_jobs")
      .insert({
        id: cleanupJobId,
        target_user_id: userId,
        blob_urls: blobUrls,
      });

    if (insertError) {
      throw new AccountDeletionError(
        "cleanup_persistence_failed",
        "Could not prepare account deletion.",
      );
    }
  }

  const rollbackCleanupJob = async () => {
    if (!cleanupJobId) return;

    const { error: rollbackError } = await removeCleanupJob(
      admin,
      cleanupJobId,
    );
    if (rollbackError) {
      console.error("account_deletion_cleanup_job_rollback_failed", {
        cleanupJobId,
        error: boundedErrorMessage(rollbackError),
      });
    }
  };

  // Deleting the auth user cascades providers, and providers cascade the Google
  // connection rows with the only copy of the sealed refresh token. Revoking
  // has to happen while that token still exists, or the grant stays alive at
  // Google with nothing left to revoke it from.
  for (const provider of providers ?? []) {
    const { deleted } = await deleteConnection(provider.id);

    if (!deleted) {
      await rollbackCleanupJob();

      throw new AccountDeletionError(
        "deletion_failed",
        "Could not revoke the Google connection for this account.",
      );
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(
    userId,
    false,
  );

  if (deleteError) {
    await rollbackCleanupJob();

    throw new AccountDeletionError(
      "deletion_failed",
      "Could not delete account.",
    );
  }

  if (!cleanupJobId) {
    return { userId, cleanupPending: false } as const;
  }

  try {
    await del(blobUrls);
  } catch (error) {
    const { error: updateError } = await recordCleanupFailure(
      admin,
      { id: cleanupJobId, attempt_count: 0 },
      error,
    );
    if (updateError) {
      console.error("account_deletion_cleanup_failure_record_failed", {
        cleanupJobId,
        error: boundedErrorMessage(updateError),
      });
    }
    return { userId, cleanupPending: true } as const;
  }

  const { error: cleanupDeleteError } = await removeCleanupJob(
    admin,
    cleanupJobId,
  );

  return {
    userId,
    cleanupPending: Boolean(cleanupDeleteError),
  } as const;
}

export async function listAccountDeletionCleanupJobs(): Promise<
  AccountDeletionCleanupSummary[]
> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_deletion_cleanup_jobs")
    .select("id, attempt_count, last_error, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as Pick<
    CleanupJobRow,
    "id" | "attempt_count" | "last_error" | "created_at" | "updated_at"
  >[]).map((job) => ({
    id: job.id,
    attemptCount: job.attempt_count,
    lastAttemptFailed: Boolean(job.last_error),
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  }));
}

export async function retryAccountDeletionCleanup(jobId: string) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_deletion_cleanup_jobs")
    .select("id, target_user_id, blob_urls, attempt_count")
    .eq("id", jobId)
    .maybeSingle<
      Pick<
        CleanupJobRow,
        "id" | "target_user_id" | "blob_urls" | "attempt_count"
      >
    >();

  if (error || !data) {
    throw new AccountDeletionError("not_found", "Cleanup job not found.");
  }

  const { data: targetData, error: targetError } =
    await admin.auth.admin.getUserById(data.target_user_id);

  if (targetData?.user) {
    const { error: staleJobDeleteError } = await removeCleanupJob(admin, jobId);
    if (staleJobDeleteError) {
      throw new AccountDeletionError(
        "cleanup_persistence_failed",
        "Could not remove stale account cleanup state.",
      );
    }

    return { jobId, cleanupPending: false } as const;
  }

  if (targetError && targetError.status !== 404) {
    await recordCleanupFailure(admin, data, targetError);
    throw new AccountDeletionError(
      "cleanup_persistence_failed",
      "Could not verify deleted account state.",
    );
  }

  try {
    await del(data.blob_urls);
  } catch (cleanupError) {
    await recordCleanupFailure(admin, data, cleanupError);
    throw new AccountDeletionError(
      "cleanup_persistence_failed",
      "Could not clean up account assets.",
    );
  }

  const { error: deleteError } = await removeCleanupJob(admin, jobId);
  if (deleteError) {
    throw new AccountDeletionError(
      "cleanup_persistence_failed",
      "Could not finish account asset cleanup.",
    );
  }

  return { jobId, cleanupPending: false } as const;
}
