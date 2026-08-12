"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AccountDeletionCleanupSummary } from "@/lib/supabase/account-deletion";

function formatUtcDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function PendingDeletionCleanups({
  initialJobs,
}: {
  initialJobs: AccountDeletionCleanupSummary[];
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [pendingJobId, setPendingJobId] = useState<string>();
  const [error, setError] = useState<string>();

  if (jobs.length === 0) return null;

  async function retry(jobId: string) {
    setPendingJobId(jobId);
    setError(undefined);

    try {
      const response = await fetch(
        `/api/super-admin/account-deletion-cleanups/${encodeURIComponent(jobId)}/retry`,
        { method: "POST" },
      );
      const result = (await response.json()) as { userMessage?: string };

      if (!response.ok) {
        throw new Error(
          result.userMessage || "Could not clean up account assets.",
        );
      }

      setJobs((current) => current.filter((job) => job.id !== jobId));
      router.refresh();
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "Could not clean up account assets.",
      );
    } finally {
      setPendingJobId(undefined);
    }
  }

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-amber-200 bg-amber-50">
      <div className="border-b border-amber-200 px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-800">
          Asset cleanup pending
        </p>
        <h2 className="mt-1 text-xl font-semibold text-amber-950">
          Deleted accounts with branding files still queued
        </h2>
        <p className="mt-2 text-sm text-amber-900">
          Account data is already deleted. Retry removes remaining Haab-hosted
          branding files.
        </p>
      </div>
      <ul className="divide-y divide-amber-200">
        {jobs.map((job) => {
          const pending = pendingJobId === job.id;
          return (
            <li
              key={job.id}
              className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-sm font-semibold text-amber-950">
                  Cleanup {job.id.slice(0, 8)}
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  {job.attemptCount} failed{" "}
                  {job.attemptCount === 1 ? "attempt" : "attempts"}
                  {" · "}queued {formatUtcDate(job.createdAt)} UTC
                </p>
                {job.lastAttemptFailed ? (
                  <p className="mt-1 text-xs font-semibold text-amber-900">
                    Last cleanup attempt failed.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => retry(job.id)}
                className="min-h-10 rounded-full bg-amber-900 px-4 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? "Retrying…" : "Retry cleanup"}
              </button>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p
          role="alert"
          className="border-t border-amber-200 px-6 py-4 text-sm font-semibold text-rose-700"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
