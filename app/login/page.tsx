import { AuthForm } from "@/components/auth/AuthForm";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
    next?: string;
    status?: string;
  }>;
};

function getSafeNextPath(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  if (next.startsWith("/login") || next.startsWith("/auth")) {
    return "/";
  }

  return next;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);
  const message = params.message;
  const messageStatus = params.status === "success" ? "success" : "error";

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[1120px] items-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
            Haab Calendar
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold text-[var(--ink)] sm:text-5xl">
            Sign in to manage your booking workspace.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
            Use your provider account to configure services, availability, bookings,
            and the public booking page.
          </p>
        </div>
        <section className="rounded-[28px] bg-[rgba(248,249,250,0.94)] p-6 shadow-[0_28px_64px_rgba(25,28,29,0.08)] ring-1 ring-[rgba(255,255,255,0.68)] sm:p-8">
          <h2 className="text-2xl font-semibold text-[var(--ink)]">Provider login</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Email and password authentication is handled by Supabase Auth.
          </p>
          {message ? (
            <p
              className={`mt-5 rounded-2xl px-4 py-3 text-sm leading-6 ${
                messageStatus === "success"
                  ? "bg-[rgba(0,191,165,0.12)] text-[var(--action-teal-deep)]"
                  : "bg-[rgba(219,68,55,0.1)] text-[#8f1d15]"
              }`}
            >
              {message}
            </p>
          ) : null}
          <AuthForm nextPath={nextPath} />
        </section>
      </section>
    </main>
  );
}
