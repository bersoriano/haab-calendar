"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

import { Alert, Button, Checkbox, Dialog, DialogActions, Field, StackedList, StackedListItem } from "@/components/app-ui";
import { fillTemplate } from "@/components/booking/i18n/translations";
import { translations as landingTranslations } from "@/components/landing/translations";
import { countLabel, dashboardCopy } from "@/components/provider/dashboard-copy";
import { formatDateLabel, formatTimeRange } from "@/lib/format";
import { buildProviderPath } from "@/lib/public-url";
import { VERTICAL_IDS, type BookingRecord, type Lang, type VerticalId } from "@/lib/types";

const BLOCKING_PREVIEW = 5;

/**
 * Starts a business-type change: choose the new type, read what is replaced
 * and what stays, acknowledge it. Nothing is changed here — Continue opens a
 * draft. A page with upcoming bookings, or someone mid-booking, is stopped
 * before any type is picked.
 */
export function ChangeBusinessTypeDialog({
  lang,
  currentVertical,
  slug,
  summary,
  blocking,
  onCancel,
  onGoToBookings,
  onContinue,
  initialVertical,
}: {
  lang: Lang;
  currentVertical: VerticalId;
  slug: string;
  summary: { services: number; openDays: number; hasDailyLimit: boolean };
  blocking: { bookings: BookingRecord[]; activeHolds: number };
  onCancel: () => void;
  onGoToBookings: () => void;
  onContinue: (vertical: VerticalId) => void;
  /** Opens straight on the warning for this type. */
  initialVertical?: VerticalId;
}) {
  const copy = dashboardCopy[lang].businessType;
  const verticals = landingTranslations[lang].home.verticals;
  const [selected, setSelected] = useState<VerticalId | undefined>(initialVertical);
  const [acknowledged, setAcknowledged] = useState(false);
  const blocked = blocking.bookings.length > 0 || blocking.activeHolds > 0;

  let title: string;
  let body: ReactNode;
  let footer: ReactNode;

  if (blocked) {
    title = copy.blockedTitle;
    body = (
      <div className="grid gap-4">
        {blocking.bookings.length > 0 ? (
          <>
            <p className="text-sm text-app-fg">
              {fillTemplate(copy.blockedBookings, {
                bookings: countLabel(copy.bookingsCount, blocking.bookings.length),
              })}
            </p>
            <StackedList className="rounded-lg ring-1 ring-app-border">
              {blocking.bookings.slice(0, BLOCKING_PREVIEW).map((booking) => (
                <StackedListItem key={booking.id} className="px-4 py-3 sm:px-4">
                  <p className="text-sm font-semibold text-app-fg">{booking.clientName}</p>
                  <p className="mt-0.5 text-sm text-app-fg-muted">
                    {booking.serviceName} · {formatDateLabel(booking.dateKey, lang)} ·{" "}
                    {formatTimeRange(booking.startTime, booking.endTime, lang)}
                  </p>
                </StackedListItem>
              ))}
            </StackedList>
          </>
        ) : (
          <p className="text-sm text-app-fg">{copy.blockedHolds}</p>
        )}
      </div>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={onCancel}>
          {copy.cancel}
        </Button>
        {blocking.bookings.length > 0 ? <Button onClick={onGoToBookings}>{copy.goToBookings}</Button> : null}
      </>
    );
  } else if (!selected) {
    title = copy.pickTitle;
    body = (
      <div className="grid gap-4">
        <p className="text-sm text-app-fg-muted">{copy.pickBody}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {VERTICAL_IDS.filter((id) => id !== currentVertical).map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(id);
                  setAcknowledged(false);
                }}
                className="flex h-full min-h-11 w-full items-start justify-between gap-3 rounded-lg bg-app-surface p-4 text-left ring-1 ring-inset ring-app-border transition-colors hover:bg-app-accent-soft hover:ring-app-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-app-fg">{verticals[id].label}</span>
                  <span className="mt-0.5 block text-sm text-app-fg-muted">{verticals[id].tagline}</span>
                </span>
                <ArrowRight aria-hidden="true" size={18} className="mt-1 shrink-0 text-app-fg-muted" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
    footer = (
      <Button variant="secondary" onClick={onCancel}>
        {copy.cancel}
      </Button>
    );
  } else {
    const typeLabel = verticals[selected].label;
    title = fillTemplate(copy.warningTitle, { type: typeLabel });
    body = (
      <div className="grid gap-4 text-sm">
        <Alert tone="warning" title={copy.replacedTitle}>
          {fillTemplate(copy.replacedBody, {
            services: countLabel(copy.servicesCount, summary.services),
            type: typeLabel,
          })}
        </Alert>
        <section className="rounded-lg bg-app-subtle p-4 text-app-fg">
          <h3 className="font-semibold">{copy.staysTitle}</h3>
          <ul className="mt-1 list-disc pl-5 text-app-fg-muted">
            {copy.stays.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3">
            {fillTemplate(copy.linkMoves, {
              from: buildProviderPath(currentVertical, slug),
              to: buildProviderPath(selected, slug),
            })}
          </p>
        </section>
        <p className="text-app-fg-muted">{copy.notCarried}</p>
        <Field label={copy.acknowledge} inline className="rounded-lg p-4 ring-1 ring-app-border">
          <Checkbox checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
        </Field>
      </div>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={() => setSelected(undefined)}>
          {copy.back}
        </Button>
        <Button disabled={!acknowledged} onClick={() => onContinue(selected)}>
          {copy.continue}
        </Button>
      </>
    );
  }

  return (
    <Dialog
      open
      onClose={onCancel}
      title={title}
      closeLabel={copy.cancel}
      footer={<DialogActions>{footer}</DialogActions>}
    >
      {body}
    </Dialog>
  );
}
