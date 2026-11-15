"use client";

import { ArrowCounterClockwise, CheckCircle, QrCode } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, Select } from "@/components/app-ui";
import { fillCopy } from "@/components/invitations/invitation-copy";
import { countCopy, guestsCopy, type GuestsCopy } from "@/components/provider/guests/guests-copy";
import { QrCamera } from "@/components/provider/QrCamera";
import { getDateTimeKeysInTimeZone } from "@/lib/date";
import {
  applyCheckins,
  arrivals,
  findByTokenHash,
  invitationTokenFromCode,
  searchDoor,
  type CheckinEntry,
  type DoorGuest,
  type DoorInvitation,
  type DoorList,
} from "@/lib/door";
import { readCheckinQueue, readDoorList, writeCheckinQueue, writeDoorList } from "@/lib/door-store";
import type { Lang, Service } from "@/lib/types";

const CHECKIN_PATH = "/api/provider/checkin";
const RETRY_MS = 20_000;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Today's event in the page's zone, else the first one. */
export function defaultDoorEvent(services: Service[], timeZone: string | undefined, now = new Date()): string {
  const today = getDateTimeKeysInTimeZone(now, timeZone || "UTC").dateKey;
  return (services.find((service) => service.occurrenceMode === "single" && service.occurrenceDate === today) ?? services[0])?.id ?? "";
}

type ScanResult = { kind: "found"; invitation: DoorInvitation } | { kind: "error"; message: string } | null;

/**
 * The door of an invitation-only page. The event's list lives on this phone,
 * so scanning and checking in keep working without a connection; arrivals are
 * queued here and sent when the connection allows.
 */
export function DoorCheckIn({
  lang,
  services,
  pageKey,
  timeZone,
}: {
  lang: Lang;
  services: Service[];
  /** Keeps each page's list apart on a shared phone. */
  pageKey: string;
  timeZone?: string;
}) {
  const t = guestsCopy[lang].door;
  const [serviceId, setServiceId] = useState(() => defaultDoorEvent(services, timeZone));
  const [queue, setQueue] = useState<CheckinEntry[]>(() => readCheckinQueue(pageKey));
  const [list, setList] = useState<DoorList | null>(() => {
    const cached = readDoorList(pageKey, serviceId);
    return cached ? applyCheckins(cached, readCheckinQueue(pageKey)) : null;
  });
  const [loadFailed, setLoadFailed] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine !== false);
  const [scan, setScan] = useState<ScanResult>(null);
  const [cycle, setCycle] = useState(0);
  const [query, setQuery] = useState("");
  const queueRef = useRef<CheckinEntry[]>(queue);
  const flushing = useRef(false);

  const keep = useCallback(
    (next: DoorList) => {
      setList(next);
      if (!writeDoorList(pageKey, next)) setStorageOk(false);
    },
    [pageKey],
  );

  const saveQueue = useCallback(
    (next: CheckinEntry[]) => {
      queueRef.current = next;
      setQueue(next);
      if (!writeCheckinQueue(pageKey, next)) setStorageOk(false);
    },
    [pageKey],
  );

  const refresh = useCallback(async () => {
    if (!serviceId) return;
    try {
      const response = await fetch(`${CHECKIN_PATH}?event=${encodeURIComponent(serviceId)}&lang=${lang}`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const { list: server } = (await response.json()) as { list: DoorList };
      // Arrivals not sent yet stay on top of whatever the server knows.
      keep(applyCheckins(server, queueRef.current));
      setLoadFailed(false);
    } catch {
      setLoadFailed((failed) => failed || !readDoorList(pageKey, serviceId));
    }
  }, [keep, lang, pageKey, serviceId]);

  const flush = useCallback(async () => {
    if (flushing.current || queueRef.current.length === 0) return;
    flushing.current = true;
    const sending = queueRef.current;
    try {
      const byEvent = new Map<string, CheckinEntry[]>();
      for (const entry of sending) byEvent.set(entry.serviceId, [...(byEvent.get(entry.serviceId) ?? []), entry]);
      for (const [eventId, entries] of byEvent) {
        const response = await fetch(CHECKIN_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId: eventId, entries: entries.map(({ guestId, at }) => ({ guestId, at })) }),
        });
        if (!response.ok && response.status >= 500) throw new Error(`status ${response.status}`);
      }
      // Anything queued while sending stays queued.
      saveQueue(queueRef.current.filter((entry) => !sending.includes(entry)));
      await refresh();
    } catch {
      // Still offline or the server is down: the queue waits for the next try.
    } finally {
      flushing.current = false;
    }
  }, [refresh, saveQueue]);

  // Each event's list from the server, over what this phone already keeps.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  function chooseEvent(next: string) {
    const cached = readDoorList(pageKey, next);
    setServiceId(next);
    setList(cached ? applyCheckins(cached, queueRef.current) : null);
    setLoadFailed(false);
    setScan(null);
  }

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [flush]);

  useEffect(() => {
    if (queue.length === 0) return;
    const timer = window.setInterval(() => void flush(), RETRY_MS);
    return () => window.clearInterval(timer);
  }, [queue.length, flush]);

  function checkIn(guestIds: string[]) {
    if (!list || guestIds.length === 0) return;
    const at = new Date().toISOString();
    const entries = guestIds.map((guestId) => ({ serviceId, guestId, at }));
    saveQueue([...queueRef.current, ...entries]);
    keep(applyCheckins(list, entries));
    void flush();
  }

  async function undo(guest: DoorGuest) {
    try {
      const response = await fetch(CHECKIN_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, entries: [{ guestId: guest.guestId, at: null }] }),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      saveQueue(queueRef.current.filter((entry) => entry.guestId !== guest.guestId || entry.serviceId !== serviceId));
      await refresh();
    } catch {
      setOnline(false);
    }
  }

  const handleCode = useCallback(
    async (code: string) => {
      const token = invitationTokenFromCode(code);
      if (!token) {
        setScan({ kind: "error", message: t.notInvitation });
        return;
      }
      const current = list;
      const found = current ? findByTokenHash(current, await sha256Hex(token)) : null;
      setScan(found ? { kind: "found", invitation: found.invitation } : { kind: "error", message: t.notOnList });
    },
    [list, t.notInvitation, t.notOnList],
  );

  const matches = useMemo(() => (list ? searchDoor(list, query) : []), [list, query]);
  const counts = list ? arrivals(list) : null;
  const times = new Intl.DateTimeFormat(lang, { timeStyle: "short", timeZone: timeZone || undefined });
  const savedTimes = new Intl.DateTimeFormat(lang, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="grid max-w-3xl gap-6">
      <Card as="section">
        <CardBody className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Field label={t.eventLabel} className="min-w-0 flex-1">
              <Select value={serviceId} onChange={(event) => chooseEvent(event.target.value)}>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </Select>
            </Field>
            {counts ? (
              <p className="text-2xl font-semibold tabular-nums text-app-fg" role="status">
                {fillCopy(t.arrived, counts)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {!online ? <Badge tone="warning">{t.offline}</Badge> : null}
            {queue.length > 0 ? (
              <Badge tone="warning">{countCopy(queue.length, t.waitingOne, t.waiting)}</Badge>
            ) : online ? (
              <Badge tone="success">{t.synced}</Badge>
            ) : null}
          </div>
          {list && storageOk ? (
            <p className="text-sm text-app-fg-muted">{fillCopy(t.savedAt, { time: savedTimes.format(new Date(list.generatedAt)) })}</p>
          ) : null}
          {!storageOk ? <Alert tone="warning">{t.noStorage}</Alert> : null}
          {loadFailed && !list ? <Alert tone="danger" role="alert">{t.loadFailed}</Alert> : null}
          {list && list.guests.length === 0 ? <p className="text-sm text-app-fg-muted">{t.noList}</p> : null}
        </CardBody>
      </Card>

      <Card as="section">
        <CardHeader title={t.scanTitle} />
        <CardBody className="grid gap-4">
          {scan === null ? (
            <QrCamera key={cycle} onCode={(code) => void handleCode(code)} copy={t} />
          ) : scan.kind === "error" ? (
            <Alert tone="warning" role="alert">
              {scan.message}
            </Alert>
          ) : list ? (
            <HouseholdCard
              t={t}
              invitation={scan.invitation}
              list={list}
              times={times}
              online={online}
              onCheckIn={checkIn}
              onUndo={(guest) => void undo(guest)}
            />
          ) : null}
          {scan !== null ? (
            <div>
              <Button
                leadingIcon={<QrCode aria-hidden="true" size={16} />}
                onClick={() => {
                  setScan(null);
                  setCycle((value) => value + 1);
                }}
              >
                {t.scanNext}
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card as="section">
        <CardBody className="grid gap-4">
          <Field label={t.searchLabel}>
            <Input type="search" value={query} placeholder={t.searchPlaceholder} onChange={(event) => setQuery(event.target.value)} />
          </Field>
          {query.trim() && list ? (
            matches.length === 0 ? (
              <p className="text-sm text-app-fg-muted">{t.noMatches}</p>
            ) : (
              matches.map(({ invitation }) => (
                <HouseholdCard
                  key={invitation.invitationId}
                  t={t}
                  invitation={invitation}
                  list={list}
                  times={times}
                  online={online}
                  onCheckIn={checkIn}
                  onUndo={(guest) => void undo(guest)}
                />
              ))
            )
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

function HouseholdCard({
  t,
  invitation,
  list,
  times,
  online,
  onCheckIn,
  onUndo,
}: {
  t: GuestsCopy["door"];
  invitation: DoorInvitation;
  list: DoorList;
  times: Intl.DateTimeFormat;
  online: boolean;
  onCheckIn: (guestIds: string[]) => void;
  onUndo: (guest: DoorGuest) => void;
}) {
  const guests = invitation.guestIds.flatMap((id) => list.guests.find((guest) => guest.guestId === id) ?? []);
  const waiting = guests.filter((guest) => !guest.checkedInAt);

  return (
    <div className="grid gap-3 rounded-lg p-4 ring-1 ring-app-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-semibold text-app-fg">{invitation.invitationName}</p>
        {waiting.length > 1 ? (
          <Button onClick={() => onCheckIn(waiting.map((guest) => guest.guestId))}>
            {fillCopy(t.checkInAll, { count: waiting.length })}
          </Button>
        ) : null}
      </div>
      <ul className="grid gap-2">
        {guests.map((guest) => (
          <li key={guest.guestId} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-app-subtle px-3 py-2">
            <span className="min-w-0">
              <span className="block font-medium text-app-fg">{guest.label}</span>
              <span className="block text-sm text-app-fg-muted">{guest.table ?? t.noTable}</span>
            </span>
            {guest.checkedInAt ? (
              <span className="flex items-center gap-2">
                <Badge tone="success">
                  <CheckCircle aria-hidden="true" size={14} weight="fill" />{" "}
                  {fillCopy(t.checkedInAt, { time: times.format(new Date(guest.checkedInAt)) })}
                </Badge>
                <Button
                  variant="plain"
                  size="sm"
                  disabled={!online}
                  title={online ? undefined : t.undoOffline}
                  leadingIcon={<ArrowCounterClockwise aria-hidden="true" size={14} />}
                  onClick={() => onUndo(guest)}
                >
                  {t.undo}
                </Button>
              </span>
            ) : (
              <Button size="sm" onClick={() => onCheckIn([guest.guestId])}>
                {t.checkIn}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
