import { Alert, Button } from "@/components/app-ui";
import { translations, type Lang } from "@/components/landing/translations";
import type { DraftSaveMode } from "@/lib/draft-workspace";

/**
 * The page builder's save control, while the page is a draft. A draft is
 * written to the browser as it is edited, so there is nothing to click to save
 * it: the bar says where it is kept, and offers the one thing that keeps it
 * anywhere else and puts it online. For a guest that is an account; for a
 * signed-in account with a finished draft it is publishing; during a signed-in
 * setup it is nothing, because setup's last step publishes. Sticks to the
 * bottom of the screen through setup, the workspace and the preview, where the
 * dashboard's save bar sits.
 */
export function DraftSaveBar({
  lang,
  mode,
  onPublish,
  publishing = false,
  error,
}: {
  lang: Lang;
  mode: DraftSaveMode;
  onPublish: () => void;
  publishing?: boolean;
  /** Why the last publish failed. Stays until the next one starts. */
  error?: string | null;
}) {
  const t = translations[lang].home;
  const body =
    mode === "guest" ? t.guestDraftBody : mode === "account" ? t.accountDraftBody : t.setupDraftBody;
  const action =
    mode === "guest"
      ? t.guestDraftPublish
      : mode === "account"
        ? publishing
          ? t.accountDraftPublishing
          : t.accountDraftPublish
        : null;

  return (
    <div
      role="region"
      aria-label={t.guestDraftTitle}
      className="sticky bottom-0 z-30 border-t border-app-border bg-app-surface px-4 py-3 shadow-lg sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-[1600px] gap-3">
        {error ? (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="flex items-center gap-2 font-semibold text-app-fg">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-app-success-fg" />
              {t.guestDraftTitle}
            </p>
            {/* A phone keeps the bar short: the form above it needs the room. */}
            <p className="mt-0.5 text-app-fg-muted max-sm:hidden">{body}</p>
          </div>
          {action ? (
            <Button variant="primary" onClick={onPublish} loading={publishing} className="shrink-0">
              {action}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
