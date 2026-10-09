"use client";

import type { Lang, VerticalId, WeeklyAvailability, WeekdayKey } from "@/lib/types";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { AvailabilityEditor } from "@/components/provider/AvailabilityEditor";
import { DailyBookingLimitField } from "@/components/provider/DailyBookingLimitField";
import { adminInsetClass, adminPanelClass } from "@/components/provider/adminGlass";
import { ActionButton, SectionTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

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
      <div className={cn(adminPanelClass, "p-6")}>
        <SectionTitle title={t.eventSchedulingTitle} body={t.eventSchedulingBody} />
        <div className={cn("mt-6", adminInsetClass, "p-5")}>
          <p className="text-sm leading-6 text-[var(--muted)]">
            {t.eventSchedulingHint}
          </p>
          <div className="mt-4">
            <ActionButton
              tone="primary"
              disabled={disabled}
              onClick={onManageEvents}
            >
              {t.manageEvents}
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(adminPanelClass, "p-6")}>
      <SectionTitle title={t.weeklyAvailability} />
      <div className="mt-6">
        <AvailabilityEditor
          availability={availability}
          onChange={onChange}
          disabled={disabled}
          lang={lang}
        />
      </div>
      {onMaxBookingsPerDayChange ? (
        <DailyBookingLimitField
          value={maxBookingsPerDay}
          onChange={onMaxBookingsPerDayChange}
          disabled={disabled}
          lang={lang}
        />
      ) : null}
    </div>
  );
}
