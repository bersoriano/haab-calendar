"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteAccountDialog } from "@/components/super-admin/DeleteAccountDialog";
import type { ManagedUserSummary } from "@/lib/supabase/publication";

function formatUtcDate(value?: string) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function UserPublicationTable({
  initialUsers,
}: {
  initialUsers: ManagedUserSummary[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [pendingUserId, setPendingUserId] = useState<string>();
  const [deletionTarget, setDeletionTarget] = useState<ManagedUserSummary>();
  const [deletionError, setDeletionError] = useState<string>();
  const [accountFeedback, setAccountFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  }>();
  const [feedback, setFeedback] = useState<{
    userId: string;
    tone: "success" | "error";
    message: string;
  }>();

  async function changePublication(user: ManagedUserSummary) {
    const nextEnabled = !user.publishingEnabled;

    if (
      !nextEnabled &&
      !window.confirm(
        `Disable all public URLs and booking actions for ${user.email}?`,
      )
    ) {
      return;
    }

    setPendingUserId(user.id);
    setFeedback(undefined);

    try {
      const response = await fetch(
        `/api/super-admin/users/${encodeURIComponent(user.id)}/publication`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ publishingEnabled: nextEnabled }),
        },
      );
      const result = (await response.json()) as {
        userMessage?: string;
        publishingEnabled?: boolean;
        updatedAt?: string;
      };

      if (!response.ok || typeof result.publishingEnabled !== "boolean") {
        throw new Error(result.userMessage || "Could not update publication.");
      }

      setUsers((current) =>
        current.map((candidate) =>
          candidate.id === user.id
            ? {
                ...candidate,
                publishingEnabled: result.publishingEnabled as boolean,
                publicationUpdatedAt: result.updatedAt,
              }
            : candidate,
        ),
      );
      setFeedback({
        userId: user.id,
        tone: "success",
        message: result.publishingEnabled
          ? "Publication enabled. The user will see a dashboard notice."
          : "Publication disabled. Public requests now return 404.",
      });
    } catch (error) {
      setFeedback({
        userId: user.id,
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not update publication.",
      });
    } finally {
      setPendingUserId(undefined);
    }
  }

  async function deleteAccount(
    user: ManagedUserSummary,
    confirmationEmail: string,
  ) {
    setPendingUserId(user.id);
    setDeletionError(undefined);
    setAccountFeedback(undefined);

    try {
      const response = await fetch(
        `/api/super-admin/users/${encodeURIComponent(user.id)}`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirmationEmail }),
        },
      );
      const result = (await response.json()) as {
        userMessage?: string;
        cleanupPending?: boolean;
      };

      if (!response.ok) {
        throw new Error(result.userMessage || "Could not delete account.");
      }

      setUsers((current) =>
        current.filter((candidate) => candidate.id !== user.id),
      );
      setDeletionTarget(undefined);
      setAccountFeedback({
        tone: "success",
        message: result.cleanupPending
          ? "Account deleted. Haab-hosted asset cleanup is queued for retry."
          : "Account and current Haab-hosted assets deleted permanently.",
      });
      router.refresh();
    } catch (error) {
      setDeletionError(
        error instanceof Error ? error.message : "Could not delete account.",
      );
    } finally {
      setPendingUserId(undefined);
    }
  }

  if (users.length === 0) {
    return (
      <div className="space-y-4">
        {accountFeedback ? <AccountFeedback feedback={accountFeedback} /> : null}
        <div className="rounded-3xl border border-[var(--line)] bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            No registered users
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Accounts will appear here as soon as they sign up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {accountFeedback ? <AccountFeedback feedback={accountFeedback} /> : null}
      <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left">
            <thead className="bg-[var(--surface)] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Account</th>
                <th className="px-6 py-4 font-semibold">Workflow</th>
                <th className="px-6 py-4 font-semibold">Email status</th>
                <th className="px-6 py-4 font-semibold">Last sign-in</th>
                <th className="px-6 py-4 font-semibold">Publication</th>
                <th className="px-6 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
            {users.map((user) => {
              const pending = pendingUserId === user.id;
              const rowFeedback = feedback?.userId === user.id ? feedback : undefined;

              return (
                <tr key={user.id} className="align-top">
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--ink)]">
                        {user.email}
                      </span>
                      {user.superAdmin ? (
                        <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700">
                          Super admin
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Joined {formatUtcDate(user.createdAt)} UTC
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    {user.workflow ? (
                      <>
                        <p className="font-medium text-[var(--ink)]">
                          {user.workflow.businessName}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {user.workflow.setupComplete
                            ? "Workflow completed"
                            : "Workflow incomplete"}
                        </p>
                        {user.workflow.setupComplete && user.publishingEnabled ? (
                          <Link
                            className="mt-2 inline-block text-xs font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                            href={user.workflow.publicPath}
                            target="_blank"
                          >
                            Open public page
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-sm text-[var(--muted)]">
                        No workflow created
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        user.emailConfirmedAt
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {user.emailConfirmedAt ? "Confirmed" : "Unconfirmed"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-[var(--muted)]">
                    {formatUtcDate(user.lastSignInAt)}
                    {user.lastSignInAt ? " UTC" : ""}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        user.publishingEnabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {user.publishingEnabled ? "Enabled" : "Disabled"}
                    </span>
                    {user.publicationUpdatedAt ? (
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Updated {formatUtcDate(user.publicationUpdatedAt)} UTC
                      </p>
                    ) : null}
                    {rowFeedback ? (
                      <p
                        className={`mt-2 max-w-xs text-xs font-medium ${
                          rowFeedback.tone === "success"
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                        role={rowFeedback.tone === "error" ? "alert" : "status"}
                      >
                        {rowFeedback.message}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        aria-pressed={!user.publishingEnabled}
                        disabled={pending}
                        onClick={() => changePublication(user)}
                        className={`inline-flex min-w-36 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
                          user.publishingEnabled
                            ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {pending
                          ? "Saving…"
                          : user.publishingEnabled
                            ? "Disable publishing"
                            : "Enable publishing"}
                      </button>
                      {user.superAdmin ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex min-w-36 items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500"
                        >
                          Protected account
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setDeletionError(undefined);
                            setDeletionTarget(user);
                          }}
                          className="inline-flex min-w-36 items-center justify-center rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60"
                        >
                          Delete account
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>
      {deletionTarget ? (
        <DeleteAccountDialog
          user={deletionTarget}
          busy={pendingUserId === deletionTarget.id}
          error={deletionError}
          onCancel={() => {
            if (pendingUserId !== deletionTarget.id) {
              setDeletionError(undefined);
              setDeletionTarget(undefined);
            }
          }}
          onConfirm={(confirmationEmail) =>
            deleteAccount(deletionTarget, confirmationEmail)
          }
        />
      ) : null}
    </>
  );
}

function AccountFeedback({
  feedback,
}: {
  feedback: { tone: "success" | "error"; message: string };
}) {
  return (
    <p
      role={feedback.tone === "error" ? "alert" : "status"}
      className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
        feedback.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {feedback.message}
    </p>
  );
}
