"use client";

import type { ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Button, IconButton } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The head of a view of the bookings over a period: the controls that turn
 * it, the period's name, and whatever the view says about it.
 */
export function BookingsPeriodHeader({
  lang,
  label,
  labelId,
  labelClassName,
  onPrevious,
  onToday,
  onNext,
  children,
}: {
  lang: Lang;
  label: string;
  /** The view is named by this heading. */
  labelId: string;
  labelClassName?: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
  children?: ReactNode;
}) {
  const t = bookingTranslations[lang];

  return (
    <div className="flex flex-col gap-3 border-b border-app-border px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg ring-1 ring-app-border-strong">
          <IconButton
            label={t.publicFlow.previous}
            icon={<CaretLeft aria-hidden="true" size={16} />}
            onClick={onPrevious}
            className="rounded-r-none"
          />
          <Button variant="plain" onClick={onToday} className="rounded-none border-x border-app-border-strong">
            {t.publicFlow.today}
          </Button>
          <IconButton
            label={t.publicFlow.next}
            icon={<CaretRight aria-hidden="true" size={16} />}
            onClick={onNext}
            className="rounded-l-none"
          />
        </div>
        <h2 id={labelId} className={cn("text-base font-semibold text-app-fg sm:text-lg", labelClassName)}>
          {label}
        </h2>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-app-fg-muted">
        {children}
      </div>
    </div>
  );
}
