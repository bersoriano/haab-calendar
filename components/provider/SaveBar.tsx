"use client";

import { useEffect } from "react";

import { Alert, Button, useToast } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { Lang } from "@/lib/types";

/**
 * One save control for every section whose edits wait for "Save changes".
 * Sticks to the bottom of the content while there is something to save, so
 * an edit made in Appearance is still one click from saved after the owner
 * has moved on to Bookings. A finished save is confirmed with a toast; a
 * failed one stays here, next to the button that retries it.
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
  /** Set once per successful save (the module clears it in between). */
  message?: string | null;
  onSave: () => void;
  lang: Lang;
}) {
  const shell = dashboardCopy[lang];
  const t = bookingTranslations[lang];
  const { notify } = useToast();

  useEffect(() => {
    if (message) notify({ message });
  }, [message, notify]);

  if (!visible && !error) {
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
          className="pointer-events-auto flex flex-col gap-3 rounded-xl bg-app-surface px-4 py-3 shadow-lg ring-1 ring-app-border sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-app-fg">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-app-warning-fg" />
              {shell.unsavedChanges}
            </p>
            <p className="mt-0.5 text-sm text-app-fg-muted">{shell.unsavedChangesHint}</p>
          </div>
          <Button loading={saving} onClick={onSave}>
            {saving ? t.common.saving : t.admin.saveChanges}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
