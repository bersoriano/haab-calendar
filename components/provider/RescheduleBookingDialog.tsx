"use client";

import { Alert, Button, Dialog, DialogActions } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

export type RescheduleDay = {
  dateKey: string;
  dayOfMonth: number;
  inMonth: boolean;
  available: boolean;
  selected: boolean;
};

const choiceClass =
  "rounded-lg text-sm font-semibold ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-40";

function choiceState(selected: boolean) {
  return selected
    ? "bg-app-accent text-app-on-accent ring-app-accent"
    : "bg-app-surface text-app-fg ring-app-border hover:bg-app-subtle enabled:hover:ring-app-accent";
}

/**
 * The dashboard's reschedule picker: a four-week window of days and, for
 * timed services, the free slots on the chosen day. Presentational — the
 * module computes availability and saves. Public pages keep their own modal.
 */
export function RescheduleBookingDialog({
  open,
  lang,
  copy,
  serviceName,
  clientName,
  serviceDescription,
  appointment,
  windowLabel,
  weekdayLabels,
  weeks,
  selectedDateLabel,
  slots,
  pending,
  error,
  canSave,
  onToday,
  onSelectDay,
  onSelectSlot,
  onSave,
  onClose,
}: {
  open: boolean;
  lang: Lang;
  copy: VerticalCopy;
  serviceName: string;
  clientName: string;
  serviceDescription?: string;
  /** Timed service: pick a slot. Otherwise the whole day moves. */
  appointment: boolean;
  windowLabel: string;
  weekdayLabels: string[];
  weeks: RescheduleDay[][];
  selectedDateLabel: string;
  slots: { value: string; label: string; selected: boolean }[];
  pending: boolean;
  error?: string;
  canSave: boolean;
  onToday: () => void;
  onSelectDay: (dateKey: string) => void;
  onSelectSlot: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const t = bookingTranslations[lang];

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      size="lg"
      title={`${copy.rescheduleBooking}: ${serviceName}`}
      description={`${clientName} · ${appointment ? t.manage.chooseNewSlot : t.manage.chooseNewDay}`}
      closeLabel={dashboardCopy[lang].closeDialog}
      footer={
        <DialogActions>
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button loading={pending} disabled={!canSave} onClick={onSave}>
            {t.manage.saveNewTime}
          </Button>
        </DialogActions>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="grid content-start gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-app-fg">{windowLabel}</p>
            <Button variant="secondary" size="sm" onClick={onToday}>
              {t.publicFlow.today}
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-app-fg-muted">
            {weekdayLabels.map((label) => (
              <p key={label}>{label}</p>
            ))}
          </div>
          <div className="grid gap-1">
            {weeks.map((week) => (
              <div key={week[0]?.dateKey} className="grid grid-cols-7 gap-1">
                {week.map((day) => (
                  <button
                    key={day.dateKey}
                    type="button"
                    data-date={day.dateKey}
                    aria-pressed={day.selected}
                    disabled={!day.available}
                    onClick={() => onSelectDay(day.dateKey)}
                    className={cn(
                      choiceClass,
                      "h-11 tabular-nums",
                      choiceState(day.selected),
                      !day.inMonth && !day.selected && "text-app-fg-muted",
                    )}
                  >
                    {day.dayOfMonth}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="grid content-start gap-3 rounded-lg bg-app-subtle p-4">
          <div>
            <p className="text-xs font-semibold text-app-fg-muted">{selectedDateLabel}</p>
            <p className="mt-1 text-sm font-semibold text-app-fg">
              {appointment ? t.manage.selectReplacementSlot : t.manage.confirmFullDayReschedule}
            </p>
            {serviceDescription ? <p className="mt-1 text-sm text-app-fg-muted">{serviceDescription}</p> : null}
          </div>
          {error ? (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          ) : null}
          {appointment ? (
            slots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                {slots.map((slot) => (
                  <button
                    key={slot.value}
                    type="button"
                    aria-pressed={slot.selected}
                    onClick={() => onSelectSlot(slot.value)}
                    className={cn(choiceClass, "h-11 px-2", choiceState(slot.selected))}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-app-fg-muted">{t.manage.noSlotsOnDateHelper}</p>
            )
          ) : (
            <p className="text-sm text-app-fg-muted">{t.manage.newDayFreeReplaceHelper}</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
