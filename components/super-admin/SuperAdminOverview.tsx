import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Badge, Card, CardBody, CardHeader, Stat, StatGroup, StackedList, focusRing } from "@/components/app-ui";
import { cn } from "@/lib/utils";

type AttentionItem = {
  href: string;
  /** What the item is about, as a badge. */
  label: string;
  text: string;
  tone: "warning" | "danger";
};

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Super admin's first page: the numbers, and anything waiting on an operator. */
export function SuperAdminOverview({
  accounts,
  pendingCleanups,
  demoPagesNeedingSeed,
}: {
  accounts: { total: number; enabled: number; disabled: number };
  pendingCleanups: number;
  demoPagesNeedingSeed: number;
}) {
  const attention: AttentionItem[] = [];

  if (pendingCleanups > 0) {
    attention.push({
      href: "/super-admin/cleanups",
      label: "Cleanups",
      text: `${plural(pendingCleanups, "deleted account still has", "deleted accounts still have")} branding files queued.`,
      tone: "warning",
    });
  }
  if (accounts.disabled > 0) {
    attention.push({
      href: "/super-admin/accounts?status=disabled",
      label: "Publishing",
      text: `${plural(accounts.disabled, "account can't", "accounts can't")} publish.`,
      tone: "danger",
    });
  }
  if (demoPagesNeedingSeed > 0) {
    attention.push({
      href: "/super-admin/demo-pages",
      label: "Demo pages",
      text: `${plural(demoPagesNeedingSeed, "demo page needs", "demo pages need")} seeding.`,
      tone: "warning",
    });
  }

  return (
    <div className="grid gap-6">
      <section aria-label="Account summary">
        <StatGroup columns={4}>
          <Stat
            label="Registered accounts"
            value={accounts.total}
            href="/super-admin/accounts"
            linkLabel="View all"
          />
          <Stat
            label="Publishing on"
            value={accounts.enabled}
            href="/super-admin/accounts?status=enabled"
            linkLabel="View all"
          />
          <Stat
            label="Publishing off"
            value={accounts.disabled}
            href="/super-admin/accounts?status=disabled"
            linkLabel="View all"
          />
          <Stat
            label="Pending cleanups"
            value={pendingCleanups}
            href="/super-admin/cleanups"
            linkLabel="View all"
          />
        </StatGroup>
      </section>

      <Card as="section">
        <CardHeader title="Needs attention" />
        {attention.length === 0 ? (
          <CardBody>
            <p className="text-sm text-app-fg-muted">Nothing needs attention right now.</p>
          </CardBody>
        ) : (
          <StackedList>
            {attention.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center gap-3 px-4 py-4 text-sm font-medium text-app-fg transition-colors hover:bg-app-subtle sm:px-6",
                    focusRing,
                  )}
                >
                  <Badge tone={item.tone}>{item.label}</Badge>
                  <span className="min-w-0 flex-1">{item.text}</span>
                  <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-app-fg-muted" />
                </Link>
              </li>
            ))}
          </StackedList>
        )}
      </Card>
    </div>
  );
}
