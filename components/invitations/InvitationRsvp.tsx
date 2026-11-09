"use client";

import { CheckCircle, Trash } from "@phosphor-icons/react";
import { useId, useState, type FormEvent } from "react";

import { eventWhen, publicCardClass } from "@/components/invitations/EventSchedule";
import { fillCopy, invitationCopy } from "@/components/invitations/invitation-copy";
import { guestLabel } from "@/lib/invitations";
import type { PublicInvitation } from "@/lib/supabase/invitations";
import type { Lang, Service } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputClass =
  "h-[48px] w-full rounded-[15px] border border-[var(--form-border)] bg-[var(--surface-lowest)] px-4 !text-[16px] text-[var(--ink)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-[var(--accent)] focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_rgba(26,115,232,0.14)] sm:rounded-2xl sm:!text-[15px]";
const labelClass = "text-[13px] font-semibold text-[var(--ink-secondary)]";
const primaryButtonClass =
  "inline-flex h-[50px] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] px-6 !text-[16px] !font-semibold text-[var(--on-primary)] shadow-[0_14px_30px_rgba(26,115,232,0.28)] transition hover:saturate-125 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
const secondaryButtonClass =
  "inline-flex h-[44px] items-center justify-center rounded-full bg-[var(--surface-lowest)] px-5 text-[15px] font-semibold text-[var(--accent)] ring-1 ring-[var(--form-border)] transition hover:ring-[var(--accent)] disabled:opacity-50";

type DraftGuest = { id?: string; name: string };
type Status = { kind: "idle" } | { kind: "submitting" } | { kind: "offline" } | { kind: "error"; message: string };

function initialGuests(invitation: PublicInvitation): DraftGuest[] {
  const guests = invitation.guests.map((guest) => ({ id: guest.id, name: guest.name }));
  return guests.length > 0 ? guests : [{ name: "" }];
}

function initialAttendance(invitation: PublicInvitation, guests: DraftGuest[]) {
  return Object.fromEntries(
    invitation.eventIds.map((serviceId) => [
      serviceId,
      guests.map((guest) => {
        const saved = invitation.guests.find((candidate) => candidate.id === guest.id);
        return Boolean(invitation.submittedAt && saved?.attending[serviceId]);
      }),
    ]),
  );
}

/** An event already answered: someone ticked, or the household said no. */
function initialDeclined(invitation: PublicInvitation, attendance: Record<string, boolean[]>) {
  return Object.fromEntries(
    invitation.eventIds.map((serviceId) => [
      serviceId,
      Boolean(invitation.submittedAt) && !(attendance[serviceId] ?? []).some(Boolean),
    ]),
  );
}

/**
 * A household's RSVP: who is on the invitation, and per event who comes or
 * that nobody can. One submit covers every event; the same link changes it.
 * A failed send keeps everything typed.
 */
export function InvitationRsvp({
  invitation: initialInvitation,
  services,
  apiPath,
  lang,
}: {
  invitation: PublicInvitation;
  /** The page's events, in page order. Only the invitation's are asked about. */
  services: Service[];
  apiPath: string;
  lang: Lang;
}) {
  const t = invitationCopy[lang];
  const id = useId();
  const [invitation, setInvitation] = useState(initialInvitation);
  const [editing, setEditing] = useState(!initialInvitation.submittedAt);
  const [guests, setGuests] = useState<DraftGuest[]>(() => initialGuests(initialInvitation));
  const [attendance, setAttendance] = useState<Record<string, boolean[]>>(() =>
    initialAttendance(initialInvitation, initialGuests(initialInvitation)),
  );
  const [declined, setDeclined] = useState<Record<string, boolean>>(() =>
    initialDeclined(initialInvitation, initialAttendance(initialInvitation, initialGuests(initialInvitation))),
  );
  const [contactPhone, setContactPhone] = useState(initialInvitation.contactPhone);
  const [contactEmail, setContactEmail] = useState(initialInvitation.contactEmail);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const events = services.filter((service) => invitation.eventIds.includes(service.id));
  const atLimit = guests.length >= invitation.seatLimit;
  const unanswered = events.filter(
    (service) => !declined[service.id] && !(attendance[service.id] ?? []).some(Boolean),
  );

  function startEditing(from: PublicInvitation) {
    const nextGuests = initialGuests(from);
    const nextAttendance = initialAttendance(from, nextGuests);
    setGuests(nextGuests);
    setAttendance(nextAttendance);
    setDeclined(initialDeclined(from, nextAttendance));
    setContactPhone(from.contactPhone);
    setContactEmail(from.contactEmail);
    setStatus({ kind: "idle" });
    setEditing(true);
  }

  function addGuest() {
    if (atLimit) return;
    setGuests((current) => [...current, { name: "" }]);
    setAttendance((current) =>
      Object.fromEntries(Object.entries(current).map(([serviceId, answers]) => [serviceId, [...answers, false]])),
    );
  }

  function removeGuest(index: number) {
    setGuests((current) => current.filter((_, position) => position !== index));
    setAttendance((current) =>
      Object.fromEntries(
        Object.entries(current).map(([serviceId, answers]) => [
          serviceId,
          answers.filter((_, position) => position !== index),
        ]),
      ),
    );
  }

  function setAnswer(serviceId: string, index: number, value: boolean) {
    setAttendance((current) => {
      const answers = [...(current[serviceId] ?? guests.map(() => false))];
      answers[index] = value;
      return { ...current, [serviceId]: answers };
    });
    if (value) setDeclined((current) => ({ ...current, [serviceId]: false }));
  }

  function setNobody(serviceId: string, value: boolean) {
    setDeclined((current) => ({ ...current, [serviceId]: value }));
    if (value) {
      setAttendance((current) => ({ ...current, [serviceId]: guests.map(() => false) }));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (unanswered.length > 0 || status.kind === "submitting") return;

    setStatus({ kind: "submitting" });
    const body = {
      guests: guests.map((guest) => (guest.id ? { id: guest.id, name: guest.name } : { name: guest.name })),
      attendance: Object.fromEntries(
        invitation.eventIds.map((serviceId) => [
          serviceId,
          guests.map((_, index) => attendance[serviceId]?.[index] === true),
        ]),
      ),
      contactPhone,
      contactEmail,
    };

    let response: Response;
    try {
      response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setStatus({ kind: "offline" });
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | { invitation?: PublicInvitation; userMessage?: string }
      | null;

    if (!response.ok || !payload?.invitation) {
      setStatus({ kind: "error", message: payload?.userMessage ?? t.failed });
      return;
    }

    setInvitation(payload.invitation);
    setGuests(initialGuests(payload.invitation));
    setStatus({ kind: "idle" });
    setEditing(false);
  }

  const greeting =
    invitation.seatLimit === 1
      ? fillCopy(t.greetingOne, { name: invitation.displayName })
      : fillCopy(t.greetingMany, { name: invitation.displayName, seats: invitation.seatLimit });

  if (!editing) {
    return (
      <section aria-labelledby={`${id}-saved`} className={cn(publicCardClass, "grid gap-5")}>
        <div className="flex items-start gap-3">
          <CheckCircle aria-hidden="true" size={28} weight="fill" className="shrink-0 text-[var(--action-teal)]" />
          <div>
            <h2 id={`${id}-saved`} className="text-[20px] font-semibold text-[var(--ink)]">
              {t.saved}
            </h2>
            <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">{t.savedBody}</p>
          </div>
        </div>
        <ul className="grid gap-3">
          {events.map((service) => {
            const coming = invitation.guests.filter((guest) => guest.attending[service.id]);
            return (
              <li key={service.id} className="rounded-2xl bg-[var(--surface-lowest)] px-4 py-3">
                <p className="font-semibold text-[var(--ink)]">{service.name}</p>
                <p className="text-[14px] text-[var(--ink-secondary)] first-letter:uppercase">{eventWhen(service, lang)}</p>
                <p className="mt-1 text-[14.5px] text-[var(--ink)]">
                  {coming.length > 0
                    ? `${coming.length === 1 ? t.attendingCountOne : fillCopy(t.attendingCount, { count: coming.length })}: ${coming
                        .map((guest) => guestLabel(guest, invitation.guests.indexOf(guest), invitation.guests, lang))
                        .join(", ")}`
                    : t.notAttending}
                </p>
              </li>
            );
          })}
        </ul>
        <div>
          <button type="button" className={secondaryButtonClass} onClick={() => startEditing(invitation)}>
            {t.changeAnswer}
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <p className="text-[19px] font-semibold text-[var(--ink)] sm:text-[21px]">{greeting}</p>

      <fieldset className={cn(publicCardClass, "grid gap-4")}>
        <legend className="sr-only">{t.guestsTitle}</legend>
        <div aria-hidden="true">
          <p className="text-[17px] font-semibold text-[var(--ink)]">{t.guestsTitle}</p>
          <p className="mt-1 text-[14px] text-[var(--ink-secondary)]">{t.guestsHint}</p>
        </div>
        {guests.map((guest, index) => (
          <div key={guest.id ?? `new-${index}`} className="flex items-end gap-2">
            <label className="grid flex-1 gap-1.5">
              <span className={labelClass}>{fillCopy(t.guestNameLabel, { n: index + 1 })}</span>
              <input
                className={inputClass}
                value={guest.name}
                maxLength={120}
                autoComplete="off"
                placeholder={t.guestNamePlaceholder}
                onChange={(event) =>
                  setGuests((current) =>
                    current.map((entry, position) =>
                      position === index ? { ...entry, name: event.target.value } : entry,
                    ),
                  )
                }
              />
            </label>
            {guest.id ? null : (
              <button
                type="button"
                className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-lowest)] hover:text-[var(--danger-strong)]"
                aria-label={fillCopy(t.removeGuest, { name: guestLabel(guest, index, guests, lang) })}
                onClick={() => removeGuest(index)}
              >
                <Trash aria-hidden="true" size={18} />
              </button>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={secondaryButtonClass} disabled={atLimit} onClick={addGuest}>
            {t.addGuest}
          </button>
          <span className="text-[13.5px] text-[var(--ink-secondary)]">
            {fillCopy(t.seatLimit, { seats: invitation.seatLimit })}
          </span>
        </div>
      </fieldset>

      {events.map((service) => (
        <fieldset key={service.id} className={cn(publicCardClass, "grid gap-3")}>
          <legend className="sr-only">{`${service.name}: ${t.whoIsComing}`}</legend>
          <div aria-hidden="true">
            <p className="text-[17px] font-semibold text-[var(--ink)]">{service.name}</p>
            <p className="text-[14px] text-[var(--ink-secondary)] first-letter:uppercase">{eventWhen(service, lang)}</p>
            <p className="mt-2 text-[14px] font-semibold text-[var(--ink-secondary)]">{t.whoIsComing}</p>
          </div>
          {guests.map((guest, index) => (
            <label key={guest.id ?? `new-${index}`} className="flex min-h-[44px] items-center gap-3 text-[15.5px] text-[var(--ink)]">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={attendance[service.id]?.[index] === true}
                onChange={(event) => setAnswer(service.id, index, event.target.checked)}
              />
              {guestLabel(guest, index, guests, lang)}
            </label>
          ))}
          <label className="flex min-h-[44px] items-center gap-3 border-t border-[var(--form-border)] pt-3 text-[15.5px] text-[var(--ink)]">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--accent)]"
              checked={declined[service.id] === true}
              onChange={(event) => setNobody(service.id, event.target.checked)}
            />
            {t.cannotAttend}
          </label>
        </fieldset>
      ))}

      <fieldset className={cn(publicCardClass, "grid gap-4 sm:grid-cols-2")}>
        <legend className="sr-only">{t.contactTitle}</legend>
        <div aria-hidden="true" className="sm:col-span-2">
          <p className="text-[17px] font-semibold text-[var(--ink)]">{t.contactTitle}</p>
          <p className="mt-1 text-[14px] text-[var(--ink-secondary)]">{t.contactHint}</p>
        </div>
        <label className="grid gap-1.5">
          <span className={labelClass}>{t.phoneLabel}</span>
          <input
            className={inputClass}
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>{t.emailLabel}</span>
          <input
            className={inputClass}
            type="email"
            autoComplete="email"
            maxLength={254}
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />
        </label>
      </fieldset>

      {status.kind === "offline" || status.kind === "error" ? (
        <p role="alert" className="rounded-2xl bg-[var(--surface-lowest)] px-4 py-3 text-[15px] font-medium text-[var(--danger-strong)]">
          {status.kind === "offline" ? t.offline : status.message}
        </p>
      ) : null}

      <div className="grid gap-2">
        {unanswered.length > 0 ? (
          <p className="text-[14px] text-[var(--ink-secondary)]">{t.answerEveryEvent}</p>
        ) : null}
        <button
          type="submit"
          className={primaryButtonClass}
          disabled={unanswered.length > 0 || status.kind === "submitting"}
          aria-disabled={unanswered.length > 0}
        >
          {status.kind === "submitting" ? t.submitting : t.submit}
        </button>
      </div>
    </form>
  );
}
