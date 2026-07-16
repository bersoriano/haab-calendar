const ADMIN_HERO_TEXT = "Haab Calendar - The most powerful booking system";

export function AdminHero() {
  return (
    <section className="py-2 sm:py-3">
      <h1 className="mx-auto max-w-4xl text-balance text-center text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">
        {ADMIN_HERO_TEXT}
      </h1>
    </section>
  );
}
