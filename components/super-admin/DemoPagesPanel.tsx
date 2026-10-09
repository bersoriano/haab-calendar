import Link from "next/link";

import { startDemoEdit } from "@/app/super-admin/actions";
import {
  SUPER_ADMIN_ACCENT_CLASS,
  SUPER_ADMIN_ACCENT_TEXT_CLASS,
} from "@/components/app-shell/super-admin-accent";
import { cn } from "@/lib/utils";
import type { DemoPageSummary } from "@/lib/supabase/demo-edit";

export function DemoPagesPanel({ demoPages }: { demoPages: DemoPageSummary[] }) {
  return (
    <section aria-label="Demo pages">
      {/* The page header names the section; this says what editing does. */}
      <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Editing a demo opens the normal dashboard against that page; every save
        writes to it until you exit demo editing.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {demoPages.map((demo) => (
          <article
            key={demo.key}
            className="flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--surface-lowest)] p-5"
          >
            <p className={cn("text-xs font-semibold uppercase tracking-[0.08em]", SUPER_ADMIN_ACCENT_TEXT_CLASS)}>
              {demo.vertical}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">
              {demo.businessName ?? demo.label}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{demo.publicPath}</p>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {demo.status === "ready"
                ? `${demo.serviceCount} service${demo.serviceCount === 1 ? "" : "s"}`
                : demo.status === "missing"
                  ? "Not seeded — run npm run seed:examples"
                  : "Owned by the old shared demo account — re-run npm run seed:examples"}
            </p>

            <div className="mt-auto flex items-center gap-3 pt-5">
              <form action={startDemoEdit}>
                <input type="hidden" name="demoKey" value={demo.key} />
                <button
                  type="submit"
                  disabled={demo.status !== "ready"}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                    SUPER_ADMIN_ACCENT_CLASS,
                  )}
                >
                  Edit demo
                </button>
              </form>
              <Link
                href={demo.publicPath}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                View live
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
