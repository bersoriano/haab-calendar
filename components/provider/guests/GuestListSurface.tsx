"use client";

import { Copy, DownloadSimple, EnvelopeSimple, PencilSimple, Trash, UsersThree, WhatsappLogo } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Badge,
  Button,
  buttonStyles,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Dialog,
  DialogActions,
  EmptyState,
  Field,
  IconButton,
  Input,
  SegmentedControl,
  StackedList,
  StackedListItem,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Tr,
  useToast,
} from "@/components/app-ui";
import { fillCopy } from "@/components/invitations/invitation-copy";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { countCopy, guestsCopy, type GuestsCopy } from "@/components/provider/guests/guests-copy";
import { InvitationEditor, type InvitationEditorSave } from "@/components/provider/guests/InvitationEditor";
import { PasteImportDialog } from "@/components/provider/guests/PasteImportDialog";
import { SeatingPanel } from "@/components/provider/guests/SeatingPanel";
import { readGuestListCache, writeGuestListCache } from "@/lib/guest-list-cache";
import { buildInvitationMessage, whatsappUrl } from "@/lib/invitation-messages";
import { formatRsvpDeadline, isRsvpOpen } from "@/lib/rsvp-deadline";
import { choiceCounts, questionLabel } from "@/lib/rsvp-questions";
import {
  invitationPath,
  overallState,
  responseState,
  totalsByEvent,
  type Invitation,
  type PastedRow,
  type ResponseState,
} from "@/lib/invitations";
import type { StatusTone } from "@/lib/format";
import { clampInvitationSeats } from "@/lib/rsvp-mode";
import type { Lang, ProviderInfo, Service, VerticalId } from "@/lib/types";
import type { VerticalCopy } from "@/lib/vertical-copy";

const INVITATIONS_PATH = "/api/provider/invitations";
const SAVED_SERVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Filter = "all" | ResponseState | "partial" | "not_contacted";
type LoadState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; invitations: Invitation[] }
  | { status: "offline"; invitations: Invitation[]; savedAt: string };

const STATE_TONES: Record<ResponseState | "partial", StatusTone> = {
  no_answer: "neutral",
  attending: "success",
  partial: "info",
  declined: "warning",
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = (await response.json().catch(() => null)) as (T & { userMessage?: string }) | null;
  if (!response.ok || !body) throw new Error(body?.userMessage ?? `status ${response.status}`);
  return body;
}

/** The draft's rows with the ids the server gave its named guests, in order. */
export function alignCreatedGuests(draft: { name: string }[], created: { id: string }[]) {
  let next = 0;
  return draft.map((guest) =>
    guest.name && created[next] ? { id: created[next++].id, name: guest.name } : { name: guest.name },
  );
}

function words(template: string, copy: VerticalCopy, values: Record<string, string | number> = {}) {
  return fillCopy(template, { service: copy.service, services: copy.services, clients: copy.clients, ...values });
}

/**
 * The guest list of an invitation-only page: answers per event, the latest
 * replies, and every household with its link. Reads from the server and keeps
 * a copy in the browser, which is what shows (read-only) without a connection.
 */
export function GuestListSurface({
  lang,
  integratedMode,
  services,
  provider,
  vertical,
  copy,
}: {
  lang: Lang;
  integratedMode: boolean;
  services: Service[];
  provider: ProviderInfo;
  vertical: VerticalId;
  copy: VerticalCopy;
}) {
  const t = guestsCopy[lang];

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

  return (
    <GuestListPanel
      t={t}
      lang={lang}
      services={services.filter((service) => SAVED_SERVICE_ID.test(service.id))}
      provider={provider}
      vertical={vertical}
      copy={copy}
    />
  );
}

function GuestListPanel({
  t,
  lang,
  services,
  provider,
  vertical,
  copy,
}: {
  t: GuestsCopy;
  lang: Lang;
  services: Service[];
  provider: ProviderInfo;
  vertical: VerticalId;
  copy: VerticalCopy;
}) {
  const { notify } = useToast();
  const cacheKey = provider.publicSlug || "page";
  const defaultSeats = clampInvitationSeats(provider.defaultInvitationSeats);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<{ invitation?: Invitation } | null>(null);
  const [pasting, setPasting] = useState(false);
  const [deleting, setDeleting] = useState<Invitation | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteWord, setDeleteWord] = useState("");
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [view, setView] = useState<"guests" | "seating">("guests");

  const showList = useCallback(
    (invitations: Invitation[]) => {
      setState({ status: "ready", invitations });
      writeGuestListCache(cacheKey, invitations);
    },
    [cacheKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    const showCache = () => {
      const cached = readGuestListCache(cacheKey);
      setState(cached ? { status: "offline", ...cached } : { status: "failed" });
    };

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      showCache();
      return () => controller.abort();
    }

    fetch(INVITATIONS_PATH, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`status ${response.status}`);
        const body = (await response.json()) as { invitations: Invitation[] };
        showList(body.invitations);
      })
      .catch(() => {
        if (!controller.signal.aborted) showCache();
      });

    return () => controller.abort();
  }, [attempt, cacheKey, showList]);

  const invitations = useMemo(
    () => (state.status === "ready" || state.status === "offline" ? state.invitations : []),
    [state],
  );
  const readOnly = state.status !== "ready";
  const serviceIds = useMemo(() => services.map((service) => service.id), [services]);
  const totals = useMemo(() => totalsByEvent(invitations, serviceIds), [invitations, serviceIds]);
  const recent = useMemo(
    () =>
      invitations
        .filter((invitation) => invitation.submittedAt)
        .sort((a, b) => Date.parse(b.submittedAt ?? "") - Date.parse(a.submittedAt ?? ""))
        .slice(0, 5),
    [invitations],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return invitations.filter((invitation) => {
      if (filter === "not_contacted" ? invitation.lastContactedAt : filter !== "all" && overallState(invitation) !== filter) {
        return false;
      }
      if (!needle) return true;
      return [invitation.displayName, invitation.contactPhone, invitation.contactEmail, ...invitation.guests.map((g) => g.name)]
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [invitations, query, filter]);

  const questions = useMemo(() => provider.rsvpQuestions ?? [], [provider.rsvpQuestions]);

  async function downloadCsv(service: Service) {
    try {
      const response = await fetch(`${INVITATIONS_PATH}/export?event=${encodeURIComponent(service.id)}&lang=${lang}`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "guests.csv";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify({ tone: "neutral", message: t.downloadFailed });
    }
  }

  const remindable = invitations.filter(
    (invitation) => !invitation.submittedAt && invitation.contactEmail && invitation.eventIds.length > 0,
  );
  const unanswered = invitations.filter((invitation) => !invitation.submittedAt).length;

  /** What the household reads: in the page's language, not the dashboard's. */
  function messageFor(invitation: Invitation) {
    return buildInvitationMessage({
      lang: provider.language,
      kind: invitation.lastContactedAt && !invitation.submittedAt ? "reminder" : "invite",
      displayName: invitation.displayName,
      pageName: provider.businessName || provider.fullName,
      link: linkFor(invitation),
      deadline: provider.rsvpDeadline,
    });
  }

  async function recordContacted(invitation: Invitation) {
    try {
      const body = await requestJson<{ invitation: Invitation }>(`${INVITATIONS_PATH}/${invitation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ markContacted: true }),
      });
      replace(body.invitation);
    } catch {
      // The message still went out on the planner's phone; only the note is missing.
    }
  }

  async function sendEmail(invitation: Invitation) {
    try {
      const body = await requestJson<{ invitation: Invitation }>(`${INVITATIONS_PATH}/${invitation.id}/email`, {
        method: "POST",
        body: JSON.stringify({
          kind: invitation.lastContactedAt && !invitation.submittedAt ? "reminder" : "invite",
        }),
      });
      replace(body.invitation);
      notify({ tone: "success", message: fillCopy(t.emailSent, { name: invitation.displayName }) });
    } catch (error) {
      notify({
        tone: "neutral",
        message: error instanceof Error && !error.message.startsWith("status") ? error.message : t.emailFailed,
      });
    }
  }

  async function remindAll() {
    setPending(true);
    setActionError(null);
    try {
      const body = await requestJson<{ sent: number }>(`${INVITATIONS_PATH}/remind`, { method: "POST" });
      const contacted = new Set(remindable.map((invitation) => invitation.id));
      const now = new Date().toISOString();
      showList(
        invitations.map((invitation) =>
          contacted.has(invitation.id) && body.sent > 0 ? { ...invitation, lastContactedAt: now } : invitation,
        ),
      );
      setReminding(false);
      notify({
        tone: "success",
        message: body.sent === 0 ? t.remindersNone : countCopy(body.sent, t.remindersSentOne, t.remindersSent),
      });
    } catch (error) {
      setActionError(error instanceof Error && !error.message.startsWith("status") ? error.message : t.remindFailed);
    } finally {
      setPending(false);
    }
  }

  function linkFor(invitation: Invitation) {
    const path = invitationPath(vertical, provider.publicSlug, invitation.token);
    return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  }

  function replace(updated: Invitation) {
    showList(invitations.map((invitation) => (invitation.id === updated.id ? updated : invitation)));
  }

  async function copyLink(invitation: Invitation) {
    try {
      await navigator.clipboard.writeText(linkFor(invitation));
      notify({ tone: "success", message: t.linkCopied });
    } catch {
      notify({ tone: "neutral", message: t.copyFailed });
    }
  }

  async function save(draft: InvitationEditorSave) {
    setPending(true);
    setActionError(null);
    const existing = editing?.invitation;

    try {
      if (existing) {
        const body = await requestJson<{ invitation: Invitation }>(`${INVITATIONS_PATH}/${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify(draft),
        });
        replace(body.invitation);
        notify({ tone: "success", message: t.editor.saved });
      } else {
        const created = await requestJson<{ invitations: Invitation[] }>(INVITATIONS_PATH, {
          method: "POST",
          body: JSON.stringify({
            drafts: [{ ...draft, guestNames: draft.guests.map((guest) => guest.name).filter(Boolean) }],
          }),
        });
        let next = [...invitations, ...created.invitations];
        // A new household answered by phone: record it on the invitation just made.
        const [invitation] = created.invitations;
        if (invitation && draft.markAnswered) {
          const answered = await requestJson<{ invitation: Invitation }>(`${INVITATIONS_PATH}/${invitation.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              // The server saved the named guests in order; blank rows come back as new.
              guests: alignCreatedGuests(draft.guests, invitation.guests),
              attendance: draft.attendance,
              guestAnswers: draft.guestAnswers,
              answers: draft.answers,
              markAnswered: true,
            }),
          });
          next = next.map((entry) => (entry.id === invitation.id ? answered.invitation : entry));
        }
        showList(next);
        notify({ tone: "success", message: t.editor.created });
      }
      setEditing(null);
    } catch (error) {
      setActionError(error instanceof Error && !error.message.startsWith("status") ? error.message : t.editor.saveFailed);
    } finally {
      setPending(false);
    }
  }

  async function regenerate() {
    const existing = editing?.invitation;
    if (!existing) return;
    setPending(true);
    setActionError(null);
    try {
      const body = await requestJson<{ invitation: Invitation }>(`${INVITATIONS_PATH}/${existing.id}/token`, {
        method: "POST",
      });
      replace(body.invitation);
      setEditing({ invitation: body.invitation });
      notify({ tone: "success", message: t.editor.newLinkDone });
    } catch {
      setActionError(t.editor.saveFailed);
    } finally {
      setPending(false);
    }
  }

  async function importRows(rows: PastedRow[], eventIds: string[]) {
    setPending(true);
    setActionError(null);
    try {
      const body = await requestJson<{ invitations: Invitation[] }>(INVITATIONS_PATH, {
        method: "POST",
        body: JSON.stringify({ drafts: rows.map((row) => ({ ...row, eventIds })) }),
      });
      showList([...invitations, ...body.invitations]);
      notify({ tone: "success", message: countCopy(body.invitations.length, t.paste.importedOne, t.paste.imported) });
      setPasting(false);
    } catch (error) {
      setActionError(error instanceof Error && !error.message.startsWith("status") ? error.message : t.paste.importFailed);
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setPending(true);
    setActionError(null);
    try {
      const response = await fetch(`${INVITATIONS_PATH}/${deleting.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error(`status ${response.status}`);
      const gone = deleting.id;
      showList(invitations.filter((invitation) => invitation.id !== gone));
      setDeleting(null);
      notify({ tone: "success", message: t.deleted });
    } catch {
      setActionError(t.deleteFailed);
    } finally {
      setPending(false);
    }
  }

  async function confirmDeleteAll() {
    setPending(true);
    setActionError(null);
    try {
      await requestJson(`${INVITATIONS_PATH}?all=1`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      showList([]);
      setDeletingAll(false);
      setDeleteWord("");
      notify({ tone: "success", message: t.deletedAll });
    } catch {
      setActionError(t.deleteFailed);
    } finally {
      setPending(false);
    }
  }

  if (state.status === "loading") {
    return <p className="text-sm text-app-fg-muted">{t.loading}</p>;
  }

  if (state.status === "failed") {
    return (
      <EmptyState
        title={t.loadFailed}
        action={
          <Button
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((value) => value + 1);
            }}
          >
            {t.retry}
          </Button>
        }
      />
    );
  }

  const dates = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });
  const shortDates = new Intl.DateTimeFormat(lang, { dateStyle: "medium" });
  const serviceName = (id: string) => services.find((service) => service.id === id)?.name ?? "";

  const viewSwitch =
    services.length > 0 ? (
      <SegmentedControl<"guests" | "seating">
        ariaLabel={t.views.guests}
        value={view}
        onChange={setView}
        options={[
          { value: "guests", label: t.views.guests },
          { value: "seating", label: t.views.seating },
        ]}
        className="justify-self-start"
      />
    ) : null;

  if (view === "seating") {
    return (
      <div className="grid gap-6">
        {viewSwitch}
        {state.status === "offline" ? (
          <Alert tone="warning" role="status">
            {fillCopy(t.offlineBanner, { date: dates.format(new Date(state.savedAt)) })}
          </Alert>
        ) : null}
        <SeatingPanel lang={lang} services={services} invitations={invitations} readOnly={readOnly} onSeated={showList} />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {viewSwitch}
      {state.status === "offline" ? (
        <Alert tone="warning" role="status">
          {fillCopy(t.offlineBanner, { date: dates.format(new Date(state.savedAt)) })}
        </Alert>
      ) : null}
      {services.length === 0 ? <Alert tone="warning">{words(t.noEventsWarning, copy)}</Alert> : null}
      {provider.rsvpDeadline ? (
        <Alert tone={isRsvpOpen(provider.rsvpDeadline, provider.timezone) ? "info" : "neutral"} role="status">
          {isRsvpOpen(provider.rsvpDeadline, provider.timezone)
            ? fillCopy(t.deadlineOpen, { date: formatRsvpDeadline(provider.rsvpDeadline, lang), count: unanswered })
            : fillCopy(t.deadlineClosed, { date: formatRsvpDeadline(provider.rsvpDeadline, lang) })}
        </Alert>
      ) : null}

      {services.length > 0 ? (
        <Card as="section">
          <CardHeader title={words(t.totalsTitle, copy)} description={t.totalsBody} />
          <CardBody>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {totals.map((total) => {
                const service = services.find((entry) => entry.id === total.serviceId);
                const max = service?.maxSpots;
                const over = typeof max === "number" && total.attendingPeople > max;
                return (
                  <li key={total.serviceId} className="grid gap-2 rounded-lg bg-app-subtle p-4">
                    <p className="font-medium text-app-fg">{service?.name}</p>
                    <p className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold tabular-nums text-app-fg">{total.attendingPeople}</span>
                      <span className="text-sm text-app-fg-muted">
                        {t.confirmedPeople}
                        {typeof max === "number" ? ` ${fillCopy(t.ofCapacity, { max })}` : ""}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="success">{fillCopy(t.attendingInvitations, { count: total.attendingInvitations })}</Badge>
                      <Badge tone="warning">{fillCopy(t.declinedInvitations, { count: total.declinedInvitations })}</Badge>
                      <Badge tone="neutral">{fillCopy(t.noAnswerInvitations, { count: total.noAnswerInvitations })}</Badge>
                    </div>
                    {over ? (
                      <p role="status" className="text-sm font-medium text-app-danger-fg">
                        {words(t.overCapacity, copy, { max: max ?? 0 })}
                      </p>
                    ) : null}
                    {Object.entries(choiceCounts(invitations, questions, total.serviceId)).map(([questionId, tally]) => {
                      const question = questions.find((entry) => entry.id === questionId);
                      if (!question) return null;
                      return (
                        <p key={questionId} className="text-sm text-app-fg-secondary">
                          <span className="font-medium text-app-fg">{questionLabel(question, lang)}:</span>{" "}
                          {question.options.map((option) => `${option.label} ${tally[option.id] ?? 0}`).join(" · ")}
                        </p>
                      );
                    })}
                    {service && total.attendingPeople > 0 && state.status === "ready" ? (
                      <div>
                        <Button
                          variant="plain"
                          size="sm"
                          aria-label={fillCopy(t.downloadCsvLabel, { event: service.name })}
                          leadingIcon={<DownloadSimple aria-hidden="true" size={16} />}
                          onClick={() => void downloadCsv(service)}
                        >
                          {t.downloadCsv}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card as="section">
        <CardHeader title={t.recentTitle} />
        {recent.length === 0 ? (
          <CardBody>
            <p className="text-sm text-app-fg-muted">{t.recentEmpty}</p>
          </CardBody>
        ) : (
          <StackedList>
            {recent.map((invitation) => {
              const overall = overallState(invitation);
              return (
                <StackedListItem
                  key={invitation.id}
                  trailing={<Badge tone={STATE_TONES[overall]}>{t.states[overall]}</Badge>}
                >
                  <p className="font-medium text-app-fg">{invitation.displayName}</p>
                  <p className="text-sm text-app-fg-muted">{dates.format(new Date(invitation.submittedAt ?? ""))}</p>
                </StackedListItem>
              );
            })}
          </StackedList>
        )}
      </Card>

      <Card as="section">
        <CardHeader
          title={t.listTitle}
          description={t.listBody}
          actions={
            readOnly ? undefined : (
              <div className="flex flex-wrap gap-2">
                {remindable.length > 0 ? (
                  <Button
                    variant="secondary"
                    leadingIcon={<EnvelopeSimple aria-hidden="true" size={16} />}
                    onClick={() => {
                      setActionError(null);
                      setReminding(true);
                    }}
                  >
                    {fillCopy(t.remindAll, { count: remindable.length })}
                  </Button>
                ) : null}
                <Button variant="secondary" disabled={services.length === 0} onClick={() => { setActionError(null); setPasting(true); }}>
                  {t.pasteList}
                </Button>
                <Button disabled={services.length === 0} onClick={() => { setActionError(null); setEditing({}); }}>
                  {t.addInvitation}
                </Button>
              </div>
            )
          }
        />
        <CardBody className="space-y-4">
          {invitations.length === 0 ? (
            <EmptyState
              variant="dashed"
              icon={<UsersThree aria-hidden="true" size={32} />}
              title={t.emptyTitle}
              body={t.emptyBody}
            />
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <Field label={t.search}>
                  <Input
                    type="search"
                    value={query}
                    placeholder={t.searchPlaceholder}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </Field>
                <SegmentedControl<Filter>
                  ariaLabel={t.filterLabel}
                  value={filter}
                  onChange={setFilter}
                  options={(["all", "no_answer", "attending", "partial", "declined", "not_contacted"] as const).map((value) => ({
                    value,
                    label: t.filters[value],
                  }))}
                />
              </div>

              {visible.length === 0 ? (
                <p className="text-sm text-app-fg-muted">{t.noMatches}</p>
              ) : (
                <Table>
                  <THead>
                    <Tr>
                      <Th>{t.columns.invitation}</Th>
                      <Th className="hidden sm:table-cell">{t.columns.seats}</Th>
                      <Th className="hidden md:table-cell">{t.columns.answers}</Th>
                      <Th align="right">
                        <span className="sr-only">{t.columns.actions}</span>
                      </Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {visible.map((invitation) => {
                      const overall = overallState(invitation);
                      return (
                        <Tr key={invitation.id}>
                          <Td className="whitespace-normal">
                            <span className="block break-words font-medium text-app-fg">{invitation.displayName}</span>
                            {invitation.contactPhone || invitation.contactEmail ? (
                              <span className="block break-all text-app-fg-muted">
                                {[invitation.contactPhone, invitation.contactEmail].filter(Boolean).join(" · ")}
                              </span>
                            ) : null}
                            {invitation.lastContactedAt ? (
                              <span className="block text-xs text-app-fg-muted">
                                {fillCopy(t.contactedOn, { date: shortDates.format(new Date(invitation.lastContactedAt)) })}
                              </span>
                            ) : null}
                            <span className="mt-1 block md:hidden">
                              <Badge tone={STATE_TONES[overall]}>{t.states[overall]}</Badge>
                            </span>
                          </Td>
                          <Td className="hidden whitespace-nowrap sm:table-cell">
                            {countCopy(invitation.seatLimit, t.seatsValueOne, t.seatsValue)}
                          </Td>
                          <Td className="hidden whitespace-normal md:table-cell">
                            <ul className="grid gap-1">
                              {invitation.eventIds
                                .filter((id) => serviceIds.includes(id))
                                .map((id) => {
                                  const answer = responseState(invitation, id) ?? "no_answer";
                                  const coming = invitation.guests.filter((guest) => guest.attending[id]).length;
                                  return (
                                    <li key={id} className="flex flex-wrap items-center gap-2 text-sm">
                                      <span className="text-app-fg-secondary">{serviceName(id)}</span>
                                      <Badge tone={STATE_TONES[answer]}>
                                        {answer === "attending"
                                          ? fillCopy(t.attendingValue, { count: coming, seats: invitation.seatLimit })
                                          : t.states[answer]}
                                      </Badge>
                                    </li>
                                  );
                                })}
                            </ul>
                          </Td>
                          <Td align="right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <a
                                href={whatsappUrl(invitation.contactPhone, messageFor(invitation))}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={fillCopy(t.whatsappLabel, { name: invitation.displayName })}
                                title={fillCopy(t.whatsappLabel, { name: invitation.displayName })}
                                className={buttonStyles({ variant: "plain", iconOnly: true })}
                                onClick={() => {
                                  if (!readOnly) void recordContacted(invitation);
                                }}
                              >
                                <WhatsappLogo aria-hidden="true" size={16} />
                              </a>
                              {readOnly ? null : (
                                <IconButton
                                  label={
                                    invitation.contactEmail
                                      ? fillCopy(t.emailLabel, { name: invitation.displayName })
                                      : fillCopy(t.noEmail, { name: invitation.displayName })
                                  }
                                  icon={<EnvelopeSimple aria-hidden="true" size={16} />}
                                  disabled={!invitation.contactEmail}
                                  onClick={() => void sendEmail(invitation)}
                                />
                              )}
                              <IconButton
                                label={`${t.copyLink}: ${invitation.displayName}`}
                                icon={<Copy aria-hidden="true" size={16} />}
                                onClick={() => copyLink(invitation)}
                              />
                              {readOnly ? null : (
                                <>
                                  <IconButton
                                    label={fillCopy(t.editLabel, { name: invitation.displayName })}
                                    icon={<PencilSimple aria-hidden="true" size={16} />}
                                    onClick={() => {
                                      setActionError(null);
                                      setEditing({ invitation });
                                    }}
                                  />
                                  <IconButton
                                    label={fillCopy(t.deleteLabel, { name: invitation.displayName })}
                                    icon={<Trash aria-hidden="true" size={16} />}
                                    onClick={() => {
                                      setActionError(null);
                                      setDeleting(invitation);
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              )}

              {readOnly ? null : (
                <div className="flex justify-end">
                  <Button variant="danger-plain" size="sm" onClick={() => { setActionError(null); setDeletingAll(true); }}>
                    {t.deleteAll}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <InvitationEditor
        open={editing !== null}
        lang={lang}
        services={services}
        invitation={editing?.invitation}
        questions={questions}
        defaultSeats={defaultSeats}
        invitationUrl={editing?.invitation ? linkFor(editing.invitation) : undefined}
        pending={pending}
        error={actionError}
        onSave={save}
        onRegenerate={regenerate}
        onClose={() => setEditing(null)}
      />

      <PasteImportDialog
        open={pasting}
        lang={lang}
        services={services}
        defaultSeats={defaultSeats}
        pending={pending}
        error={actionError}
        onImport={importRows}
        onClose={() => setPasting(false)}
      />

      <ConfirmDialog
        open={reminding}
        title={t.remindAllTitle}
        body={countCopy(remindable.length, t.remindAllBodyOne, t.remindAllBody)}
        confirmLabel={t.remindAllConfirm}
        cancelLabel={t.editor.cancel}
        closeLabel={dashboardCopy[lang].closeDialog}
        pending={pending}
        error={reminding ? (actionError ?? undefined) : undefined}
        onConfirm={remindAll}
        onCancel={() => setReminding(false)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? fillCopy(t.deleteTitle, { name: deleting.displayName }) : ""}
        body={t.deleteBody}
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.keep}
        closeLabel={dashboardCopy[lang].closeDialog}
        tone="danger"
        pending={pending}
        error={actionError ?? undefined}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <Dialog
        open={deletingAll}
        onClose={() => setDeletingAll(false)}
        title={t.deleteAllTitle}
        description={t.deleteAllBody}
        alert
        closeLabel={dashboardCopy[lang].closeDialog}
      >
        <div className="grid gap-4">
          {actionError ? <Alert tone="danger" role="alert" title={actionError} /> : null}
          <Field label={fillCopy(t.deleteAllTypeLabel, { word: t.deleteAllWord })}>
            <Input value={deleteWord} autoComplete="off" onChange={(event) => setDeleteWord(event.target.value)} />
          </Field>
          <DialogActions>
            <Button variant="secondary" onClick={() => setDeletingAll(false)} disabled={pending}>
              {t.keep}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              disabled={deleteWord.trim().toUpperCase() !== t.deleteAllWord}
              onClick={confirmDeleteAll}
            >
              {t.deleteAllConfirm}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}
