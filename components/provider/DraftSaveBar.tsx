import { Button } from "@/components/app-ui";
import { translations, type Lang } from "@/components/landing/translations";

/**
 * The guest page builder's save control. A draft made before any account is
 * written to the browser as it is edited, so there is nothing to click to save
 * it: the bar says where it is kept, and offers the one thing that keeps it
 * anywhere else and puts it online. Sticks to the bottom of the screen through
 * setup, the workspace and the preview, where the dashboard's save bar sits.
 */
export function GuestDraftBar({ lang, onPublish }: { lang: Lang; onPublish: () => void }) {
  const t = translations[lang].home;

  return (
    <div
      role="region"
      aria-label={t.guestDraftTitle}
      className="sticky bottom-0 z-30 border-t border-app-border bg-app-surface px-4 py-3 shadow-lg sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">
          <p className="flex items-center gap-2 font-semibold text-app-fg">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-app-success-fg" />
            {t.guestDraftTitle}
          </p>
          {/* A phone keeps the bar short: the form above it needs the room. */}
          <p className="mt-0.5 text-app-fg-muted max-sm:hidden">{t.guestDraftBody}</p>
        </div>
        <Button variant="primary" onClick={onPublish} className="shrink-0">
          {t.guestDraftPublish}
        </Button>
      </div>
    </div>
  );
}
