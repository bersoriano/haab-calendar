"use client";

import { useMemo, useState } from "react";

import { Alert, Button, Checkbox, Dialog, DialogActions, Field, Input, Textarea } from "@/components/app-ui";
import { fillCopy } from "@/components/invitations/invitation-copy";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { countCopy, guestsCopy } from "@/components/provider/guests/guests-copy";
import { parseGuestPaste, type PastedRow } from "@/lib/invitations";
import { clampInvitationSeats, INVITATION_SEAT_LIMIT_MAX } from "@/lib/rsvp-mode";
import type { Lang, Service } from "@/lib/types";

/**
 * Paste rows from a spreadsheet, see what will be added and which lines need a
 * fix, then add them in one go. Lines with a problem are left out, not guessed.
 */
export function PasteImportDialog({
  open,
  lang,
  services,
  defaultSeats,
  pending,
  error,
  onImport,
  onClose,
}: {
  open: boolean;
  lang: Lang;
  services: Service[];
  defaultSeats: number;
  pending: boolean;
  error?: string | null;
  onImport: (rows: PastedRow[], eventIds: string[]) => void;
  onClose: () => void;
}) {
  const t = guestsCopy[lang].paste;

  return (
    <Dialog open={open} onClose={onClose} title={t.title} description={t.body} size="lg" closeLabel={dashboardCopy[lang].closeDialog}>
      {open ? (
        <PasteForm
          lang={lang}
          services={services}
          defaultSeats={defaultSeats}
          pending={pending}
          error={error}
          onImport={onImport}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function PasteForm({
  lang,
  services,
  defaultSeats,
  pending,
  error,
  onImport,
  onClose,
}: Omit<Parameters<typeof PasteImportDialog>[0], "open">) {
  const t = guestsCopy[lang].paste;
  const [text, setText] = useState("");
  const [seats, setSeats] = useState(String(defaultSeats));
  const [eventIds, setEventIds] = useState(() => services.map((service) => service.id));
  const result = useMemo(
    () => parseGuestPaste(text, clampInvitationSeats(seats, defaultSeats)),
    [text, seats, defaultSeats],
  );

  return (
    <div className="grid gap-5">
      {error ? <Alert tone="danger" role="alert" title={error} /> : null}

      <Field label={t.textLabel}>
        <Textarea
          value={text}
          rows={8}
          placeholder={t.textPlaceholder}
          className="font-mono text-xs"
          onChange={(event) => setText(event.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.seatsLabel}>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={INVITATION_SEAT_LIMIT_MAX}
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
          />
        </Field>
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
      </div>

      <section aria-live="polite" className="grid gap-3">
        <h3 className="text-sm font-semibold text-app-fg">
          {result.rows.length > 0 ? countCopy(result.rows.length, t.previewTitleOne, t.previewTitle) : t.previewEmpty}
        </h3>
        {result.rows.length > 0 ? (
          <ul className="max-h-48 divide-y divide-app-border overflow-y-auto rounded-lg ring-1 ring-app-border">
            {result.rows.map((row, index) => (
              <li key={`${row.displayName}-${index}`} className="flex flex-wrap justify-between gap-x-4 px-3 py-2 text-sm">
                <span className="font-medium text-app-fg">{row.displayName}</span>
                <span className="text-app-fg-muted">
                  {[row.contactPhone, row.contactEmail, countCopy(row.seatLimit, guestsCopy[lang].seatsValueOne, guestsCopy[lang].seatsValue)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {result.errors.length > 0 ? (
          <Alert tone="warning" title={countCopy(result.errors.length, t.errorsTitleOne, t.errorsTitle)}>
            <ul className="list-disc pl-5">
              {result.errors.map((problem) => (
                <li key={problem.line}>
                  {fillCopy(t.lineLabel, { line: problem.line })}: {t.reasons[problem.reason]}
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}
      </section>

      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          {t.cancel}
        </Button>
        <Button
          loading={pending}
          disabled={result.rows.length === 0}
          onClick={() => onImport(result.rows, eventIds)}
        >
          {countCopy(result.rows.length, t.importLabelOne, t.importLabel)}
        </Button>
      </DialogActions>
    </div>
  );
}
