import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ReactNode } from "react";

import { blogCopy } from "@/components/blog/copy";
import { lpButtonClass } from "@/components/landing/primitives";
import { translations } from "@/components/landing/translations";
import { localizePostHref } from "@/lib/posts";
import type { Lang } from "@/lib/types";
import styles from "./Blog.module.css";

/**
 * How post Markdown maps to site markup. Internal links follow the post's
 * language (`/gallery` becomes `/gallery?lang=es` in a Spanish post), external
 * links open safely, and images are local files under `public/` (the tests
 * reject remote images: a post makes no third-party image requests).
 * `<Takeaway>` is the boxed summary that can open a post. `<CreatePageCta />`
 * is the button to the landing page, which owns setup, under the words the
 * rest of the site uses for that action.
 */
export function postComponents(lang: Lang): MDXComponents {
  return {
    a: ({ href = "", ...props }: ComponentProps<"a">) => {
      if (/^https?:\/\//.test(href))
        return <a href={href} rel="noopener noreferrer" {...props} />;
      const internal = href.startsWith("/") && !href.startsWith("//");
      return <a href={internal ? localizePostHref(href, lang) : href} {...props} />;
    },
    img: ({ alt = "", ...props }: ComponentProps<"img">) => (
      // A post's images are ordinary files of unknown size, so next/image,
      // which needs their dimensions, cannot take them.
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} loading="lazy" decoding="async" {...props} />
    ),
    Takeaway: ({ children }: { children?: ReactNode }) => (
      <div className={styles.takeaway} role="note">
        <p className={styles.label}>{blogCopy[lang].keyTakeaway}</p>
        {children}
      </div>
    ),
    CreatePageCta: () => (
      <p className={styles.cta}>
        <a
          href={`/?lang=${lang}`}
          className={lpButtonClass({ variant: "primary", size: "card" })}
          data-landing-action="create_page"
        >
          {translations[lang].nav.createPageLong} →
        </a>
      </p>
    ),
    table: (props: ComponentProps<"table">) => (
      <div className={styles.tableWrap}>
        <table {...props} />
      </div>
    ),
  };
}
