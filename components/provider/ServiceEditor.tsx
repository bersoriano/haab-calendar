"use client";

import type { Dispatch, SetStateAction } from "react";
import type { BookingType, Lang, ProviderInfo, Service, ServiceDraft, VerticalId } from "@/lib/types";
import { DURATION_OPTIONS, WEEKDAY_KEYS, getWeekdayShortFormatter } from "@/lib/constants";
import { cn, pad } from "@/lib/utils";
import { formatCapacityLabel, formatDuration, getBookingTypeLabel, bookingTypeTone } from "@/lib/format";
import { ActionButton, EmptyState, SectionTitle, ToneBadge } from "@/components/ui";
import { adminFieldClass, adminInsetClass, adminPanelClass } from "@/components/provider/adminGlass";
import type { VerticalHints } from "@/config/verticals";
import { defaultCopy, type VerticalCopy } from "@/lib/vertical-copy";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { parseDateKey } from "@/lib/date";

function formatDurationOption(minutes: number, lang: Lang = "en") {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    if (lang === "es") return `${hours} h`;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return lang === "es" ? `${minutes} min` : `${minutes} minutes`;
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
  lang = "en",
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
  lang?: Lang;
}) {
  const t = bookingTranslations[lang];
  const showMedicalSpecialty =
    vertical === "healthcare" && serviceDraft.bookingType === "appointment";
  const isEvents = vertical === "events";
  const isSingleOccurrence = serviceDraft.occurrenceMode === "single";
  const isWeeklyOccurrence = serviceDraft.occurrenceMode === "weekly";
  const isEventsSingle = isEvents && isSingleOccurrence;
  const isEventsWeekly = isEvents && isWeeklyOccurrence;
  // Single + weekly events pin their own fixed time window, so the generic
  // appointment/full-day + duration controls don't apply.
  const isEventsFixedWindow = isEventsSingle || isEventsWeekly;
  const setLocationPrice = (key: "address1" | "address2" | "custom", value: string) =>
    onDraftChange((current) => ({
      ...current,
      locationPrices: {
        address1: current.locationPrices?.address1 ?? "",
        address2: current.locationPrices?.address2 ?? "",
        custom: current.locationPrices?.custom ?? "",
        [key]: value,
      },
    }));
  const locationPriceField = (key: "address1" | "address2" | "custom") => (
    <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">
      {t.admin.priceAtLocation}
      <input
        disabled={disabled}
        value={serviceDraft.locationPrices?.[key] ?? ""}
        onChange={(event) => setLocationPrice(key, event.target.value)}
        placeholder={serviceDraft.cost ? `${serviceDraft.cost} (base)` : "Same as base price"}
        className={cn("min-h-10", adminFieldClass, "disabled:opacity-45")}
      />
    </label>
  );
  const hasAddress1 = provider.address1.trim().length > 0;
  const hasAddress2 = provider.address2.trim().length > 0;
  const hasPhone1 = provider.phoneNumber1.trim().length > 0;
  const hasPhone2 = provider.phoneNumber2.trim().length > 0;
  const nextAddressSlot = !hasAddress1 ? "1" : !hasAddress2 ? "2" : null;
  const nextPhoneSlot = !hasPhone1 ? "1" : !hasPhone2 ? "2" : null;
  const addressHint = nextAddressSlot === "1"
    ? t.admin.addressHintSlot1
    : nextAddressSlot === "2"
      ? t.admin.addressHintSlot2
      : t.admin.addressHintFull;
  const phoneHint = nextPhoneSlot === "1"
    ? t.admin.phoneHintSlot1
    : nextPhoneSlot === "2"
      ? t.admin.phoneHintSlot2
      : t.admin.phoneHintFull;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className={cn(adminPanelClass, "p-6")}>
        <SectionTitle
          title={copy.Services}
          body={copy.phrases.serviceEditorBody}
        />

        {disabled ? (
          <div className={cn("mt-4", adminInsetClass, "px-4 py-3 text-sm font-medium text-[var(--muted)]")}>
            {t.admin.serviceReadOnly}
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
                        {getBookingTypeLabel(service.bookingType, lang)}
                      </ToneBadge>
                      <ToneBadge tone="neutral">{formatDuration(service, lang)}</ToneBadge>
                    </div>
                    {service.description ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {service.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                      {isEvents ? (
                        <span>{t.admin.capacityLabel}: {formatCapacityLabel(service, lang)}</span>
                      ) : service.capacity ? (
                        <span>{t.admin.capacityLabel}: {service.capacity}</span>
                      ) : null}
                      {service.medicalSpecialty ? (
                        <span>{t.admin.medicalSpecialtyLabel}: {service.medicalSpecialty}</span>
                      ) : null}
                      {service.cost ? <span>{t.admin.totalLabel}: {service.cost}</span> : null}
                      {service.notes ? <span>{t.admin.notesLabel}: {service.notes}</span> : null}
                      {service.linkedAddress1 && hasAddress1 ? (
                        <span>{t.admin.address1Label}: {provider.address1}</span>
                      ) : null}
                      {service.linkedAddress2 && hasAddress2 ? (
                        <span>{t.admin.address2Label}: {provider.address2}</span>
                      ) : null}
                      {service.linkedPhone1 && hasPhone1 ? (
                        <span>{t.admin.phone1Label}: {provider.phoneNumber1}</span>
                      ) : null}
                      {service.linkedPhone2 && hasPhone2 ? (
                        <span>{t.admin.phone2Label}: {provider.phoneNumber2}</span>
                      ) : null}
                      {service.customAddress ? (
                        <span>{t.admin.locationSection}: {service.customAddress}</span>
                      ) : null}
                      {service.customPhone ? (
                        <span>{t.admin.phoneSection}: {service.customPhone}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton tone="ghost" disabled={disabled} onClick={() => onEdit(service)}>
                      {t.admin.editButton}
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      disabled={disabled || services.length <= 1}
                      onClick={() => onRemove(service.id)}
                    >
                      {t.admin.deleteButton}
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
              {t.admin.occurrenceLabel}
              <div className="grid grid-cols-3 gap-2">
                {(["single", "weekly", "periodic"] as const).map((mode) => {
                  const active = serviceDraft.occurrenceMode === mode;
                  const label =
                    mode === "single" ? t.admin.occurrenceSingle : mode === "weekly" ? t.admin.occurrenceWeekly : t.admin.occurrencePeriodic;
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
                        "min-h-12 rounded-2xl px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
                        active
                          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)] ring-2 ring-[var(--accent)]"
                          : "bg-white text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.45)] hover:ring-[var(--accent)]/40",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs leading-5 text-[var(--muted)]">
                {isSingleOccurrence
                  ? t.admin.singleOccurrenceHint
                  : isWeeklyOccurrence
                    ? t.admin.weeklyOccurrenceHint
                    : t.admin.periodicOccurrenceHint}
              </p>
            </div>
          ) : null}
          {!isEventsFixedWindow ? (
          <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
            {t.admin.bookingTypeLabel}
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
              <option value="appointment">{getBookingTypeLabel("appointment", lang)}</option>
              <option value="full-day">{getBookingTypeLabel("full-day", lang)}</option>
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
                {t.admin.startLabel}
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
                {t.admin.endLabel}
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
          {isEventsWeekly ? (
            <div className="grid gap-3">
              <div className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                {t.admin.repeatsOn}
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_KEYS.map((day) => {
                    const active = serviceDraft.weekdays.includes(day);
                    const dayLabel = getWeekdayShortFormatter(lang).format(
                      parseDateKey(`2024-03-${pad(WEEKDAY_KEYS.indexOf(day) + 3)}`)
                    );
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={disabled}
                        aria-pressed={active}
                        onClick={() =>
                          onDraftChange((current) => ({
                            ...current,
                            weekdays: current.weekdays.includes(day)
                              ? current.weekdays.filter((d) => d !== day)
                              : [...current.weekdays, day],
                          }))
                        }
                        className={cn(
                          "min-h-10 rounded-xl px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
                          active
                            ? "bg-[var(--accent-soft)] text-[var(--accent-strong)] ring-2 ring-[var(--accent)]"
                            : "bg-white text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.45)] hover:ring-[var(--accent)]/40",
                        )}
                      >
                        {dayLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  {t.admin.startLabel}
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
                  {t.admin.endLabel}
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
            </div>
          ) : null}
          {!isEventsFixedWindow && serviceDraft.bookingType === "appointment" ? (
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              {t.admin.durationLabel}
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
                    {formatDurationOption(duration, lang)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {showMedicalSpecialty ? (
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              {t.admin.medicalSpecialtyLabel}
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
            {t.admin.descriptionLabel}
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
          {!isEvents ? (
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              {t.admin.capacityLabel}
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
          ) : null}
          {isEvents ? (
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              {t.admin.maxSpotsLabel}
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
            {t.admin.totalLabel}
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
            {t.admin.notesLabel}
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
              <span className="text-sm font-semibold text-[var(--ink)]">{t.admin.locationSection}</span>
            </header>
            {hasAddress1 || hasAddress2 ? (
              <div className="grid gap-2">
                {hasAddress1 ? (
                  <div className="grid gap-2">
                    <LinkToggleCard
                      eyebrow={t.admin.address1Label}
                      value={provider.address1}
                      checked={serviceDraft.linkedAddress1}
                      disabled={disabled}
                      onToggle={(next) =>
                        onDraftChange((current) => ({ ...current, linkedAddress1: next }))
                      }
                    />
                    {serviceDraft.linkedAddress1 ? locationPriceField("address1") : null}
                  </div>
                ) : null}
                {hasAddress2 ? (
                  <div className="grid gap-2">
                    <LinkToggleCard
                      eyebrow={t.admin.address2Label}
                      value={provider.address2}
                      checked={serviceDraft.linkedAddress2}
                      disabled={disabled}
                      onToggle={(next) =>
                        onDraftChange((current) => ({ ...current, linkedAddress2: next }))
                      }
                    />
                    {serviceDraft.linkedAddress2 ? locationPriceField("address2") : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="rounded-2xl border border-dashed border-[rgba(193,198,214,0.55)] bg-[rgba(248,249,250,0.5)] p-4">
              <label className="grid gap-2">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  {hasAddress1 || hasAddress2 ? t.admin.addAnotherAddress : t.admin.addAnAddress}
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
                <>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{addressHint}</p>
                  <div className="mt-2">{locationPriceField("custom")}</div>
                </>
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
              <span className="text-sm font-semibold text-[var(--ink)]">{t.admin.phoneSection}</span>
            </header>
            {hasPhone1 || hasPhone2 ? (
              <div className="grid gap-2">
                {hasPhone1 ? (
                  <LinkToggleCard
                    eyebrow={t.admin.phone1Label}
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
                    eyebrow={t.admin.phone2Label}
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
                  {hasPhone1 || hasPhone2 ? t.admin.addAnotherPhone : t.admin.addAPhone}
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
            {t.admin.clearButton}
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
