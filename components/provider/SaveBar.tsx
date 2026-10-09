import { bookingTranslations } from "@/components/booking/i18n/translations";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { ActionButton } from "@/components/ui/ActionButton";
import { Alert } from "@/components/ui/Alert";
import type { Lang } from "@/lib/types";

/**
 * One save control for every section whose edits wait for "Save changes".
 * Sticks to the bottom of the content while there is something to save, so
 * an edit made in Appearance is still one click from saved after the owner
 * has moved on to Bookings.
 */
export function SaveBar({
  visible,
  saving,
  error,
  message,
  onSave,
  lang,
}: {
  /** There are edits the server has not seen. */
  visible: boolean;
  saving: boolean;
  error?: string | null;
  message?: string | null;
  onSave: () => void;
  lang: Lang;
}) {
  const shell = dashboardCopy[lang];
  const t = bookingTranslations[lang];

  if (!visible && !error && !message) {
    return null;
  }

  return (
    <div className="pointer-events-none sticky bottom-4 z-30 mt-6 grid gap-2">
      {error ? (
        <Alert tone="danger" role="alert" className="pointer-events-auto">
          {error}
        </Alert>
      ) : null}
      {visible ? (
        <div
          role="region"
          aria-label={shell.unsavedChanges}
          className="pointer-events-auto flex flex-col gap-3 rounded-[22px] border border-[var(--line)] bg-[var(--surface-lowest)]/95 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[var(--warning-strong)]" />
              {shell.unsavedChanges}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{shell.unsavedChangesHint}</p>
          </div>
          <ActionButton tone="primary" disabled={saving} onClick={onSave}>
            {saving ? t.common.saving : t.admin.saveChanges}
          </ActionButton>
        </div>
      ) : message ? (
        <Alert tone="success" role="status" className="pointer-events-auto">
          {message}
        </Alert>
      ) : null}
    </div>
  );
}
