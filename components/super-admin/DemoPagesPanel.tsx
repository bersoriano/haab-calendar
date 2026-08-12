import Link from "next/link";

import { startDemoEdit } from "@/app/super-admin/actions";
import type { DemoPageSummary } from "@/lib/supabase/demo-edit";

export function DemoPagesPanel({ demoPages }: { demoPages: DemoPageSummary[] }) {
  return (
    <section aria-label="Demo pages" className="my-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
          Demo pages
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
          The public example pages linked from the landing page. Editing one
          opens the normal dashboard against that page; every save writes to it
          until you exit demo editing.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {demoPages.map((demo) => (
          <article
            key={demo.key}
            className="flex flex-col rounded-3xl border border-[var(--line)] bg-white p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-violet-700">
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
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
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
