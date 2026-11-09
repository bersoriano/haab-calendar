"use client";

import { DownloadSimple, PencilSimple, Trash } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Field,
  IconButton,
  Input,
  Select,
  Switch,
  useToast,
} from "@/components/app-ui";
import { fillCopy } from "@/components/invitations/invitation-copy";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { guestsCopy } from "@/components/provider/guests/guests-copy";
import type { Invitation } from "@/lib/invitations";
import { attendingGuestIds, seatingFor, type SeatedGuest, type SeatingTable } from "@/lib/seating";
import type { Lang, Service } from "@/lib/types";

const SEATING_PATH = "/api/provider/seating";

type SeatingState = { tables: SeatingTable[]; published: boolean; publishedAt: string | null };

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as (T & { userMessage?: string }) | null;
  if (!response.ok || !payload) throw new Error(payload?.userMessage ?? `status ${response.status}`);
  return payload;
}

/**
 * Tables per event and who sits where. Seats a whole household in one choice,
 * then moves anyone individually; publishing shows each household its table.
 */
export function SeatingPanel({
  lang,
  services,
  invitations,
  readOnly,
  onSeated,
}: {
  lang: Lang;
  services: Service[];
  invitations: Invitation[];
  readOnly: boolean;
  /** The guest list after a seating change, so every view agrees. */
  onSeated: (invitations: Invitation[]) => void;
}) {
  const t = guestsCopy[lang].seating;
  const { notify } = useToast();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [state, setState] = useState<SeatingState | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSeats, setNewSeats] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string; seats: string } | null>(null);
  const [deleting, setDeleting] = useState<SeatingTable | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(SEATING_PATH, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`status ${response.status}`);
        setState((await response.json()) as SeatingState);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadFailed(true);
      });
    return () => controller.abort();
  }, []);

  const seating = useMemo(
    () => seatingFor(invitations, state?.tables ?? [], serviceId, lang),
    [invitations, state, serviceId, lang],
  );
  const eventTables = seating.tables.map(({ table }) => table);
  const disabled = readOnly || pending || !state;
  const dates = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error && !failure.message.startsWith("status") ? failure.message : t.failed);
    } finally {
      setPending(false);
    }
  }

  function seat(guestIds: string[], tableId: string | null) {
    return run(async () => {
      await send(`${SEATING_PATH}/assign`, "POST", { serviceId, guestIds, tableId });
      const moved = new Set(guestIds);
      onSeated(
        invitations.map((invitation) => ({
          ...invitation,
          guests: invitation.guests.map((guest) => {
            if (!moved.has(guest.id) || !guest.attending[serviceId]) return guest;
            const tables = { ...(guest.tables ?? {}) };
            if (tableId) tables[serviceId] = tableId;
            else delete tables[serviceId];
            return { ...guest, tables };
          }),
        })),
      );
    });
  }

  function addTable(event: FormEvent) {
    event.preventDefault();
    return run(async () => {
      const { table } = await send<{ table: SeatingTable }>(SEATING_PATH, "POST", {
        serviceId,
        name: newName,
        seatCount: newSeats || null,
      });
      setState((current) => (current ? { ...current, tables: [...current.tables, table] } : current));
      setNewName("");
      setNewSeats("");
    });
  }

  function saveRename(event: FormEvent) {
    event.preventDefault();
    const target = renaming;
    if (!target) return;
    return run(async () => {
      const { table } = await send<{ table: SeatingTable }>(`${SEATING_PATH}/tables/${target.id}`, "PATCH", {
        name: target.name,
        seatCount: target.seats || null,
      });
      setState((current) =>
        current ? { ...current, tables: current.tables.map((entry) => (entry.id === table.id ? table : entry)) } : current,
      );
      setRenaming(null);
    });
  }

  function removeTable() {
    const target = deleting;
    if (!target) return;
    return run(async () => {
      await send(`${SEATING_PATH}/tables/${target.id}`, "DELETE");
      setState((current) =>
        current ? { ...current, tables: current.tables.filter((entry) => entry.id !== target.id) } : current,
      );
      onSeated(
        invitations.map((invitation) => ({
          ...invitation,
          guests: invitation.guests.map((guest) => {
            if (guest.tables?.[target.serviceId] !== target.id) return guest;
            const tables = { ...guest.tables };
            delete tables[target.serviceId];
            return { ...guest, tables };
          }),
        })),
      );
      setDeleting(null);
    });
  }

  function publish(published: boolean) {
    return run(async () => {
      const next = await send<{ published: boolean; publishedAt: string | null }>(`${SEATING_PATH}/publish`, "POST", {
        published,
      });
      setState((current) => (current ? { ...current, ...next } : current));
      notify({ tone: "success", message: published ? t.published : t.unpublished });
    });
  }

  async function download() {
    try {
      const response = await fetch(`${SEATING_PATH}/export?event=${encodeURIComponent(serviceId)}&lang=${lang}`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const fileName = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "seating.csv";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify({ tone: "neutral", message: guestsCopy[lang].downloadFailed });
    }
  }

  if (loadFailed) {
    return <Alert tone="danger" role="alert" title={t.failed} />;
  }

  /**
   * A choice of table for some guests. With a placeholder (a whole household)
   * picking it does nothing; otherwise the empty choice frees the seat.
   */
  function tableSelect(guests: string[], label: string, current: string, placeholder?: string) {
    return (
      <Select
        aria-label={label}
        value={current}
        disabled={disabled || eventTables.length === 0}
        onChange={(event) => {
          if (placeholder && !event.target.value) return;
          void seat(guests, event.target.value || null);
        }}
      >
        <option value="">{placeholder ?? t.notSeated}</option>
        {eventTables.map((table) => (
          <option key={table.id} value={table.id}>
            {table.name}
          </option>
        ))}
      </Select>
    );
  }

  const unseatedByInvitation = groupByInvitation(seating.unseated);

  return (
    <div className="grid gap-6">
      {error ? <Alert tone="danger" role="alert" title={error} /> : null}

      <Card as="section">
        <CardBody className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
          <Field label={t.eventLabel}>
            <Select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-2">
            <Field label={t.publishLabel} description={t.publishHint} inline>
              <Switch
                checked={state?.published === true}
                disabled={disabled}
                onChange={(event) => void publish(event.target.checked)}
              />
            </Field>
            <p className="text-sm text-app-fg-muted">
              {state?.published && state.publishedAt
                ? fillCopy(t.publishedOn, { date: dates.format(new Date(state.publishedAt)) })
                : t.notPublished}
            </p>
            <div>
              <Button
                variant="plain"
                size="sm"
                leadingIcon={<DownloadSimple aria-hidden="true" size={16} />}
                disabled={!serviceId}
                onClick={() => void download()}
              >
                {t.download}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card as="section">
          <CardHeader title={fillCopy(t.unseatedTitle, { count: seating.unseated.length })} />
          <CardBody className="grid gap-4">
            {seating.unseated.length === 0 ? (
              <p className="text-sm text-app-fg-muted">
                {seating.tables.some(({ seated }) => seated.length > 0) ? t.allSeated : t.nobodyYet}
              </p>
            ) : (
              unseatedByInvitation.map(({ invitationId, invitationName, guests }) => {
                const invitation = invitations.find((entry) => entry.id === invitationId);
                const household = invitation ? attendingGuestIds(invitation, serviceId) : guests.map((g) => g.guestId);
                return (
                  <div key={invitationId} className="grid gap-2 rounded-lg bg-app-subtle p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-app-fg">{invitationName}</p>
                      <div className="w-full sm:w-56">
                        {tableSelect(household, fillCopy(t.seatAllLabel, { name: invitationName }), "", t.seatAll)}
                      </div>
                    </div>
                    {guests.map((guest) => (
                      <div key={guest.guestId} className="flex flex-wrap items-center justify-between gap-2 pl-3">
                        <span className="text-sm text-app-fg-secondary">{guest.label}</span>
                        <div className="w-full sm:w-56">
                          {tableSelect([guest.guestId], fillCopy(t.seatLabel, { name: guest.label }), "")}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        <Card as="section">
          <CardHeader title={guestsCopy[lang].views.seating} />
          <CardBody className="grid gap-4">
            {seating.tables.length === 0 ? <p className="text-sm text-app-fg-muted">{t.noTables}</p> : null}
            {seating.tables.map(({ table, seated, over }) => (
              <div key={table.id} className="grid gap-2 rounded-lg p-3 ring-1 ring-app-border">
                {renaming?.id === table.id ? (
                  <form onSubmit={saveRename} className="flex flex-wrap items-end gap-2">
                    <Field label={t.tableName} className="min-w-0 flex-1">
                      <Input
                        value={renaming.name}
                        maxLength={60}
                        onChange={(event) => setRenaming({ ...renaming, name: event.target.value })}
                      />
                    </Field>
                    <Field label={t.seats} className="w-24">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={renaming.seats}
                        onChange={(event) => setRenaming({ ...renaming, seats: event.target.value })}
                      />
                    </Field>
                    <Button type="submit" size="sm" loading={pending}>
                      {t.save}
                    </Button>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-app-fg">{table.name}</p>
                    <div className="flex items-center gap-1">
                      <Badge tone={over ? "danger" : "neutral"}>
                        {table.seatCount === null
                          ? fillCopy(t.filledNoLimit, { count: seated.length })
                          : fillCopy(t.filled, { count: seated.length, seats: table.seatCount })}
                      </Badge>
                      {readOnly ? null : (
                        <>
                          <IconButton
                            label={fillCopy(t.renameLabel, { name: table.name })}
                            icon={<PencilSimple aria-hidden="true" size={16} />}
                            disabled={disabled}
                            onClick={() =>
                              setRenaming({ id: table.id, name: table.name, seats: table.seatCount ? String(table.seatCount) : "" })
                            }
                          />
                          <IconButton
                            label={fillCopy(t.deleteLabel, { name: table.name })}
                            icon={<Trash aria-hidden="true" size={16} />}
                            disabled={disabled}
                            onClick={() => setDeleting(table)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}
                {over ? <p className="text-sm font-medium text-app-danger-fg">{t.over}</p> : null}
                {seated.map((guest) => (
                  <div key={guest.guestId} className="flex flex-wrap items-center justify-between gap-2 pl-3">
                    <span className="text-sm text-app-fg-secondary">
                      {guest.label} <span className="text-app-fg-muted">· {guest.invitationName}</span>
                    </span>
                    <div className="w-full sm:w-56">
                      {tableSelect([guest.guestId], fillCopy(t.seatLabel, { name: guest.label }), table.id)}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {readOnly ? null : (
              <form onSubmit={addTable} className="flex flex-wrap items-end gap-2 border-t border-app-border pt-4">
                <Field label={t.tableName} className="min-w-0 flex-1">
                  <Input
                    value={newName}
                    maxLength={60}
                    placeholder={t.tableNamePlaceholder}
                    onChange={(event) => setNewName(event.target.value)}
                  />
                </Field>
                <Field label={t.seats} className="w-24">
                  <Input type="number" min={1} max={100} value={newSeats} onChange={(event) => setNewSeats(event.target.value)} />
                </Field>
                <Button type="submit" disabled={disabled || !newName.trim() || !serviceId}>
                  {t.addTable}
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? fillCopy(t.deleteTitle, { name: deleting.name }) : ""}
        body={t.deleteBody}
        confirmLabel={t.deleteConfirm}
        cancelLabel={guestsCopy[lang].keep}
        closeLabel={dashboardCopy[lang].closeDialog}
        tone="danger"
        pending={pending}
        onConfirm={() => void removeTable()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function groupByInvitation(guests: SeatedGuest[]) {
  const groups: { invitationId: string; invitationName: string; guests: SeatedGuest[] }[] = [];
  for (const guest of guests) {
    const group = groups.find((entry) => entry.invitationId === guest.invitationId);
    if (group) group.guests.push(guest);
    else groups.push({ invitationId: guest.invitationId, invitationName: guest.invitationName, guests: [guest] });
  }
  return groups;
}

