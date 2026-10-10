"use client";

import { MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  SegmentedControl,
  StackedList,
  Table,
  TBody,
  THead,
  Td,
  Th,
  Tr,
  useToast,
} from "@/components/app-ui";
import { DeleteAccountDialog } from "@/components/super-admin/DeleteAccountDialog";
import {
  FeatureAccessSummary,
  ProviderFeatureOverrides,
} from "@/components/super-admin/ProviderFeatureOverrides";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
import {
  clearPending,
  closeIfFor,
  filterManagedUsers,
  markPending,
  type AccountStatusFilter,
} from "@/lib/super-admin-accounts";
import type { ManagedUserSummary } from "@/lib/supabase/publication";

const STATUS_FILTERS: Array<{ value: AccountStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "enabled", label: "Publishing on" },
  { value: "disabled", label: "Publishing off" },
];

function formatUtcDate(value?: string) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

/** Names a value inside a stacked card; the table's header row does from xl. */
function CardLabel({ children }: { children: string }) {
  return <p className="mb-1 text-xs font-medium text-app-fg-muted">{children}</p>;
}

function AccountCell({ user }: { user: ManagedUserSummary }) {
  return (
    <div className="min-w-0">
      {/* Addresses rarely have break points; anywhere keeps a long one from
          widening the table instead of wrapping. */}
      <p className="font-medium text-app-fg [overflow-wrap:anywhere]">{user.email}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {user.superAdmin ? <Badge tone="admin">Super admin</Badge> : null}
        <Badge tone={user.emailConfirmedAt ? "success" : "warning"}>
          {user.emailConfirmedAt ? "Confirmed" : "Unconfirmed"}
        </Badge>
      </div>
      <div className="mt-2 grid gap-0.5 text-xs text-app-fg-muted">
        <p>Joined {formatUtcDate(user.createdAt)} UTC</p>
        <p>
          Last sign-in {formatUtcDate(user.lastSignInAt)}
          {user.lastSignInAt ? " UTC" : ""}
        </p>
      </div>
    </div>
  );
}

function BusinessCell({ user }: { user: ManagedUserSummary }) {
  return (
    <div className="grid min-w-0 gap-2">
      {user.workflow ? (
        <div>
          <p className="font-medium text-app-fg">{user.workflow.businessName}</p>
          <p className="mt-0.5 text-xs text-app-fg-muted">
            {user.workflow.setupComplete ? "Workflow completed" : "Workflow incomplete"}
          </p>
          {user.workflow.setupComplete && user.publishingEnabled ? (
            <ButtonLink
              href={user.workflow.publicPath}
              variant="plain"
              size="sm"
              external
              newTabLabel="(opens in a new tab)"
              className="-ml-2 mt-1"
            >
              Open public page
            </ButtonLink>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-app-fg-muted">No workflow created</p>
      )}
      {!user.provider ? (
        <p className="text-xs text-app-fg-muted">No provider yet</p>
      ) : user.provider.entitlements ? (
        <FeatureAccessSummary entitlements={user.provider.entitlements} />
      ) : (
        // Saying nothing beats saying "no overrides", which would read as a
        // provider having no granted features.
        <p className="text-xs text-app-fg-muted">Feature data unavailable</p>
      )}
    </div>
  );
}

function PublishingCell({ user, error }: { user: ManagedUserSummary; error?: string }) {
  return (
    <div className="min-w-0">
      <Badge tone={user.publishingEnabled ? "success" : "danger"} dot>
        {user.publishingEnabled ? "Enabled" : "Disabled"}
      </Badge>
      {user.publicationUpdatedAt ? (
        <p className="mt-2 text-xs text-app-fg-muted">
          Updated {formatUtcDate(user.publicationUpdatedAt)} UTC
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 max-w-xs text-xs font-medium text-app-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
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
  const toast = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<AccountStatusFilter>(initialStatus);
  const [pendingUserIds, setPendingUserIds] = useState<ReadonlySet<string>>(() => new Set());
  const [rowError, setRowError] = useState<{ userId: string; message: string }>();
  const [disableTarget, setDisableTarget] = useState<ManagedUserSummary>();
  const [disableError, setDisableError] = useState<string>();
  const [featuresUserId, setFeaturesUserId] = useState<string>();
  const [deletionTarget, setDeletionTarget] = useState<ManagedUserSummary>();
  const [deletionError, setDeletionError] = useState<string>();

  async function updatePublication(user: ManagedUserSummary, nextEnabled: boolean) {
    setPendingUserIds((current) => markPending(current, user.id));
    setRowError(undefined);
    setDisableError(undefined);

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
      setDisableTarget((current) => closeIfFor(current, user.id));
      toast.notify({
        message: result.publishingEnabled
          ? "Publication enabled. The user will see a dashboard notice."
          : "Publication disabled. Public requests now return 404.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update publication.";
      // A refused disable answers inside its confirmation; an enable has none.
      if (nextEnabled) setRowError({ userId: user.id, message });
      else setDisableError(message);
    } finally {
      setPendingUserIds((current) => clearPending(current, user.id));
    }
  }

  function changePublication(user: ManagedUserSummary) {
    if (user.publishingEnabled) {
      setRowError(undefined);
      setDisableError(undefined);
      setDisableTarget(user);
      return;
    }
    void updatePublication(user, true);
  }

  async function deleteAccount(
    user: ManagedUserSummary,
    confirmationEmail: string,
  ) {
    setPendingUserIds((current) => markPending(current, user.id));
    setDeletionError(undefined);

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
      setDeletionTarget((current) => closeIfFor(current, user.id));
      toast.notify({
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
      setPendingUserIds((current) => clearPending(current, user.id));
    }
  }

  function updateEntitlements(userId: string, snapshot: ProviderEntitlements) {
    setUsers((current) =>
      current.map((candidate) =>
        candidate.id === userId && candidate.provider
          ? { ...candidate, provider: { ...candidate.provider, entitlements: snapshot } }
          : candidate,
      ),
    );
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

  function clearFilters() {
    setQuery("");
    setStatus("all");
    syncFilters("", "all");
  }

  const visibleUsers = filterManagedUsers(users, query, status);
  const featuresUser = users.find((user) => user.id === featuresUserId);
  const featuresEntitlements = featuresUser?.provider?.entitlements;

  function actions(user: ManagedUserSummary) {
    const pending = pendingUserIds.has(user.id);

    return (
      <>
        {user.provider?.entitlements ? (
          <Button variant="secondary" size="sm" onClick={() => setFeaturesUserId(user.id)}>
            Features<span className="sr-only"> for {user.email}</span>
          </Button>
        ) : null}
        <Button
          variant={user.publishingEnabled ? "secondary" : "soft"}
          size="sm"
          loading={pending && deletionTarget?.id !== user.id}
          disabled={pending}
          onClick={() => changePublication(user)}
        >
          {user.publishingEnabled ? "Disable publishing" : "Enable publishing"}
        </Button>
        {user.superAdmin ? (
          <Button variant="secondary" size="sm" disabled>
            Protected account
          </Button>
        ) : (
          <Button
            variant="danger-plain"
            size="sm"
            disabled={pending}
            onClick={() => {
              setDeletionError(undefined);
              setDeletionTarget(user);
            }}
          >
            Delete account
          </Button>
        )}
      </>
    );
  }

  const dialogs = (
    <>
      {disableTarget ? (
        <ConfirmDialog
          open
          title="Disable publishing?"
          body={
            <span className="break-words">
              Disable all public URLs and booking actions for {disableTarget.email}?
            </span>
          }
          confirmLabel="Disable publishing"
          cancelLabel="Cancel"
          closeLabel="Close"
          tone="danger"
          pending={pendingUserIds.has(disableTarget.id)}
          error={disableError}
          onConfirm={() => updatePublication(disableTarget, false)}
          onCancel={() => {
            setDisableError(undefined);
            setDisableTarget(undefined);
          }}
        />
      ) : null}
      {featuresUser && featuresEntitlements ? (
        <ProviderFeatureOverrides
          open
          ownerEmail={featuresUser.email}
          entitlements={featuresEntitlements}
          onChange={(snapshot) => updateEntitlements(featuresUser.id, snapshot)}
          onClose={() => setFeaturesUserId(undefined)}
        />
      ) : null}
      {deletionTarget ? (
        <DeleteAccountDialog
          open
          user={deletionTarget}
          busy={pendingUserIds.has(deletionTarget.id)}
          error={deletionError}
          onCancel={() => {
            if (!pendingUserIds.has(deletionTarget.id)) {
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

  if (users.length === 0) {
    return (
      <Card as="section">
        <EmptyState
          headingLevel={2}
          icon={<UsersThree aria-hidden="true" size={32} />}
          title="No registered users"
          body="Accounts will appear here as soon as they sign up."
        />
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Input
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          aria-label="Search accounts"
          placeholder="Search by email or business"
          leadingAddon={<MagnifyingGlass aria-hidden="true" size={16} />}
          className="w-full xl:w-96"
        />
        <SegmentedControl
          ariaLabel="Publishing"
          value={status}
          onChange={updateStatus}
          options={STATUS_FILTERS.map((filter) => ({
            value: filter.value,
            label: filter.label,
            count: filterManagedUsers(users, query, filter.value).length,
          }))}
        />
      </div>
      <p aria-live="polite" className="mb-3 text-sm text-app-fg-muted">
        {visibleUsers.length} of {users.length} accounts
      </p>

      <Card as="section" aria-labelledby="accounts-heading" className="overflow-hidden">
        <h2 id="accounts-heading" className="sr-only">
          Registered accounts and access controls
        </h2>

        {visibleUsers.length === 0 ? (
          <EmptyState
            title="No accounts match"
            body="Try another search or show every publishing state."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            {/* The table needs the width xl gives beside the sidebar; below
                it, each account is a card, so nothing scrolls sideways. */}
            <div className="hidden xl:block">
              <Table>
                <THead>
                  <Tr>
                    <Th>Account</Th>
                    <Th>Business</Th>
                    <Th>Publishing</Th>
                    <Th align="right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </Tr>
                </THead>
                <TBody>
                  {visibleUsers.map((user) => (
                    <Tr key={user.id}>
                      {/* Room for an ordinary address on one line. */}
                      <Td className="min-w-80">
                        <AccountCell user={user} />
                      </Td>
                      <Td>
                        <BusinessCell user={user} />
                      </Td>
                      <Td>
                        <PublishingCell
                          user={user}
                          error={rowError?.userId === user.id ? rowError.message : undefined}
                        />
                      </Td>
                      <Td align="right">
                        <div className="flex flex-col items-end gap-2">{actions(user)}</div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>

            <StackedList className="xl:hidden">
              {visibleUsers.map((user) => (
                <li key={user.id} className="grid gap-4 px-4 py-5 sm:px-6">
                  <AccountCell user={user} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <CardLabel>Business</CardLabel>
                      <BusinessCell user={user} />
                    </div>
                    <div>
                      <CardLabel>Publishing</CardLabel>
                      <PublishingCell
                        user={user}
                        error={rowError?.userId === user.id ? rowError.message : undefined}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">{actions(user)}</div>
                </li>
              ))}
            </StackedList>
          </>
        )}
      </Card>
      {dialogs}
    </>
  );
}
