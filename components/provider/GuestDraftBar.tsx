import { Button } from "@/components/app-ui";
import { translations, type Lang } from "@/components/landing/translations";

/**
 * Above the guest page builder: this is a preview that lives in the browser,
 * and publishing it means making an account.
 */
export function GuestDraftBar({ lang, onPublish }: { lang: Lang; onPublish: () => void }) {
  const t = translations[lang].home;

  return (
    <aside className="border-b border-app-info-ring bg-app-info-soft px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-semibold text-app-info-fg">{t.guestDraftTitle}</p>
          <p className="mt-0.5 text-app-fg-secondary">{t.guestDraftBody}</p>
        </div>
        <Button variant="primary" onClick={onPublish} className="shrink-0">
          {t.guestDraftPublish}
        </Button>
      </div>
    </aside>
  );
}
