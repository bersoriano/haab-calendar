"use client";

import { ArrowsClockwise, Trash } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";

import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  Field,
  IconButton,
  Input,
  Switch,
  Textarea,
} from "@/components/app-ui";
import { fillCopy } from "@/components/invitations/invitation-copy";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { guestsCopy } from "@/components/provider/guests/guests-copy";
import { guestLabel, type Invitation } from "@/lib/invitations";
import { clampInvitationSeats, INVITATION_SEAT_LIMIT_MAX } from "@/lib/rsvp-mode";
import type { Lang, Service } from "@/lib/types";

type DraftGuest = { id?: string; name: string };

export type InvitationEditorSave = {
  displayName: string;
  contactPhone: string;
  contactEmail: string;
  seatLimit: number;
  eventIds: string[];
  notes: string;
  guests: DraftGuest[];
  attendance: Record<string, boolean[]>;
  markAnswered: boolean;
};

/**
 * Adds or edits one household: its name, contact, seats, events, guests, and
 * (for an answer given by phone) who is coming. Saving is the caller's job;
 * this only collects a consistent draft.
 */
export function InvitationEditor({
  open,
  lang,
  services,
  invitation,
  defaultSeats,
  invitationUrl,
  pending,
  error,
  onSave,
  onRegenerate,
  onClose,
}: {
  open: boolean;
  lang: Lang;
  services: Service[];
  /** Absent for a new invitation. */
  invitation?: Invitation;
  defaultSeats: number;
  invitationUrl?: string;
  pending: boolean;
  error?: string | null;
  onSave: (draft: InvitationEditorSave) => void;
  onRegenerate?: () => void;
  onClose: () => void;
}) {
  const t = guestsCopy[lang].editor;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={invitation ? t.editTitle : t.newTitle}
      size="lg"
      closeLabel={dashboardCopy[lang].closeDialog}
    >
      {open ? (
        // Keyed so reopening for another household starts from its own values.
        <EditorForm
          key={invitation?.id ?? "new"}
          lang={lang}
          services={services}
          invitation={invitation}
          defaultSeats={defaultSeats}
          invitationUrl={invitationUrl}
          pending={pending}
          error={error}
          onSave={onSave}
          onRegenerate={onRegenerate}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function EditorForm({
  lang,
  services,
  invitation,
  defaultSeats,
  invitationUrl,
  pending,
  error,
  onSave,
  onRegenerate,
  onClose,
}: Omit<Parameters<typeof InvitationEditor>[0], "open">) {
  const t = guestsCopy[lang].editor;
  const [displayName, setDisplayName] = useState(invitation?.displayName ?? "");
  const [contactPhone, setContactPhone] = useState(invitation?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(invitation?.contactEmail ?? "");
  const [seats, setSeats] = useState(String(invitation?.seatLimit ?? defaultSeats));
  const [eventIds, setEventIds] = useState<string[]>(
    invitation?.eventIds ?? services.map((service) => service.id),
  );
  const [notes, setNotes] = useState(invitation?.notes ?? "");
  const [guests, setGuests] = useState<DraftGuest[]>(
    invitation?.guests.map((guest) => ({ id: guest.id, name: guest.name })) ?? [],
  );
  const [attendance, setAttendance] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(
      services.map((service) => [
        service.id,
        (invitation?.guests ?? []).map((guest) => guest.attending[service.id] === true),
      ]),
    ),
  );
  const [answered, setAnswered] = useState(Boolean(invitation?.submittedAt));
  const [nameError, setNameError] = useState<string | null>(null);

  const seatLimit = clampInvitationSeats(seats, invitation?.seatLimit ?? defaultSeats);
  const atLimit = guests.length >= seatLimit;
  const invitedServices = services.filter((service) => eventIds.includes(service.id));

  function addGuest() {
    if (atLimit) return;
    setGuests((current) => [...current, { name: "" }]);
    setAttendance((current) =>
      Object.fromEntries(Object.entries(current).map(([id, answers]) => [id, [...answers, false]])),
    );
  }

  function removeGuest(index: number) {
    setGuests((current) => current.filter((_, position) => position !== index));
    setAttendance((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, answers]) => [id, answers.filter((_, position) => position !== index)]),
      ),
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!displayName.trim()) {
      setNameError(t.nameRequired);
      return;
    }
    onSave({
      displayName: displayName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      seatLimit,
      eventIds,
      notes: notes.trim(),
      guests: guests.map((guest) => ({ ...guest, name: guest.name.trim() })),
      attendance: Object.fromEntries(
        eventIds.map((id) => [id, guests.map((_, index) => attendance[id]?.[index] === true)]),
      ),
      markAnswered: answered,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      {error ? <Alert tone="danger" role="alert" title={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.nameLabel} error={nameError ?? undefined} className="sm:col-span-2">
          <Input
            value={displayName}
            maxLength={120}
            placeholder={t.namePlaceholder}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setNameError(null);
            }}
          />
        </Field>
        <Field label={t.phoneLabel}>
          <Input type="tel" value={contactPhone} maxLength={40} onChange={(event) => setContactPhone(event.target.value)} />
        </Field>
        <Field label={t.emailLabel}>
          <Input type="email" value={contactEmail} maxLength={254} onChange={(event) => setContactEmail(event.target.value)} />
        </Field>
        <Field label={t.seatsLabel} description={t.seatsHint}>
          <Input
            type="number"
            inputMode="numeric"
            min={Math.max(1, guests.length)}
            max={INVITATION_SEAT_LIMIT_MAX}
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
          />
        </Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-app-fg">{t.eventsLabel}</legend>
        {services.map((service) => (
          <Field key={service.id} label={service.name} inline>
            <Checkbox
              checked={eventIds.includes(service.id)}
              onChange={(event) =>
                setEventIds((current) =>
                  event.target.checked
                    ? services.map((entry) => entry.id).filter((id) => id === service.id || current.includes(id))
                    : current.filter((id) => id !== service.id),
                )
              }
            />
          </Field>
        ))}
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium text-app-fg">{t.guestsLabel}</legend>
        <p className="-mt-1 text-sm text-app-fg-muted">{t.guestsHint}</p>
        {guests.map((guest, index) => (
          <div key={guest.id ?? `new-${index}`} className="flex items-center gap-2">
            <Input
              aria-label={fillCopy(t.guestNumber, { n: index + 1 })}
              value={guest.name}
              maxLength={120}
              placeholder={t.guestPlaceholder}
              onChange={(event) =>
                setGuests((current) =>
                  current.map((entry, position) => (position === index ? { ...entry, name: event.target.value } : entry)),
                )
              }
            />
            <IconButton
              label={fillCopy(t.removeGuest, { name: guestLabel(guest, index, guests, lang) })}
              icon={<Trash aria-hidden="true" size={16} />}
              onClick={() => removeGuest(index)}
            />
          </div>
        ))}
        <div>
          <Button variant="secondary" size="sm" disabled={atLimit} onClick={addGuest}>
            {t.addGuest}
          </Button>
        </div>
      </fieldset>

      {guests.length > 0 && invitedServices.length > 0 ? (
        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-app-fg">{t.answersLabel}</legend>
          <p className="-mt-1 text-sm text-app-fg-muted">{t.answersHint}</p>
          {invitedServices.map((service) => (
            <div key={service.id} className="grid gap-1 rounded-lg bg-app-subtle px-3 py-2">
              <p className="text-sm font-medium text-app-fg">{service.name}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {guests.map((guest, index) => (
                  <Field key={guest.id ?? `new-${index}`} label={guestLabel(guest, index, guests, lang)} inline>
                    <Checkbox
                      checked={attendance[service.id]?.[index] === true}
                      onChange={(event) =>
                        setAttendance((current) => {
                          const answers = [...(current[service.id] ?? guests.map(() => false))];
                          answers[index] = event.target.checked;
                          return { ...current, [service.id]: answers };
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}
          <Field label={t.answered} description={t.answeredHint} inline>
            <Switch checked={answered} onChange={(event) => setAnswered(event.target.checked)} />
          </Field>
        </fieldset>
      ) : null}

      <Field label={t.notesLabel} description={t.notesHint}>
        <Textarea value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} />
      </Field>

      {invitation && invitationUrl ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-app-fg">{t.linkLabel}</p>
          <p className="break-all rounded-lg bg-app-subtle px-3 py-2 font-mono text-xs text-app-fg-secondary">
            {invitationUrl}
          </p>
          {onRegenerate ? (
            <div>
              <Button
                variant="plain"
                size="sm"
                leadingIcon={<ArrowsClockwise aria-hidden="true" size={16} />}
                disabled={pending}
                onClick={onRegenerate}
              >
                {t.newLink}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          {t.cancel}
        </Button>
        <Button type="submit" loading={pending}>
          {t.save}
        </Button>
      </DialogActions>
    </form>
  );
}
