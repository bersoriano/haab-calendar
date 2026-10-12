import { CaretDown, Info } from "@phosphor-icons/react/dist/ssr";

import { Alert, Button, Field, Switch, toneSurface } from "@/components/app-ui";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { getBookingRetentionPolicy, type BookingRetentionPolicy } from "@/lib/booking-retention";
import { hasResolvedEntitlement, type ProviderEntitlements } from "@/lib/entitlements/resolve";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * What happens to old bookings. Above the list it folds away (`collapsible`):
 * one line says how long history is kept, and opening it gives the policy in
 * full. A policy that could not be verified opens by itself, since that is
 * something to act on.
 */
export function BookingRetentionNotice({ lang, policy, onOpenSettings, collapsible = false }: {
  lang: Lang;
  policy: BookingRetentionPolicy;
  onOpenSettings?: () => void;
  collapsible?: boolean;
}) {
  const copy = dashboardCopy[lang];
  const text = policy === "year" ? copy.retentionYear : policy === "month" ? copy.retentionMonth : copy.retentionUnknown;
  const actions = onOpenSettings ? (
    <Button variant="plain" size="sm" onClick={onOpenSettings}>
      {copy.retentionManage}
    </Button>
  ) : undefined;
  const details = (
    <>
      <p>{copy.retentionDateHint}</p>
      {onOpenSettings && policy === "month" ? <p className="mt-1">{copy.retentionDefaultOff}</p> : null}
    </>
  );

  if (collapsible) {
    const kept =
      policy === "year" ? copy.retentionKeptYear : policy === "month" ? copy.retentionKeptMonth : copy.retentionKeptUnknown;

    return (
      <details
        data-retention-notice
        open={policy === "unknown"}
        className={cn("group rounded-lg text-sm ring-1 ring-inset", toneSurface.info)}
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent [&::-webkit-details-marker]:hidden">
          <Info aria-hidden="true" size={20} weight="fill" className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{copy.retentionTitle}</span>
            <span aria-hidden="true"> · </span>
            <span aria-live="polite">{kept}</span>
          </span>
          <CaretDown aria-hidden="true" size={16} className="shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-3 px-4 pb-4 pt-1 sm:flex-row sm:items-center sm:justify-between sm:pl-12">
          <div className="min-w-0 break-words">
            <p className="font-semibold">{text}</p>
            <div className="mt-1">{details}</div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </details>
    );
  }

  return (
    <Alert tone="info" title={<span aria-live="polite">{text}</span>} actions={actions}>
      {details}
    </Alert>
  );
}

export function BookingRetentionSettings({
  lang, enabled, savedEnabled, entitlements, disabled, onChange,
}: {
  lang: Lang;
  enabled: boolean;
  savedEnabled: boolean;
  entitlements?: ProviderEntitlements;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const copy = dashboardCopy[lang];
  const entitled = Boolean(entitlements && hasResolvedEntitlement(entitlements, "booking_history_retention"));
  const policy = getBookingRetentionPolicy(savedEnabled, entitlements);
  return (
    <div className="grid gap-4">
      <BookingRetentionNotice lang={lang} policy={policy} />
      <Field label={copy.retentionOption} description={copy.retentionDefaultOff} inline>
        <Switch
          name="keepBookingHistoryOneYear"
          checked={enabled}
          // A downgraded owner may always turn an old preference off.
          disabled={disabled || (!entitled && !enabled)}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby="booking-retention-help"
        />
      </Field>
      <p id="booking-retention-help" className="text-sm text-app-fg-muted">{copy.retentionDowngrade}</p>
      {enabled !== savedEnabled ? (
        <p role="status" className="text-sm font-semibold text-app-accent">{copy.retentionPending}</p>
      ) : null}
    </div>
  );
}
