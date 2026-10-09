import { Alert, Button, Field, Switch } from "@/components/app-ui";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { getBookingRetentionPolicy, type BookingRetentionPolicy } from "@/lib/booking-retention";
import { hasResolvedEntitlement, type ProviderEntitlements } from "@/lib/entitlements/resolve";
import type { Lang } from "@/lib/types";

export function BookingRetentionNotice({ lang, policy, onOpenSettings }: {
  lang: Lang;
  policy: BookingRetentionPolicy;
  onOpenSettings?: () => void;
}) {
  const copy = dashboardCopy[lang];
  const text = policy === "year" ? copy.retentionYear : policy === "month" ? copy.retentionMonth : copy.retentionUnknown;
  return (
    <Alert
      tone="info"
      title={<span aria-live="polite">{text}</span>}
      actions={
        onOpenSettings ? (
          <Button variant="plain" size="sm" onClick={onOpenSettings}>
            {copy.retentionManage}
          </Button>
        ) : undefined
      }
    >
      <p>{copy.retentionDateHint}</p>
      {onOpenSettings && policy === "month" ? <p className="mt-1">{copy.retentionDefaultOff}</p> : null}
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
