import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { logout } from "@/app/login/actions";
import { BrandMark, Button, ButtonLink, Card, EmptyState } from "@/components/app-ui";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { Lang } from "@/lib/types";

/**
 * The owner's page exists (or may) but could not be read. Says so and offers a
 * retry, instead of passing the owner off as new and offering setup again.
 */
export function DashboardLoadError({ lang, retryHref }: { lang: Lang; retryHref: string }) {
  const copy = dashboardCopy[lang];

  return (
    <main lang={lang} className="flex min-h-screen flex-col items-center bg-app-canvas px-4 py-16">
      <div className="w-full max-w-md">
        <BrandMark size="lg" className="mx-auto" />
        <Card className="mt-8">
          <EmptyState
            headingLevel={2}
            icon={<WarningCircle aria-hidden="true" size={32} className="text-app-danger-fg" />}
            title={copy.storeLoadFailedTitle}
            body={copy.storeLoadFailedBody}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ButtonLink href={retryHref} variant="primary">
                  {copy.tryAgain}
                </ButtonLink>
                <form action={logout}>
                  <Button type="submit" variant="secondary">
                    {copy.signOut}
                  </Button>
                </form>
              </div>
            }
          />
        </Card>
      </div>
    </main>
  );
}
