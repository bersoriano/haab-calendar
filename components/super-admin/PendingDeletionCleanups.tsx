"use client";

import { Broom } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  StackedList,
  StackedListItem,
  useToast,
} from "@/components/app-ui";
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
  const toast = useToast();
  const [jobs, setJobs] = useState(initialJobs);
  const [pendingJobId, setPendingJobId] = useState<string>();
  const [error, setError] = useState<string>();

  if (jobs.length === 0) {
    return (
      <Card as="section">
        <EmptyState
          headingLevel={2}
          icon={<Broom aria-hidden="true" size={32} />}
          title="No cleanups waiting"
          body="Every deleted account's branding files have been removed."
        />
      </Card>
    );
  }

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
      toast.notify({ message: "Cleanup finished." });
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
    <Card as="section">
      <CardHeader
        title="Asset cleanup pending"
        description="Deleted accounts with branding files still queued. Account data is already deleted; Retry removes the remaining Haab-hosted branding files."
      />
      <StackedList>
        {jobs.map((job) => (
          <StackedListItem
            key={job.id}
            trailing={
              <Button
                variant="secondary"
                size="sm"
                loading={pendingJobId === job.id}
                onClick={() => retry(job.id)}
              >
                {pendingJobId === job.id ? "Retrying…" : "Retry cleanup"}
              </Button>
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm font-semibold text-app-fg">Cleanup {job.id.slice(0, 8)}</p>
              <Badge tone={job.lastAttemptFailed ? "danger" : "warning"}>
                {job.lastAttemptFailed ? "Last attempt failed" : "Queued"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-app-fg-muted">
              {job.attemptCount} failed {job.attemptCount === 1 ? "attempt" : "attempts"}
              {" · "}queued {formatUtcDate(job.createdAt)} UTC
            </p>
          </StackedListItem>
        ))}
      </StackedList>
      {error ? (
        <CardBody className="border-t border-app-border">
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        </CardBody>
      ) : null}
    </Card>
  );
}
