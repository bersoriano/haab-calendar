import { ShieldStar } from "@phosphor-icons/react/dist/ssr";

import { Alert, ButtonLink } from "@/components/app-ui";
import type { PublicationStatus } from "@/lib/supabase/publication";

/**
 * Account notices above the builder and the landing page: a message about
 * the page's publication, and super admin's way in. Nothing to say renders
 * nothing.
 */
export function AccountStatusBar({
  isSuperAdmin,
  publicationStatus,
}: {
  isSuperAdmin?: boolean;
  publicationStatus?: PublicationStatus;
}) {
  if (!isSuperAdmin && !publicationStatus?.dashboardMessage) {
    return null;
  }

  return (
    <aside className="border-b border-app-border bg-app-surface px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {publicationStatus?.dashboardMessage ? (
          <Alert
            tone={publicationStatus.publishingEnabled ? "success" : "danger"}
            role={publicationStatus.publishingEnabled ? "status" : "alert"}
            className="flex-1"
          >
            {publicationStatus.dashboardMessage}
          </Alert>
        ) : (
          <span />
        )}
        {isSuperAdmin ? (
          <ButtonLink
            href="/super-admin"
            variant="secondary"
            leadingIcon={<ShieldStar aria-hidden="true" size={16} weight="fill" className="text-app-admin-fg" />}
            className="shrink-0"
          >
            Open super admin
          </ButtonLink>
        ) : null}
      </div>
    </aside>
  );
}
