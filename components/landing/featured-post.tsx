"use client";

import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";
import { Eyebrow, LpButton, lpBody, lpDisplay, lpMono } from "./primitives";
import { Reveal } from "./reveal";

/** A test checks this post exists, is published, and has the title shown here. */
export const FEATURED_POST_SLUG = "stop-answering-when-are-you-free";

/**
 * A short pitch for one blog post. The illustration replays the exchange the
 * post opens with, and is aria-hidden: the paragraph says the same in words.
 */
export function FeaturedPost() {
  const { lang, t } = useLanguage();
  const copy = t.featuredPost;

  return (
    <section
      id="blog"
      className={cn(lpBody, "scroll-mt-24 bg-[var(--lp-paper)] px-5 py-[72px] sm:px-8 lg:py-28")}
    >
      <div className="mx-auto grid max-w-[1200px] items-center gap-7 lg:grid-cols-2 lg:gap-[72px]">
        <div className="flex flex-col gap-3.5 lg:gap-[22px]">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h2
            className={cn(
              lpDisplay,
              "text-balance text-[36px] font-bold leading-[1.05] tracking-[-0.035em] text-[var(--lp-ink)] sm:text-[44px] lg:text-[54px] lg:leading-[1.04]",
            )}
          >
            {copy.title}
          </h2>
          <p className="text-[16.5px] leading-[1.6] text-[var(--lp-muted)] lg:text-[18px]">
            {copy.body}
          </p>
          <LpButton
            data-landing-action="read_post"
            variant="outline-ink"
            size="card"
            arrow
            href={`/blog/${FEATURED_POST_SLUG}?lang=${lang}`}
            className="mt-1 sm:self-start sm:px-[26px]"
          >
            {copy.cta}
          </LpButton>
        </div>
        <Reveal>
          <div
            aria-hidden="true"
            className="flex flex-col gap-2.5 rounded-[22px] border border-[var(--lp-line)] bg-white p-5 sm:rounded-[28px] sm:p-8"
          >
            <p className={cn(lpMono, "text-center text-[12.5px] text-[var(--lp-muted)]")}>
              {copy.chat.time}
            </p>
            <p className="max-w-[85%] self-start rounded-[16px] rounded-bl-[4px] bg-[#eef3f2] px-3.5 py-2.5 text-[15px] leading-[1.4] text-[var(--lp-ink)]">
              {copy.chat.asks}
            </p>
            <p className="max-w-[85%] self-end rounded-[16px] rounded-br-[4px] bg-[var(--lp-teal-700)] px-3.5 py-2.5 text-[15px] leading-[1.4] text-white">
              {copy.chat.offer}
            </p>
            <p className="max-w-[85%] self-start rounded-[16px] rounded-bl-[4px] bg-[#eef3f2] px-3.5 py-2.5 text-[15px] leading-[1.4] text-[var(--lp-ink)]">
              {copy.chat.counter}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
