import { Button, ButtonLink, segmentStyles } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { Lang } from "@/lib/types";

type Section<T extends string> = { value: T; label: string };

/**
 * The module's own header for hosts without the dashboard shell
 * (`chrome="module"`: embedded and child projects). Business name and booking
 * link, the account controls the host passes, and either the section tabs or
 * the way back to them from the booking preview.
 */
export function ModuleHeader<T extends string>({
  lang,
  title,
  publicUrl,
  copiedLink,
  onCopyLink,
  userEmail,
  onSignOut,
  sections,
  currentSection,
  onSelectSection,
  onBackToWorkspace,
}: {
  lang: Lang;
  title: string;
  publicUrl: string;
  copiedLink: boolean;
  onCopyLink: () => void;
  userEmail?: string;
  onSignOut?: () => void | Promise<void>;
  /** Shown on the management surface. */
  sections?: readonly Section<T>[];
  currentSection?: T;
  onSelectSection?: (section: T) => void;
  /** Shown on the booking preview instead of the sections. */
  onBackToWorkspace?: () => void;
}) {
  const t = bookingTranslations[lang];
  const shell = dashboardCopy[lang];

  return (
    <div className="border-b border-app-border bg-app-surface px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-app-fg sm:text-2xl">{title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-all font-mono text-sm text-app-fg-muted">{publicUrl}</span>
            <Button variant="plain" size="sm" onClick={onCopyLink}>
              {copiedLink ? t.publicFlow.copied : t.publicFlow.copyLink}
            </Button>
            <ButtonLink href={publicUrl} variant="plain" size="sm" external newTabLabel={shell.opensInNewTab}>
              {t.admin.viewPublicPage}
            </ButtonLink>
          </div>
        </div>

        {userEmail || onSignOut ? (
          <div className="flex shrink-0 items-center gap-3">
            {userEmail ? <span className="hidden text-sm text-app-fg-muted sm:inline">{userEmail}</span> : null}
            {onSignOut ? (
              <form action={onSignOut}>
                <Button type="submit" variant="secondary">
                  {t.admin.signOut}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      {sections ? (
        <nav aria-label={shell.navLabel} className="mt-5 overflow-x-auto">
          <div className="inline-flex gap-1 rounded-lg bg-app-subtle p-1">
            {sections.map((section) => (
              <button
                key={section.value}
                type="button"
                data-app-control=""
                aria-current={currentSection === section.value ? "page" : undefined}
                onClick={() => onSelectSection?.(section.value)}
                className={segmentStyles(currentSection === section.value)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>
      ) : onBackToWorkspace ? (
        <div className="mt-5">
          <Button variant="secondary" onClick={onBackToWorkspace}>
            {t.admin.backToWorkspace}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
