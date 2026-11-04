import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FEATURED_POST_SLUG, FeaturedPost } from "@/components/landing/featured-post";
import { LanguageProvider } from "@/components/landing/language-provider";
import { translations } from "@/components/landing/translations";
import { POSTS_DIR, parsePost } from "@/lib/posts";
import type { Lang } from "@/lib/types";

const LANGS: Lang[] = ["en", "es"];

function readPost(lang: Lang) {
  const file = path.join(process.cwd(), POSTS_DIR, FEATURED_POST_SLUG, `${lang}.mdx`);
  return parsePost(fs.readFileSync(file, "utf8"), FEATURED_POST_SLUG, lang);
}

describe("landing featured post", () => {
  it.each(LANGS)("links to the post in %s", (lang) => {
    const html = renderToStaticMarkup(
      <LanguageProvider initialLang={lang}>
        <FeaturedPost />
      </LanguageProvider>,
    );

    expect(html).toContain(`href="/blog/${FEATURED_POST_SLUG}?lang=${lang}"`);
  });

  // The landing page cannot read the post, so it repeats the title. A renamed,
  // removed or unpublished post has to fail here, not become a dead link.
  it.each(LANGS)("names a published post by its own title in %s", (lang) => {
    const post = readPost(lang);

    expect(post.draft).toBe(false);
    expect(translations[lang].featuredPost.title).toBe(post.title);
  });
});
