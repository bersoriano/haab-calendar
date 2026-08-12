import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";

export function AdminHero({ lang }: { lang: Lang }) {
  return (
    <section className="py-2 sm:py-3">
      <h1 className="mx-auto max-w-4xl text-balance text-center text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl">
        {bookingTranslations[lang].admin.heroTitle}
      </h1>
    </section>
  );
}
