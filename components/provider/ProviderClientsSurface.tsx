"use client";

import { DownloadSimple, Trash, UsersThree } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Tr,
  useToast,
} from "@/components/app-ui";
import { analyticsCopy } from "@/components/provider/analytics-copy";
import { clientsCopy, type ClientsCopy } from "@/components/provider/clients-copy";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { UpgradeCard } from "@/components/provider/ProviderAnalyticsSurface";
import { hasResolvedEntitlement, type ProviderEntitlements } from "@/lib/entitlements/resolve";
import { filterClients, type ProviderClient } from "@/lib/provider-clients";
import type { Lang } from "@/lib/types";

const CLIENTS_PATH = "/api/provider/clients";

type LoadState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; clients: ProviderClient[] };

function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * The Clients section: everyone who has booked, kept after their bookings are
 * purged. Every plan can see the list and delete a record, which is how a
 * provider honours someone asking to be removed; downloading it is Premium, and
 * /api/provider/clients/export is what enforces that.
 */
export function ProviderClientsSurface({
  lang,
  integratedMode,
  entitlements,
}: {
  lang: Lang;
  integratedMode: boolean;
  entitlements?: ProviderEntitlements;
}) {
  const t = clientsCopy[lang];

  if (!integratedMode) {
    return (
      <EmptyState
        variant="dashed"
        icon={<UsersThree aria-hidden="true" size={32} />}
        title={t.previewTitle}
        body={t.previewBody}
      />
    );
  }

  const canDownload = Boolean(entitlements && hasResolvedEntitlement(entitlements, "client_export"));

  return <ClientsPanel t={t} lang={lang} canDownload={canDownload} />;
}

function ClientsPanel({ t, lang, canDownload }: { t: ClientsCopy; lang: Lang; canDownload: boolean }) {
  const { notify } = useToast();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [deleting, setDeleting] = useState<ProviderClient | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(CLIENTS_PATH, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`status ${response.status}`);
        const body = (await response.json()) as { clients: ProviderClient[] };
        setState({ status: "ready", clients: body.clients });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "failed" });
      });

    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  async function download() {
    setDownloading(true);
    setDownloadFailed(false);

    try {
      const response = await fetch(`${CLIENTS_PATH}/export?lang=${lang}`);
      if (!response.ok) throw new Error(`status ${response.status}`);

      const disposition = response.headers.get("Content-Disposition") ?? "";
      const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "clients.csv";
      saveFile(await response.blob(), fileName);
      notify({ tone: "success", message: t.downloaded });
    } catch {
      setDownloadFailed(true);
    } finally {
      setDownloading(false);
    }
  }

  function askToDelete(client: ProviderClient) {
    setDeleteError(null);
    setDeleting(client);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletePending(true);
    setDeleteError(null);

    try {
      const response = await fetch(`${CLIENTS_PATH}/${deleting.id}`, { method: "DELETE" });
      // Already gone is what was asked for, so the row leaves either way.
      if (!response.ok && response.status !== 404) throw new Error(`status ${response.status}`);

      const deletedId = deleting.id;
      setState((current) =>
        current.status === "ready"
          ? { status: "ready", clients: current.clients.filter((client) => client.id !== deletedId) }
          : current,
      );
      setDeleting(null);
      notify({ tone: "success", message: t.deleted });
    } catch {
      setDeleteError(t.deleteFailed);
    } finally {
      setDeletePending(false);
    }
  }

  if (state.status === "loading") {
    return <p className="text-sm text-app-fg-muted">{t.loading}</p>;
  }

  if (state.status === "failed") {
    return <EmptyState title={t.loadFailed} action={<Button onClick={retry}>{t.retry}</Button>} />;
  }

  if (state.clients.length === 0) {
    return (
      <EmptyState
        variant="dashed"
        icon={<UsersThree aria-hidden="true" size={32} />}
        title={t.emptyTitle}
        body={t.emptyBody}
      />
    );
  }

  const visible = filterClients(state.clients, query);
  const dates = new Intl.DateTimeFormat(lang, { dateStyle: "medium" });

  return (
    <Card as="section">
      <CardHeader
        title={t.listTitle}
        description={t.listBody}
        actions={
          canDownload ? (
            <Button
              leadingIcon={<DownloadSimple aria-hidden="true" size={16} />}
              loading={downloading}
              onClick={download}
            >
              {t.download}
            </Button>
          ) : undefined
        }
      />
      <CardBody className="space-y-4">
        {downloadFailed ? <Alert tone="danger" role="alert" title={t.downloadFailed} /> : null}

        <Field label={t.search}>
          <Input
            type="search"
            value={query}
            placeholder={t.searchPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>

        {visible.length === 0 ? (
          <p className="text-sm text-app-fg-muted">{t.noMatches}</p>
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>{t.columns.person}</Th>
                <Th className="hidden sm:table-cell">{t.columns.lastBooking}</Th>
                <Th align="right" className="hidden sm:table-cell">
                  {t.columns.bookings}
                </Th>
                <Th align="right">
                  <span className="sr-only">{t.columns.actions}</span>
                </Th>
              </Tr>
            </THead>
            <TBody>
              {visible.map((client) => (
                <Tr key={client.id}>
                  <Td className="whitespace-normal">
                    <span className="block break-words font-medium text-app-fg">{client.name}</span>
                    <a
                      href={`mailto:${client.email}`}
                      className="block break-all text-app-accent underline-offset-2 hover:underline"
                    >
                      {client.email}
                    </a>
                    {client.phone ? (
                      <span className="block text-app-fg-muted">{client.phone}</span>
                    ) : null}
                    {/* The columns below do not fit a phone; the date still does. */}
                    <span className="mt-1 block text-xs text-app-fg-muted sm:hidden">
                      {t.columns.lastBooking}: {dates.format(new Date(client.lastBookedAt))}
                    </span>
                  </Td>
                  <Td className="hidden whitespace-nowrap sm:table-cell">
                    {dates.format(new Date(client.lastBookedAt))}
                  </Td>
                  <Td align="right" className="hidden sm:table-cell">
                    {client.bookingCount}
                  </Td>
                  <Td align="right">
                    <Button
                      variant="plain"
                      size="sm"
                      aria-label={t.deleteLabel(client.name)}
                      leadingIcon={<Trash aria-hidden="true" size={16} />}
                      onClick={() => askToDelete(client)}
                    />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}

        {canDownload ? null : (
          <div className="flex justify-center pt-2">
            <UpgradeCard
              t={analyticsCopy[lang]}
              body={t.downloadLocked}
              benefits={t.downloadBenefits}
              returnTab="clients"
            />
          </div>
        )}
      </CardBody>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? t.deleteTitle(deleting.name) : ""}
        body={t.deleteBody}
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.deleteKeep}
        closeLabel={dashboardCopy[lang].closeDialog}
        tone="danger"
        pending={deletePending}
        error={deleteError ?? undefined}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  );
}
