"use client";

import type { Dispatch, SetStateAction } from "react";
import type { BookingType, Service, ServiceDraft } from "@/lib/types";
import { DURATION_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatDuration, getBookingTypeLabel, bookingTypeTone } from "@/lib/format";
import { ActionButton, EmptyState, SectionTitle, ToneBadge } from "@/components/ui";
import { adminFieldClass, adminInsetClass, adminPanelClass } from "@/components/provider/adminGlass";
import type { VerticalHints } from "@/config/verticals";
import { defaultCopy, type VerticalCopy } from "@/lib/vertical-copy";

function formatDurationOption(minutes: number) {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} minutes`;
}

export function ServiceEditor({
  services,
  serviceDraft,
  onDraftChange,
  editingServiceId,
  onUpsert,
  onReset,
  onEdit,
  onRemove,
  disabled = false,
  hints,
  copy = defaultCopy,
}: {
  services: Service[];
  serviceDraft: ServiceDraft;
  onDraftChange: Dispatch<SetStateAction<ServiceDraft>>;
  editingServiceId: string | null;
  onUpsert: () => void;
  onReset: () => void;
  onEdit: (service: Service) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  hints?: VerticalHints;
  copy?: VerticalCopy;
}) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className={cn(adminPanelClass, "p-6")}>
        <SectionTitle
          title={copy.Services}
          body={copy.phrases.serviceEditorBody}
        />

        {disabled ? (
          <div className={cn("mt-4", adminInsetClass, "px-4 py-3 text-sm font-medium text-[var(--muted)]")}>
            Configured by the parent app. Service editing is read-only in this mode.
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {services.length === 0 ? (
            <EmptyState
              title={copy.phrases.noServicesTitle}
              body={copy.phrases.noServicesBody}
            />
          ) : (
            services.map((service) => (
              <div key={service.id} className={cn(adminInsetClass, "p-5")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-[var(--ink)]">{service.name}</h4>
                      <ToneBadge tone={bookingTypeTone(service.bookingType)}>
                        {getBookingTypeLabel(service.bookingType)}
                      </ToneBadge>
                      <ToneBadge tone="neutral">{formatDuration(service)}</ToneBadge>
                    </div>
                    {service.description ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {service.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                      {service.capacity ? <span>Capacity: {service.capacity}</span> : null}
                      {service.cost ? <span>Total: {service.cost}</span> : null}
                      {service.notes ? <span>Notes: {service.notes}</span> : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton tone="ghost" disabled={disabled} onClick={() => onEdit(service)}>
                      Edit
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      disabled={disabled || services.length <= 1}
                      onClick={() => onRemove(service.id)}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </div>
              </div>
            ))
          )}
          {!disabled && services.length === 1 ? (
            <p className="text-sm text-[var(--muted)]">
              {`Keep at least one ${copy.service}. Add another before you can remove this one.`}
            </p>
          ) : null}
        </div>
      </div>

      <div className={cn(adminPanelClass, "p-6")}>
        <SectionTitle
          eyebrow={editingServiceId ? copy.phrases.editServiceEyebrow : copy.phrases.newServiceEyebrow}
          title={editingServiceId ? copy.phrases.editServiceTitle : copy.phrases.newServiceTitle}
        />
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
            {`${copy.Service} name`}
            <input
              disabled={disabled}
              value={serviceDraft.name}
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={hints?.serviceName ?? "Court Rental"}
              className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
            Booking type
            <select
              disabled={disabled}
              value={serviceDraft.bookingType}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  bookingType: event.target.value as BookingType,
                }))
              }
              className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
            >
              <option value="appointment">Appointment</option>
              <option value="full-day">Full Day</option>
            </select>
          </label>
          {serviceDraft.bookingType === "appointment" ? (
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Duration
              <select
                disabled={disabled}
                value={serviceDraft.durationMinutes}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    durationMinutes: Number(event.target.value),
                  }))
                }
                className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
              >
                {DURATION_OPTIONS.map((duration) => (
                  <option key={duration} value={duration}>
                    {formatDurationOption(duration)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
            Description
            <textarea
              disabled={disabled}
              value={serviceDraft.description}
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, description: event.target.value }))
              }
              placeholder={hints?.description ?? copy.phrases.serviceDescPlaceholder}
              rows={4}
              className={cn(adminFieldClass, "disabled:opacity-45")}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
            Capacity
            <input
              disabled={disabled}
              value={serviceDraft.capacity}
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, capacity: event.target.value }))
              }
              placeholder={hints?.capacity ?? "Max 12 people"}
              className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
            Total
            <input
              disabled={disabled}
              value={serviceDraft.cost}
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, cost: event.target.value }))
              }
              placeholder={hints?.cost ?? "$80 / session"}
              className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
            Notes
            <input
              disabled={disabled}
              value={serviceDraft.notes}
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Bring prior records or arrive 10 minutes early."
              className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
            />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <ActionButton tone="primary" disabled={disabled} onClick={onUpsert}>
            {editingServiceId ? copy.phrases.saveServiceButton : copy.phrases.addServiceButton}
          </ActionButton>
          <ActionButton tone="ghost" onClick={onReset}>
            Clear
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
