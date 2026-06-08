import { HaabBookingModule } from "@/components/haab-booking-module";
import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email || claims.email;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 rounded-[28px] bg-[rgba(248,249,250,0.94)] p-4 shadow-[0_18px_44px_rgba(25,28,29,0.06)] ring-1 ring-[rgba(255,255,255,0.68)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Provider account
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--ink)]">{email}</p>
        </div>
        <form action={logout}>
          <button
            className="rounded-2xl border border-[rgba(193,198,214,0.55)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary)]"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </header>
      <HaabBookingModule />
    </main>
  );
}
