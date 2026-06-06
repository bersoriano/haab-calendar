import { HaabBookingModule } from "@/components/haab-booking-module";
import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const screenOverview = [
  {
    title: "Setup Wizard",
    body: "Four steps collect provider details, services, and weekly availability, then publish a clean public booking page for standalone mode.",
  },
  {
    title: "Provider Workspace",
    body: "Dashboard, bookings, monthly calendar, services, and settings all sit inside one management shell with instant in-memory updates.",
  },
  {
    title: "Public Booking Flow",
    body: "Clients move through service selection, date and time, details, review, and a success screen with iCal export.",
  },
  {
    title: "Integrated Mode",
    body: "When provider data, services, availability, and existing bookings are injected, setup disappears and the module uses the parent app configuration.",
  },
];

const flowOverview = [
  "Providers configure services that can be either timed appointments or full-day reservations.",
  "The calendar and booking engine use the same weekly schedule and booking state, so availability stays consistent everywhere.",
  "Clients can create, review, reschedule, or cancel bookings from the same self-contained module.",
  "The public booking URL points to a dedicated route that reads the same standalone state or injected data.",
];

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
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[34px] bg-[rgba(248,249,250,0.94)] p-6 ring-1 ring-[rgba(255,255,255,0.68)] shadow-[0_28px_64px_rgba(25,28,29,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
            Haab Calendar
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-[var(--ink)] sm:text-5xl">
            Reusable appointment and booking management module
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            A Next.js 16 application designed as a single drop-in booking module for
            doctors, padel courts, advisors, event venues, and coworking spaces.
            It supports both timed appointments and full-day reservations from day one.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {screenOverview.map((item) => (
              <article
                key={item.title}
                className="rounded-[28px] bg-[rgba(255,255,255,0.88)] p-5 ring-1 ring-[rgba(193,198,214,0.18)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
              >
                <h2 className="text-lg font-semibold text-[var(--ink)]">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>

        <section className="rounded-[34px] bg-[rgba(248,249,250,0.94)] p-6 ring-1 ring-[rgba(255,255,255,0.68)] shadow-[0_28px_64px_rgba(25,28,29,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
            User Flow Overview
          </p>
          <div className="mt-5 space-y-4">
            {flowOverview.map((item, index) => (
              <div
                key={item}
                className="rounded-[28px] bg-[rgba(255,255,255,0.88)] p-4 ring-1 ring-[rgba(193,198,214,0.18)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Flow {index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[28px] bg-[rgba(255,255,255,0.88)] p-5 ring-1 ring-[rgba(193,198,214,0.18)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Reusability notes
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              The exported <code className="rounded bg-white px-1.5 py-0.5 text-[var(--ink)]">HaabBookingModule</code>{" "}
              keeps its own standalone store, but it also accepts injected provider,
              service, availability, and booking data so a host application can skip
              setup and control the surrounding experience.
            </p>
          </div>
        </section>
      </section>

      <HaabBookingModule />
    </main>
  );
}
