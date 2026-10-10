"use client";

import { Check, MapPin, Phone } from "@phosphor-icons/react";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { BookingType, Lang, ProviderInfo, Service, ServiceDraft, VerticalId } from "@/lib/types";
import { DURATION_OPTIONS, WEEKDAY_KEYS, getWeekdayShortFormatter } from "@/lib/constants";
import { cn, pad } from "@/lib/utils";
import {
  formatCapacityLabel,
  formatDuration,
  getBookingTypeLabel,
  getOccurrenceModeLabel,
  bookingTypeBadgeTone,
} from "@/lib/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardFooter,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Select,
  StackedList,
  StackedListItem,
  Textarea,
  buttonStyles,
  focusRing,
} from "@/components/app-ui";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { VerticalHints } from "@/config/verticals";
import { defaultCopy, type VerticalCopy } from "@/lib/vertical-copy";
import {
  bookingTranslations,
  fillTemplate,
} from "@/components/booking/i18n/translations";
import { parseDateKey } from "@/lib/date";

function formatDurationOption(minutes: number, lang: Lang = "en") {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    if (lang === "es") return `${hours} h`;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return lang === "es" ? `${minutes} min` : `${minutes} minutes`;
}

/** A pressed/unpressed choice chip (occurrence mode, weekdays). */
function toggleChipClass(active: boolean, size: string) {
  return cn(
    "rounded-lg px-3 text-sm font-semibold ring-1 ring-inset transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    focusRing,
    size,
    active
      ? "bg-app-accent-soft text-app-accent-on-soft ring-2 ring-app-accent"
      : "bg-app-surface text-app-fg ring-app-border-strong hover:bg-app-subtle",
  );
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
  error,
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
  /** Why the last save or delete was refused, for hosts that show no other error. */
  error?: string | null;
}) {
  const t = bookingTranslations[lang];
  const shell = dashboardCopy[lang];
  const [pendingDelete, setPendingDelete] = useState<Service | null>(null);
  const showMedicalSpecialty =
    vertical === "healthcare" && serviceDraft.bookingType === "appointment";
  const isEvents = vertical === "events";
  // A restaurant sells its capacity at every seating, so it shows the same
  // numeric field events use — relabelled — plus the cap on one table's party.
  const isRestaurant = vertical === "restaurant";
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
    <Field label={t.admin.priceAtLocation}>
      <Input
        disabled={disabled}
        value={serviceDraft.locationPrices?.[key] ?? ""}
        onChange={(event) => setLocationPrice(key, event.target.value)}
        placeholder={
          serviceDraft.cost ? `${serviceDraft.cost} (base)` : t.admin.sameAsBasePrice
        }
      />
    </Field>
  );
  const hasAddress1 = provider.address1.trim().length > 0;
  const hasAddress2 = provider.address2.trim().length > 0;
  const hasPhone1 = provider.phoneNumber1.trim().length > 0;
  const hasPhone2 = provider.phoneNumber2.trim().length > 0;
  const nextAddressSlot = !hasAddress1 ? "1" : !hasAddress2 ? "2" : null;
  const nextPhoneSlot = !hasPhone1 ? "1" : !hasPhone2 ? "2" : null;
  const profileHints =
    vertical === "healthcare"
      ? t.healthcareRole
      : vertical === "events"
        ? t.eventOrganizerRole
        : t.admin;
  const addressHint = nextAddressSlot === "1"
    ? profileHints.addressHintSlot1
    : nextAddressSlot === "2"
      ? profileHints.addressHintSlot2
      : profileHints.addressHintFull;
  const phoneHint = nextPhoneSlot === "1"
    ? profileHints.phoneHintSlot1
    : nextPhoneSlot === "2"
      ? profileHints.phoneHintSlot2
      : profileHints.phoneHintFull;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      {error ? (
        <Alert tone="danger" role="alert" className="lg:col-span-2">
          {error}
        </Alert>
      ) : null}
      <Card as="section">
        <CardHeader
          title={copy.Services}
          description={copy.phrases.serviceEditorBody}
          actions={
            services.length > 0 ? (
              // On one column the editor sits below the whole list; this jumps
              // there with a fresh draft, the way the wide layout shows it.
              <a
                href="#service-editor"
                className={buttonStyles({ variant: "secondary", size: "sm", className: "lg:hidden" })}
                onClick={(event) => {
                  event.preventDefault();
                  onReset();
                  document
                    .getElementById("service-editor")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.setTimeout(
                    () => document.getElementById("service-editor-name")?.focus({ preventScroll: true }),
                    0,
                  );
                }}
              >
                {copy.phrases.newServiceTitle}
              </a>
            ) : undefined
          }
        />

        {disabled ? (
          <div className="px-4 pt-4 sm:px-6">
            <Alert tone="neutral">{t.admin.serviceReadOnly}</Alert>
          </div>
        ) : null}

        {services.length === 0 ? (
          <EmptyState
            variant="dashed"
            className="m-4 sm:m-6"
            title={copy.phrases.noServicesTitle}
            body={copy.phrases.noServicesBody}
          />
        ) : (
          <StackedList>
            {services.map((service) => (
              <StackedListItem
                key={service.id}
                className={cn(editingServiceId === service.id && "bg-app-accent-soft/40 ring-2 ring-inset ring-app-accent")}
                trailing={
                  <>
                    <Button variant="secondary" size="sm" disabled={disabled} onClick={() => onEdit(service)}>
                      {t.admin.editButton}
                    </Button>
                    <Button
                      variant="danger-plain"
                      size="sm"
                      disabled={disabled || services.length <= 1}
                      onClick={() => setPendingDelete(service)}
                    >
                      {t.admin.deleteButton}
                    </Button>
                  </>
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-app-fg">{service.name}</h3>
                  <Badge tone={isEvents ? "neutral" : bookingTypeBadgeTone(service.bookingType)}>
                    {isEvents
                      ? getOccurrenceModeLabel(service.occurrenceMode, lang)
                      : getBookingTypeLabel(service.bookingType, lang)}
                  </Badge>
                  <Badge tone="info">{formatDuration(service, lang)}</Badge>
                </div>
                {service.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-app-fg-muted">{service.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-app-fg-muted">
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
              </StackedListItem>
            ))}
          </StackedList>
        )}
        {!disabled && services.length === 1 ? (
          <p className="border-t border-app-border px-4 py-3 text-sm text-app-fg-muted sm:px-6">
            {fillTemplate(t.admin.keepOneService, { service: copy.service })}
          </p>
        ) : null}
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={fillTemplate(shell.deleteServiceTitle, { name: pendingDelete?.name ?? "" })}
        body={shell.deleteServiceBody}
        confirmLabel={t.admin.deleteButton}
        cancelLabel={shell.keep}
        closeLabel={shell.closeDialog}
        tone="danger"
        onConfirm={() => {
          if (pendingDelete) onRemove(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      {/* Stays beside a long list on wide screens; scrolls inside itself when
          the form is taller than the window. */}
      <Card
        as="section"
        aria-labelledby="service-editor-title"
        id="service-editor"
        className="scroll-mt-24 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto"
      >
        <CardHeader
          titleId="service-editor-title"
          title={editingServiceId ? copy.phrases.editServiceTitle : copy.phrases.newServiceTitle}
          description={editingServiceId ? copy.phrases.editServiceEyebrow : copy.phrases.newServiceEyebrow}
        />
        <div className="grid gap-5 px-4 py-5 sm:px-6">
          <Field
            label={fillTemplate(t.admin.serviceNameLabel, {
              service: copy.service,
              Service: copy.Service,
            })}
          >
            <Input
              id="service-editor-name"
              disabled={disabled}
              value={serviceDraft.name}
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={hints?.serviceName ?? t.admin.serviceNamePlaceholder}
            />
          </Field>
          {isEvents ? (
            <div className="grid gap-2 text-sm font-medium text-app-fg">
              {t.admin.occurrenceLabel}
              <div className="grid grid-cols-2 gap-2">
                {(["single", "weekly"] as const).map((mode) => {
                  const active = serviceDraft.occurrenceMode === mode;
                  const label =
                    mode === "single" ? t.admin.occurrenceSingle : t.admin.occurrenceWeekly;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={disabled}
                      aria-pressed={active}
                      onClick={() =>
                        onDraftChange((current) => ({ ...current, occurrenceMode: mode }))
                      }
                      className={toggleChipClass(active, "h-11")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm font-normal text-app-fg-muted">
                {isSingleOccurrence
                  ? t.admin.singleOccurrenceHint
                  : isWeeklyOccurrence
                    ? t.admin.weeklyOccurrenceHint
                    : t.admin.legacyPeriodicEventHint}
              </p>
            </div>
          ) : null}
          {!isEventsFixedWindow ? (
          <Field label={t.admin.bookingTypeLabel}>
            <Select
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
            >
              <option value="appointment">{getBookingTypeLabel("appointment", lang)}</option>
              <option value="full-day">{getBookingTypeLabel("full-day", lang)}</option>
            </Select>
          </Field>
          ) : null}
          {isEventsSingle ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={copy.phrases.eventDateLabel}>
                <Input
                  disabled={disabled}
                  value={serviceDraft.occurrenceDate}
                  onChange={(event) =>
                    onDraftChange((current) => ({
                      ...current,
                      occurrenceDate: event.target.value,
                    }))
                  }
                  type="date"
                  /* Native date inputs follow the OS/browser locale, not the
                     page. Chromium honours `lang`; Firefox and Safari ignore
                     it, so a Spanish page on a US-configured machine still
                     shows mm/dd/yyyy. Fixing that needs a custom picker. */
                  lang={lang}
                />
              </Field>
              <Field label={t.admin.startLabel}>
                <Input
                  disabled={disabled}
                  value={serviceDraft.startTime}
                  onChange={(event) =>
                    onDraftChange((current) => ({ ...current, startTime: event.target.value }))
                  }
                  type="time"
                />
              </Field>
              <Field label={t.admin.endLabel}>
                <Input
                  disabled={disabled}
                  value={serviceDraft.endTime}
                  onChange={(event) =>
                    onDraftChange((current) => ({ ...current, endTime: event.target.value }))
                  }
                  type="time"
                />
              </Field>
            </div>
          ) : null}
          {isEventsWeekly ? (
            <div className="grid gap-3">
              <div className="grid gap-2 text-sm font-medium text-app-fg">
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
                        className={toggleChipClass(active, "h-11 sm:h-9")}
                      >
                        {dayLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.admin.startLabel}>
                  <Input
                    disabled={disabled}
                    value={serviceDraft.startTime}
                    onChange={(event) =>
                      onDraftChange((current) => ({ ...current, startTime: event.target.value }))
                    }
                    type="time"
                  />
                </Field>
                <Field label={t.admin.endLabel}>
                  <Input
                    disabled={disabled}
                    value={serviceDraft.endTime}
                    onChange={(event) =>
                      onDraftChange((current) => ({ ...current, endTime: event.target.value }))
                    }
                    type="time"
                  />
                </Field>
              </div>
            </div>
          ) : null}
          {!isEventsFixedWindow && serviceDraft.bookingType === "appointment" ? (
            <Field label={t.admin.durationLabel}>
              <Select
                disabled={disabled}
                value={serviceDraft.durationMinutes}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    durationMinutes: Number(event.target.value),
                  }))
                }
              >
                {DURATION_OPTIONS.map((duration) => (
                  <option key={duration} value={duration}>
                    {formatDurationOption(duration, lang)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {showMedicalSpecialty ? (
            <Field label={t.admin.medicalSpecialtyLabel}>
              <Input
                disabled={disabled}
                value={serviceDraft.medicalSpecialty ?? ""}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    medicalSpecialty: event.target.value,
                  }))
                }
                placeholder={hints?.medicalSpecialty ?? t.admin.medicalSpecialtyPlaceholder}
              />
            </Field>
          ) : null}
          <Field label={t.admin.descriptionLabel}>
            <Textarea
              disabled={disabled}
              value={serviceDraft.description}
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, description: event.target.value }))
              }
              placeholder={hints?.description ?? copy.phrases.serviceDescPlaceholder}
              rows={4}
            />
          </Field>
          {!isEvents && !isRestaurant ? (
            <Field label={t.admin.capacityLabel}>
              <Input
                disabled={disabled}
                value={serviceDraft.capacity}
                onChange={(event) =>
                  onDraftChange((current) => ({ ...current, capacity: event.target.value }))
                }
                placeholder={hints?.capacity ?? t.admin.capacityPlaceholder}
              />
            </Field>
          ) : null}
          {isEvents || isRestaurant ? (
            <Field label={isRestaurant ? t.admin.tablesPerSeatingLabel : t.admin.maxSpotsLabel}>
              <Input
                disabled={disabled}
                value={serviceDraft.maxSpots}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    maxSpots: event.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
                inputMode="numeric"
                placeholder={isRestaurant ? "12" : "50"}
              />
            </Field>
          ) : null}
          {isRestaurant ? (
            <Field label={t.admin.maxPartySizeLabel}>
              <Input
                disabled={disabled}
                value={serviceDraft.maxPartySize}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    maxPartySize: event.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
                inputMode="numeric"
                placeholder="8"
              />
            </Field>
          ) : null}
          <Field label={t.admin.totalLabel}>
            <Input
              disabled={disabled}
              value={serviceDraft.cost}
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, cost: event.target.value }))
              }
              placeholder={hints?.cost ?? "$80 / session"}
            />
          </Field>
          <Field label={t.admin.notesLabel}>
            <Input
              disabled={disabled}
              value={serviceDraft.notes}
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder={t.admin.notesPlaceholder}
            />
          </Field>
          <section className="grid gap-3 border-t border-app-border pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-app-fg">
              <MapPin aria-hidden="true" size={18} className="text-app-accent" />
              {t.admin.locationSection}
            </h3>
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
            <div className="grid gap-3 rounded-lg border-2 border-dashed border-app-border-strong p-4">
              <Field
                label={hasAddress1 || hasAddress2 ? t.admin.addAnotherAddress : t.admin.addAnAddress}
                description={serviceDraft.customAddress.trim() ? addressHint : undefined}
              >
                <Input
                  disabled={disabled}
                  value={serviceDraft.customAddress}
                  onChange={(event) =>
                    onDraftChange((current) => ({ ...current, customAddress: event.target.value }))
                  }
                  placeholder={t.providerForm.address1Placeholder}
                  autoComplete="street-address"
                />
              </Field>
              {serviceDraft.customAddress.trim() ? locationPriceField("custom") : null}
            </div>
          </section>
          <section className="grid gap-3 border-t border-app-border pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-app-fg">
              <Phone aria-hidden="true" size={18} className="text-app-accent" />
              {t.admin.phoneSection}
            </h3>
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
            <div className="rounded-lg border-2 border-dashed border-app-border-strong p-4">
              <Field
                label={hasPhone1 || hasPhone2 ? t.admin.addAnotherPhone : t.admin.addAPhone}
                description={serviceDraft.customPhone.trim() ? phoneHint : undefined}
              >
                <Input
                  disabled={disabled}
                  value={serviceDraft.customPhone}
                  onChange={(event) =>
                    onDraftChange((current) => ({ ...current, customPhone: event.target.value }))
                  }
                  placeholder={t.providerForm.phone1Placeholder}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>
            </div>
          </section>
        </div>
        <CardFooter>
          <Button variant="secondary" onClick={onReset}>
            {t.admin.clearButton}
          </Button>
          <Button disabled={disabled} onClick={onUpsert}>
            {editingServiceId ? copy.phrases.saveServiceButton : copy.phrases.addServiceButton}
          </Button>
        </CardFooter>
      </Card>
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
        "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left ring-1 ring-inset transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        checked
          ? "bg-app-accent-soft ring-2 ring-app-accent"
          : "bg-app-surface ring-app-border-strong hover:bg-app-subtle",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md ring-1 ring-inset",
          checked ? "bg-app-accent text-app-on-accent ring-app-accent" : "bg-app-surface ring-app-border-strong",
        )}
      >
        {checked ? <Check size={14} weight="bold" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-app-fg-muted">{eyebrow}</span>
        <span className="mt-0.5 block truncate text-sm font-medium text-app-fg">{value}</span>
      </span>
    </button>
  );
}
