"use client";

import type { Lang, VerticalId, WeeklyAvailability, WeekdayKey } from "@/lib/types";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { AvailabilityEditor } from "@/components/provider/AvailabilityEditor";
import { DailyBookingLimitField } from "@/components/provider/DailyBookingLimitField";
import { Button, Card, CardBody, CardHeader } from "@/components/app-ui";

export function AvailabilitySettingsSection({
  vertical,
  availability,
  onChange,
  onManageEvents,
  maxBookingsPerDay,
  onMaxBookingsPerDayChange,
  disabled = false,
  lang = "en",
}: {
  vertical?: VerticalId;
  availability: WeeklyAvailability;
  onChange: (day: WeekdayKey, patch: Partial<WeeklyAvailability[WeekdayKey]>) => void;
  maxBookingsPerDay?: number;
  /** Absent where the limit cannot be saved; the field is then not shown. */
  onMaxBookingsPerDayChange?: (value: number | undefined) => void;
  onManageEvents: () => void;
  disabled?: boolean;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang].admin;

  if (vertical === "events") {
    return (
      <Card as="section">
        <CardHeader title={t.eventSchedulingTitle} description={t.eventSchedulingBody} />
        <CardBody className="grid gap-4">
          <p className="text-sm text-app-fg-muted">{t.eventSchedulingHint}</p>
          <div>
            <Button disabled={disabled} onClick={onManageEvents}>
              {t.manageEvents}
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card as="section">
      <CardHeader title={t.weeklyAvailability} />
      <CardBody>
        <AvailabilityEditor availability={availability} onChange={onChange} disabled={disabled} lang={lang} />
        {onMaxBookingsPerDayChange ? (
          <DailyBookingLimitField
            value={maxBookingsPerDay}
            onChange={onMaxBookingsPerDayChange}
            disabled={disabled}
            lang={lang}
          />
        ) : null}
      </CardBody>
    </Card>
  );
}
