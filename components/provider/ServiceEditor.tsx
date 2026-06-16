"use client";

import type { Dispatch, SetStateAction } from "react";
import type { BookingType, ProviderInfo, Service, ServiceDraft, VerticalId } from "@/lib/types";
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
  provider,
  vertical,
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
  provider: ProviderInfo;
  vertical?: VerticalId;
}) {
  const showMedicalSpecialty =
    vertical === "healthcare" && serviceDraft.bookingType === "appointment";
  const isEvents = vertical === "events";
  const isSingleOccurrence = serviceDraft.occurrenceMode === "single";
  const isEventsSingle = isEvents && isSingleOccurrence;
  const hasAddress1 = provider.address1.trim().length > 0;
  const hasAddress2 = provider.address2.trim().length > 0;
  const hasPhone1 = provider.phoneNumber1.trim().length > 0;
  const hasPhone2 = provider.phoneNumber2.trim().length > 0;
  const nextAddressSlot = !hasAddress1 ? "1" : !hasAddress2 ? "2" : null;
  const nextPhoneSlot = !hasPhone1 ? "1" : !hasPhone2 ? "2" : null;
  const addressHint = nextAddressSlot
    ? `We'll save this as Address ${nextAddressSlot} in your provider profile so other services can reuse it.`
    : "Both provider address slots are already taken — this address will stay with this service only.";
  const phoneHint = nextPhoneSlot
    ? `We'll save this as Phone ${nextPhoneSlot} in your provider profile so other services can reuse it.`
    : "Both provider phone slots are already taken — this phone will stay with this service only.";
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
                      {service.medicalSpecialty ? (
                        <span>Specialty: {service.medicalSpecialty}</span>
                      ) : null}
                      {service.cost ? <span>Total: {service.cost}</span> : null}
                      {service.notes ? <span>Notes: {service.notes}</span> : null}
                      {service.linkedAddress1 && hasAddress1 ? (
                        <span>Address 1: {provider.address1}</span>
                      ) : null}
                      {service.linkedAddress2 && hasAddress2 ? (
                        <span>Address 2: {provider.address2}</span>
                      ) : null}
                      {service.linkedPhone1 && hasPhone1 ? (
                        <span>Phone 1: {provider.phoneNumber1}</span>
                      ) : null}
                      {service.linkedPhone2 && hasPhone2 ? (
                        <span>Phone 2: {provider.phoneNumber2}</span>
                      ) : null}
                      {service.customAddress ? (
                        <span>Address: {service.customAddress}</span>
                      ) : null}
                      {service.customPhone ? (
                        <span>Phone: {service.customPhone}</span>
                      ) : null}
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
          {isEvents ? (
            <div className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Occurrence
              <div className="grid grid-cols-2 gap-2">
                {(["single", "periodic"] as const).map((mode) => {
                  const active = serviceDraft.occurrenceMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={disabled}
                      aria-pressed={active}
                      onClick={() =>
                        onDraftChange((current) => ({ ...current, occurrenceMode: mode }))
                      }
                      className={cn(
                        "min-h-12 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
                        active
                          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)] ring-2 ring-[var(--accent)]"
                          : "bg-white text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.45)] hover:ring-[var(--accent)]/40",
                      )}
                    >
                      {mode === "single" ? "Single occurrence" : "Periodic"}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs leading-5 text-[var(--muted)]">
                {isSingleOccurrence
                  ? "This event happens once, on a fixed date and time."
                  : "This event repeats on your weekly availability."}
              </p>
            </div>
          ) : null}
          {!isEventsSingle ? (
          <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
            Booking type
            <select
              disabled={disabled}
              value={serviceDraft.bookingType}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  bookingType: event.target.value as BookingType,
                  medicalSpecialty:
                    event.target.value === "appointment" ? current.medicalSpecialty : "",
                }))
              }
              className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
            >
              <option value="appointment">Appointment</option>
              <option value="full-day">Full Day</option>
            </select>
          </label>
          ) : null}
          {isEventsSingle ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                {copy.phrases.eventDateLabel}
                <input
                  disabled={disabled}
                  value={serviceDraft.occurrenceDate}
                  onChange={(event) =>
                    onDraftChange((current) => ({
                      ...current,
                      occurrenceDate: event.target.value,
                    }))
                  }
                  type="date"
                  className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                Start
                <input
                  disabled={disabled}
                  value={serviceDraft.startTime}
                  onChange={(event) =>
                    onDraftChange((current) => ({ ...current, startTime: event.target.value }))
                  }
                  type="time"
                  className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                End
                <input
                  disabled={disabled}
                  value={serviceDraft.endTime}
                  onChange={(event) =>
                    onDraftChange((current) => ({ ...current, endTime: event.target.value }))
                  }
                  type="time"
                  className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
                />
              </label>
            </div>
          ) : null}
          {!isEventsSingle && serviceDraft.bookingType === "appointment" ? (
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
          {showMedicalSpecialty ? (
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Medical specialty
              <input
                disabled={disabled}
                value={serviceDraft.medicalSpecialty ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    medicalSpecialty: event.target.value,
                  }))
                }
                placeholder={hints?.medicalSpecialty ?? "Family medicine"}
                className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
              />
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
          {isEvents ? (
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Maximum spots
              <input
                disabled={disabled}
                value={serviceDraft.maxSpots}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    maxSpots: event.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
                inputMode="numeric"
                placeholder="50"
                className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
              />
            </label>
          ) : null}
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
          <section className="grid gap-3">
            <header className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    d="M12 22s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="text-sm font-semibold text-[var(--ink)]">Location</span>
            </header>
            {hasAddress1 || hasAddress2 ? (
              <div className="grid gap-2">
                {hasAddress1 ? (
                  <LinkToggleCard
                    eyebrow="Address 1"
                    value={provider.address1}
                    checked={serviceDraft.linkedAddress1}
                    disabled={disabled}
                    onToggle={(next) =>
                      onDraftChange((current) => ({ ...current, linkedAddress1: next }))
                    }
                  />
                ) : null}
                {hasAddress2 ? (
                  <LinkToggleCard
                    eyebrow="Address 2"
                    value={provider.address2}
                    checked={serviceDraft.linkedAddress2}
                    disabled={disabled}
                    onToggle={(next) =>
                      onDraftChange((current) => ({ ...current, linkedAddress2: next }))
                    }
                  />
                ) : null}
              </div>
            ) : null}
            <div className="rounded-2xl border border-dashed border-[rgba(193,198,214,0.55)] bg-[rgba(248,249,250,0.5)] p-4">
              <label className="grid gap-2">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  {hasAddress1 || hasAddress2 ? "Add another address" : "Add an address"}
                </span>
                <input
                  disabled={disabled}
                  value={serviceDraft.customAddress}
                  onChange={(event) =>
                    onDraftChange((current) => ({ ...current, customAddress: event.target.value }))
                  }
                  placeholder="123 Main St, Suite 4, Springfield"
                  autoComplete="street-address"
                  className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
                />
              </label>
              {serviceDraft.customAddress.trim() ? (
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{addressHint}</p>
              ) : null}
            </div>
          </section>
          <section className="grid gap-3">
            <header className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.5 11.5 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A18 18 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.5 11.5 0 0 0 .57 3.6 1 1 0 0 1-.25 1z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="text-sm font-semibold text-[var(--ink)]">Phone</span>
            </header>
            {hasPhone1 || hasPhone2 ? (
              <div className="grid gap-2">
                {hasPhone1 ? (
                  <LinkToggleCard
                    eyebrow="Phone 1"
                    value={provider.phoneNumber1}
                    checked={serviceDraft.linkedPhone1}
                    disabled={disabled}
                    onToggle={(next) =>
                      onDraftChange((current) => ({ ...current, linkedPhone1: next }))
                    }
                  />
                ) : null}
                {hasPhone2 ? (
                  <LinkToggleCard
                    eyebrow="Phone 2"
                    value={provider.phoneNumber2}
                    checked={serviceDraft.linkedPhone2}
                    disabled={disabled}
                    onToggle={(next) =>
                      onDraftChange((current) => ({ ...current, linkedPhone2: next }))
                    }
                  />
                ) : null}
              </div>
            ) : null}
            <div className="rounded-2xl border border-dashed border-[rgba(193,198,214,0.55)] bg-[rgba(248,249,250,0.5)] p-4">
              <label className="grid gap-2">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  {hasPhone1 || hasPhone2 ? "Add another phone" : "Add a phone"}
                </span>
                <input
                  disabled={disabled}
                  value={serviceDraft.customPhone}
                  onChange={(event) =>
                    onDraftChange((current) => ({ ...current, customPhone: event.target.value }))
                  }
                  placeholder="+1 (555) 123-4567"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
                />
              </label>
              {serviceDraft.customPhone.trim() ? (
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{phoneHint}</p>
              ) : null}
            </div>
          </section>
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

function LinkToggleCard({
  eyebrow,
  value,
  checked,
  disabled,
  onToggle,
}: {
  eyebrow: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onToggle(!checked)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(248,249,250,0.94)] disabled:cursor-not-allowed disabled:opacity-60",
        checked
          ? "bg-[var(--accent-soft)] ring-2 ring-[var(--accent)] shadow-[0_10px_28px_rgba(26,115,232,0.14)]"
          : "bg-white ring-1 ring-[rgba(193,198,214,0.45)] hover:ring-[rgba(26,115,232,0.45)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
          checked
            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
            : "border-[var(--line)] bg-white text-transparent group-hover:border-[var(--accent)]/60",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
          <path
            d="M5 12l4 4L19 6"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          {eyebrow}
        </span>
        <span className="mt-0.5 block truncate text-sm font-medium text-[var(--ink)]">
          {value}
        </span>
      </span>
    </button>
  );
}
