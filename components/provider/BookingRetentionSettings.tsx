import { SectionTitle } from "@/components/ui";
import { adminPanelClass } from "@/components/provider/adminGlass";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { getBookingRetentionPolicy, type BookingRetentionPolicy } from "@/lib/booking-retention";
import { hasResolvedEntitlement, type ProviderEntitlements } from "@/lib/entitlements/resolve";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BookingRetentionNotice({ lang, policy, onOpenSettings }: {
  lang: Lang;
  policy: BookingRetentionPolicy;
  onOpenSettings?: () => void;
}) {
  const copy = dashboardCopy[lang];
  const text = policy === "year" ? copy.retentionYear : policy === "month" ? copy.retentionMonth : copy.retentionUnknown;
  return (
    <aside className="rounded-2xl bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">
      <p aria-live="polite" className="font-semibold text-[var(--ink)]">{text}</p>
      <p className="mt-1 leading-relaxed">{copy.retentionDateHint}</p>
      {onOpenSettings ? (
        <>
          {policy === "month" ? <p className="mt-1 leading-relaxed">{copy.retentionDefaultOff}</p> : null}
          <button type="button" onClick={onOpenSettings} className="mt-2 min-h-11 rounded-xl px-2 font-semibold text-[var(--primary)] transition hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
            {copy.retentionManage}
          </button>
        </>
      ) : null}
    </aside>
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
    <section className={cn(adminPanelClass, "p-5 sm:p-6")}>
      <SectionTitle title={copy.retentionTitle} />
      <div className="mt-4"><BookingRetentionNotice lang={lang} policy={policy} /></div>
      <label className="mt-4 flex min-h-12 items-start gap-3 rounded-2xl bg-[var(--surface-lowest)] p-4">
        <input
          type="checkbox"
          name="keepBookingHistoryOneYear"
          checked={enabled}
          // A downgraded owner may always turn an old preference off.
          disabled={disabled || (!entitled && !enabled)}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby="booking-retention-help"
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        />
        <span className="min-w-0">
          <span className="block font-semibold text-[var(--ink)]">{copy.retentionOption}</span>
          <span className="mt-1 block text-sm text-[var(--muted)]">{copy.retentionDefaultOff}</span>
        </span>
      </label>
      <p id="booking-retention-help" className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{copy.retentionDowngrade}</p>
      {enabled !== savedEnabled ? <p role="status" className="mt-3 text-sm font-semibold text-[var(--primary)]">{copy.retentionPending}</p> : null}
    </section>
  );
}
