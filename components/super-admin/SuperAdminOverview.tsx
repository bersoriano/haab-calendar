import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { cn } from "@/lib/utils";

type AttentionItem = {
  href: string;
  text: string;
  tone: "warning" | "danger";
};

const TILE_TONE = {
  neutral: "border-[var(--line)] bg-[var(--surface-lowest)]",
  enabled: "border-[var(--success-line)] bg-[var(--success-soft)]",
  disabled: "border-[var(--danger-line)] bg-[var(--danger-soft)]",
  warning: "border-[var(--warning-line)] bg-[var(--warning-soft)]",
} as const;

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
  const tiles: Array<{ label: string; value: number; tone: keyof typeof TILE_TONE; href?: string }> = [
    { label: "Registered accounts", value: accounts.total, tone: "neutral", href: "/super-admin/accounts" },
    {
      label: "Publishing enabled",
      value: accounts.enabled,
      tone: "enabled",
      href: "/super-admin/accounts?status=enabled",
    },
    {
      label: "Publishing disabled",
      value: accounts.disabled,
      tone: "disabled",
      href: "/super-admin/accounts?status=disabled",
    },
    {
      label: "Pending cleanups",
      value: pendingCleanups,
      tone: pendingCleanups > 0 ? "warning" : "neutral",
      href: "/super-admin/cleanups",
    },
  ];

  const attention: AttentionItem[] = [];

  if (pendingCleanups > 0) {
    attention.push({
      href: "/super-admin/cleanups",
      text: `${plural(pendingCleanups, "deleted account still has", "deleted accounts still have")} branding files queued.`,
      tone: "warning",
    });
  }
  if (accounts.disabled > 0) {
    attention.push({
      href: "/super-admin/accounts?status=disabled",
      text: `${plural(accounts.disabled, "account can't", "accounts can't")} publish.`,
      tone: "danger",
    });
  }
  if (demoPagesNeedingSeed > 0) {
    attention.push({
      href: "/super-admin/demo-pages",
      text: `${plural(demoPagesNeedingSeed, "demo page needs", "demo pages need")} seeding.`,
      tone: "warning",
    });
  }

  return (
    <div className="grid gap-6">
      <section aria-label="Account summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href ?? "/super-admin"}
            className={cn(
              "rounded-3xl border p-4 transition hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:p-6",
              TILE_TONE[tile.tone],
            )}
          >
            <p className="text-sm font-medium text-[var(--muted)]">{tile.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">{tile.value}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface-lowest)] p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Nothing needs attention right now.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {attention.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                    item.tone === "danger"
                      ? "border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger-strong)]"
                      : "border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-strong)]",
                  )}
                >
                  {item.text}
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
