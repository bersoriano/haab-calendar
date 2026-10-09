"use client";

import { ArrowRight, Warning, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

import { fillTemplate } from "@/components/booking/i18n/translations";
import { translations as landingTranslations } from "@/components/landing/translations";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { ActionButton } from "@/components/ui/ActionButton";
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
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<VerticalId | undefined>(initialVertical);
  const [acknowledged, setAcknowledged] = useState(false);
  const blocked = blocking.bookings.length > 0 || blocking.activeHolds > 0;

  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // Once, on open: a parent re-render must not pull focus back to the panel.
  useEffect(() => {
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  let title: string;
  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (blocked) {
    title = copy.blockedTitle;
    body = (
      <div className="grid gap-4">
        {blocking.bookings.length > 0 ? (
          <>
            <p className="text-sm leading-6 text-[var(--ink)]">
              {fillTemplate(copy.blockedBookings, { count: String(blocking.bookings.length) })}
            </p>
            <ul className="grid gap-2">
              {blocking.bookings.slice(0, BLOCKING_PREVIEW).map((booking) => (
                <li
                  key={booking.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-[var(--ink)]">{booking.clientName}</p>
                  <p className="mt-0.5 text-[var(--muted)]">
                    {booking.serviceName} · {formatDateLabel(booking.dateKey, lang)} ·{" "}
                    {formatTimeRange(booking.startTime, booking.endTime, lang)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm leading-6 text-[var(--ink)]">{copy.blockedHolds}</p>
        )}
      </div>
    );
    footer = (
      <>
        <ActionButton tone="ghost" onClick={onCancel}>
          {copy.cancel}
        </ActionButton>
        {blocking.bookings.length > 0 ? (
          <ActionButton tone="primary" onClick={onGoToBookings}>
            {copy.goToBookings}
          </ActionButton>
        ) : null}
      </>
    );
  } else if (!selected) {
    title = copy.pickTitle;
    body = (
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-[var(--muted)]">{copy.pickBody}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {VERTICAL_IDS.filter((id) => id !== currentVertical).map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(id);
                  setAcknowledged(false);
                }}
                className="flex h-full min-h-11 w-full items-start justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-lowest)] p-4 text-left transition hover:border-[var(--primary)] hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-[var(--ink)]">{verticals[id].label}</span>
                  <span className="mt-0.5 block text-sm text-[var(--muted)]">
                    {verticals[id].tagline}
                  </span>
                </span>
                <ArrowRight aria-hidden="true" size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
    footer = (
      <ActionButton tone="ghost" onClick={onCancel}>
        {copy.cancel}
      </ActionButton>
    );
  } else {
    const typeLabel = verticals[selected].label;
    title = fillTemplate(copy.warningTitle, { type: typeLabel });
    body = (
      <div className="grid gap-4 text-sm leading-6">
        <section className="rounded-2xl border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 text-[var(--warning-strong)]">
          <h3 className="flex items-center gap-2 font-semibold">
            <Warning aria-hidden="true" size={18} />
            {copy.replacedTitle}
          </h3>
          <p className="mt-1">
            {fillTemplate(copy.replacedBody, { count: String(summary.services), type: typeLabel })}
          </p>
        </section>
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-[var(--ink)]">
          <h3 className="font-semibold">{copy.staysTitle}</h3>
          <ul className="mt-1 list-disc pl-5 text-[var(--muted)]">
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
        <p className="text-[var(--muted)]">{copy.notCarried}</p>
        <label className="flex min-h-11 items-start gap-3 rounded-2xl border border-[var(--line)] p-4 font-medium text-[var(--ink)]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
          />
          {copy.acknowledge}
        </label>
      </div>
    );
    footer = (
      <>
        <ActionButton tone="ghost" onClick={() => setSelected(undefined)}>
          {copy.back}
        </ActionButton>
        <ActionButton
          tone="primary"
          disabled={!acknowledged}
          onClick={() => onContinue(selected)}
        >
          {copy.continue}
        </ActionButton>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[rgba(15,23,32,0.55)] px-4 py-8 backdrop-blur-sm">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-xl rounded-[28px] border border-[var(--line)] bg-[var(--surface-lowest)] shadow-[0_30px_90px_rgba(15,23,42,0.28)] focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-5">
          <h2 id={titleId} className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
            {title}
          </h2>
          <button
            type="button"
            aria-label={copy.cancel}
            onClick={onCancel}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{body}</div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] px-6 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
}
