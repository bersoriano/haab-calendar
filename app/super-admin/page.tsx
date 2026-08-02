import Link from "next/link";
import { notFound } from "next/navigation";

import { logout } from "@/app/login/actions";
import { UserPublicationTable } from "@/components/super-admin/UserPublicationTable";
import {
  listManagedUsers,
  SuperAdminAccessError,
} from "@/lib/supabase/publication";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  let users;

  try {
    users = await listManagedUsers();
  } catch (error) {
    if (error instanceof SuperAdminAccessError) {
      notFound();
    }

    throw error;
  }

  const enabledCount = users.filter((user) => user.publishingEnabled).length;
  const disabledCount = users.length - enabledCount;

  return (
    <main className="min-h-full bg-[var(--surface)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-violet-700">
              Super admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              User publication control
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
              Manage whether each registered account can expose public URLs and
              accept public booking actions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-50"
            >
              Back to Haab Calendar
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <section
          aria-label="Account summary"
          className="my-8 grid gap-4 sm:grid-cols-3"
        >
          <SummaryCard label="Registered accounts" value={users.length} />
          <SummaryCard label="Publishing enabled" value={enabledCount} tone="enabled" />
          <SummaryCard label="Publishing disabled" value={disabledCount} tone="disabled" />
        </section>

        <UserPublicationTable initialUsers={users} />
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "enabled" | "disabled";
}) {
  const toneClass =
    tone === "enabled"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "disabled"
        ? "border-rose-200 bg-rose-50"
        : "border-[var(--line)] bg-white";

  return (
    <div className={`rounded-3xl border p-6 ${toneClass}`}>
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
        {value}
      </p>
    </div>
  );
}
