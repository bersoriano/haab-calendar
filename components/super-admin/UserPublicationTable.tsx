"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { SUPER_ADMIN_ACCENT_SOFT_CLASS } from "@/components/app-shell/super-admin-accent";
import { DeleteAccountDialog } from "@/components/super-admin/DeleteAccountDialog";
import { ProviderFeatureOverrides } from "@/components/super-admin/ProviderFeatureOverrides";
import { Alert } from "@/components/ui/Alert";
import {
  filterManagedUsers,
  type AccountStatusFilter,
} from "@/lib/super-admin-accounts";
import type { ManagedUserSummary } from "@/lib/supabase/publication";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: Array<{ value: AccountStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "enabled", label: "Publishing on" },
  { value: "disabled", label: "Publishing off" },
];

const ROW_COLUMNS =
  "xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] xl:gap-6";

/** Names a cell on stacked rows; on wide screens the header row does. */
function CellLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] xl:sr-only">
      {children}
    </p>
  );
}

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
  initialQuery = "",
  initialStatus = "all",
}: {
  initialUsers: ManagedUserSummary[];
  /** From `?q=`, so a filtered list can be linked to. */
  initialQuery?: string;
  /** From `?status=`. */
  initialStatus?: AccountStatusFilter;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<AccountStatusFilter>(initialStatus);
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

  // Keeps the address shareable without asking the server for the list again.
  function syncFilters(nextQuery: string, nextStatus: AccountStatusFilter) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus !== "all") params.set("status", nextStatus);
    const search = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    syncFilters(nextQuery, status);
  }

  function updateStatus(nextStatus: AccountStatusFilter) {
    setStatus(nextStatus);
    syncFilters(query, nextStatus);
  }

  const visibleUsers = filterManagedUsers(users, query, status);

  if (users.length === 0) {
    return (
      <div className="space-y-4">
        {accountFeedback ? (
          <AccountFeedback feedback={accountFeedback} />
        ) : null}
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface-lowest)] p-8 text-center">
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

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block lg:w-96">
          <MagnifyingGlass
            aria-hidden="true"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            aria-label="Search accounts"
            placeholder="Search by email or business"
            className="min-h-11 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-lowest)] pl-11 pr-4 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--primary)]/30"
          />
        </label>
        <div role="group" aria-label="Publishing" className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => updateStatus(filter.value)}
              className={cn(
                "min-h-11 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                status === filter.value
                  ? "bg-[var(--ink)] text-[var(--background)]"
                  : "border border-[var(--line)] bg-[var(--surface-lowest)] text-[var(--muted)] hover:text-[var(--ink)]",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="mb-3 text-sm text-[var(--muted)]">
        {visibleUsers.length} of {users.length} accounts
      </p>

      <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface-lowest)] shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
        <h2 className="sr-only">Registered accounts and access controls</h2>
        <div
          aria-hidden="true"
          className={cn(
            "hidden border-b border-[var(--line)] bg-[var(--surface)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)] xl:grid",
            ROW_COLUMNS,
          )}
        >
          <span>Account</span>
          <span>Workflow &amp; publication</span>
          <span>Premium access</span>
          <span className="text-right">Actions</span>
        </div>

        {visibleUsers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-[var(--ink)]">No accounts match</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Try another search or show every publishing state.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("all");
                syncFilters("", "all");
              }}
              className="mt-4 min-h-11 rounded-full border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-soft)]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {visibleUsers.map((user) => {
              const pending = pendingUserId === user.id;
              const rowFeedback = feedback?.userId === user.id ? feedback : undefined;

              return (
                <li
                  key={user.id}
                  className={cn("grid gap-5 px-5 py-5 sm:px-6", ROW_COLUMNS)}
                >
                  <div className="min-w-0">
                    <CellLabel>Account</CellLabel>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all font-semibold text-[var(--ink)]">{user.email}</span>
                      {user.superAdmin ? (
                        <span
                          className={cn(
                            "rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
                            SUPER_ADMIN_ACCENT_SOFT_CLASS,
                          )}
                        >
                          Super admin
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          user.emailConfirmedAt
                            ? "bg-[var(--success-soft)] text-[var(--success-strong)]"
                            : "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
                        )}
                      >
                        {user.emailConfirmedAt ? "Confirmed" : "Unconfirmed"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs leading-5 text-[var(--muted)]">
                      <p>Joined {formatUtcDate(user.createdAt)} UTC</p>
                      <p>
                        Last sign-in {formatUtcDate(user.lastSignInAt)}
                        {user.lastSignInAt ? " UTC" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <CellLabel>Workflow</CellLabel>
                      {user.workflow ? (
                        <>
                          <p className="font-medium text-[var(--ink)]">{user.workflow.businessName}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {user.workflow.setupComplete ? "Workflow completed" : "Workflow incomplete"}
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
                        <span className="text-sm text-[var(--muted)]">No workflow created</span>
                      )}
                    </div>
                    <div>
                      <CellLabel>Publication</CellLabel>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                          user.publishingEnabled
                            ? "bg-[var(--success-soft)] text-[var(--success-strong)]"
                            : "bg-[var(--danger-soft)] text-[var(--danger-strong)]",
                        )}
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
                          className={cn(
                            "mt-2 max-w-xs text-xs font-medium",
                            rowFeedback.tone === "success"
                              ? "text-[var(--success-strong)]"
                              : "text-[var(--danger-strong)]",
                          )}
                          role={rowFeedback.tone === "error" ? "alert" : "status"}
                        >
                          {rowFeedback.message}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <CellLabel>Premium access</CellLabel>
                    {!user.provider ? (
                      <span className="text-sm text-[var(--muted)]">No provider yet</span>
                    ) : user.provider.entitlements ? (
                      <ProviderFeatureOverrides
                        ownerEmail={user.email}
                        entitlements={user.provider.entitlements}
                      />
                    ) : (
                      // Saying nothing beats saying "no overrides", which would
                      // read as a provider having no granted features.
                      <span className="text-sm text-[var(--muted)]">Feature data unavailable</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 xl:flex-col xl:items-end">
                    <button
                      type="button"
                      aria-pressed={!user.publishingEnabled}
                      disabled={pending}
                      onClick={() => changePublication(user)}
                      className={cn(
                        "inline-flex min-h-11 min-w-36 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60",
                        user.publishingEnabled
                          ? "border border-[var(--danger-line)] bg-[var(--surface-lowest)] text-[var(--danger-strong)] hover:bg-[var(--danger-soft)]"
                          : "bg-[var(--success-strong)] text-white hover:opacity-90",
                      )}
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
                        className="inline-flex min-h-11 min-w-36 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--muted)]"
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
                        className="inline-flex min-h-11 min-w-36 items-center justify-center rounded-full bg-[var(--danger-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                      >
                        Delete account
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
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
    <Alert
      tone={feedback.tone === "success" ? "success" : "danger"}
      role={feedback.tone === "error" ? "alert" : "status"}
      className="mb-4"
    >
      {feedback.message}
    </Alert>
  );
}
