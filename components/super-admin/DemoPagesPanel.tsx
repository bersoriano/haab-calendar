import { startDemoEdit } from "@/app/super-admin/actions";
import { Badge, Button, ButtonLink, Card } from "@/components/app-ui";
import type { DemoPageSummary } from "@/lib/supabase/demo-edit";

function demoStatusText(demo: DemoPageSummary) {
  if (demo.status === "ready") {
    return `${demo.serviceCount} service${demo.serviceCount === 1 ? "" : "s"}`;
  }
  return demo.status === "missing"
    ? "Not seeded — run npm run seed:examples"
    : "Owned by the old shared demo account — re-run npm run seed:examples";
}

export function DemoPagesPanel({ demoPages }: { demoPages: DemoPageSummary[] }) {
  return (
    <section aria-label="Demo pages">
      {/* The page header names the section; this says what editing does. */}
      <p className="max-w-2xl text-sm text-app-fg-muted">
        Editing a demo opens the normal dashboard against that page; every save
        writes to it until you exit demo editing.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {demoPages.map((demo) => (
          <Card key={demo.key} as="article" className="flex flex-col p-5">
            <div>
              <Badge>{demo.vertical}</Badge>
            </div>
            <h3 className="mt-3 text-base font-semibold text-app-fg">{demo.businessName ?? demo.label}</h3>
            <p className="mt-1 break-all font-mono text-xs text-app-fg-muted">{demo.publicPath}</p>
            <p className="mt-3 text-sm text-app-fg-secondary">{demoStatusText(demo)}</p>

            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
              <form action={startDemoEdit}>
                <input type="hidden" name="demoKey" value={demo.key} />
                <Button type="submit" variant="primary" disabled={demo.status !== "ready"}>
                  Edit demo
                </Button>
              </form>
              <ButtonLink href={demo.publicPath} variant="plain" external newTabLabel="(opens in a new tab)">
                View live
              </ButtonLink>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
