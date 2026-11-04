import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { postComponents } from "@/app/blog/mdx";
import {
  POSTS_DIR,
  POST_LANGUAGES,
  formatPostDate,
  isValidSlug,
  isVisible,
  localizePostHref,
  parsePost,
  sortPosts,
  type Post,
} from "@/lib/posts";
import { compilePost } from "@/lib/posts.server";

const raw = (frontmatter: string, body = "Body") => `---\n${frontmatter}\n---\n${body}`;
const valid = 'title: "A title"\ndescription: "A description"\ndate: 2026-10-17';

describe("parsePost", () => {
  it("reads the frontmatter and leaves the body", () => {
    expect(parsePost(raw(valid, "Hello"), "a-post", "es")).toMatchObject({
      slug: "a-post",
      lang: "es",
      title: "A title",
      description: "A description",
      date: "2026-10-17",
      draft: false,
      body: "Hello",
    });
  });

  it("accepts an optional search title and updated date", () => {
    const post = parsePost(raw(`${valid}\nseoTitle: "Short"\nupdated: 2026-10-18`), "a", "en");
    expect(post.seoTitle).toBe("Short");
    expect(post.updated).toBe("2026-10-18");
  });

  it.each([
    ["a missing title", 'description: "x"\ndate: 2026-01-02', /title/],
    ["a missing description", 'title: "x"\ndate: 2026-01-02', /description/],
    ["an empty search title", `${valid}\nseoTitle: " "`, /seoTitle/],
    ["a date that is not a date", 'title: "x"\ndescription: "x"\ndate: Jan 2', /date/],
    ["an impossible date", 'title: "x"\ndescription: "x"\ndate: "2026-02-30"', /date/],
    ["an update before the date", `${valid}\nupdated: 2026-10-16`, /updated/],
    ["a draft flag that is not a boolean", `${valid}\ndraft: "yes"`, /draft/],
  ])("rejects %s", (_name, frontmatter, message) => {
    expect(() => parsePost(raw(frontmatter), "a", "en")).toThrow(message);
  });

  it("rejects a bad slug and a file with no frontmatter", () => {
    expect(() => parsePost(raw(valid), "Bad_Slug", "en")).toThrow(/slug/);
    expect(() => parsePost("No frontmatter", "a", "en")).toThrow(/frontmatter/);
  });
});

describe("post helpers", () => {
  it("accepts only slugs that are safe in a path", () => {
    expect(isValidSlug("two-words")).toBe(true);
    for (const slug of ["../secrets", "a/b", "UPPER", "-a", ""]) {
      expect(isValidSlug(slug)).toBe(false);
    }
  });

  it("shows drafts in development only", () => {
    expect(isVisible({ draft: true }, true)).toBe(false);
    expect(isVisible({ draft: true }, false)).toBe(true);
    expect(isVisible({ draft: false }, true)).toBe(true);
  });

  it("sorts newest first, with the slug breaking ties", () => {
    const sorted = sortPosts([
      { slug: "b", date: "2026-01-01" },
      { slug: "c", date: "2026-02-01" },
      { slug: "a", date: "2026-01-01" },
    ]);
    expect(sorted.map((post) => post.slug)).toEqual(["c", "a", "b"]);
  });

  it("keeps a link's own query and fragment when it adds the language", () => {
    expect(localizePostHref("/gallery", "es")).toBe("/gallery?lang=es");
    expect(localizePostHref("/?vertical=healthcare#how", "es")).toBe("/?vertical=healthcare&lang=es#how");
  });

  it("formats a date in the post's language, in UTC", () => {
    expect(formatPostDate("2026-11-01", "en")).toBe("November 1, 2026");
    expect(formatPostDate("2026-11-01", "es")).toBe("1 de noviembre de 2026");
  });
});

describe("rendering a post", () => {
  const post = (lang: "en" | "es", body: string): Post => ({
    slug: `render-test-${lang}`,
    lang,
    title: "T",
    description: "D",
    date: "2026-01-01",
    draft: false,
    body,
  });

  const render = async (lang: "en" | "es", body: string) => {
    const Content = await compilePost(post(lang, body));
    return renderToStaticMarkup(createElement(Content, { components: postComponents(lang) }));
  };

  it("renders GFM tables in a scroller and footnotes under a label in the post's language", async () => {
    const html = await render("es", "| A |\n| --- |\n| 1 |\n\nUna fuente.[^1]\n\n[^1]: Nota.");
    expect(html).toContain("<table>");
    expect(html).toMatch(/tableWrap/);
    expect(html).toContain("Fuentes");
    expect(html).toContain("Volver a la referencia");
  });

  it("carries the post's language on site links and leaves external ones alone", async () => {
    const html = await render("es", "[a](/gallery) [b](https://example.com/x)");
    expect(html).toContain('href="/gallery?lang=es"');
    expect(html).toContain('href="https://example.com/x" rel="noopener noreferrer"');
  });

  it("renders the takeaway box in the post's language", async () => {
    expect(await render("es", "<Takeaway>Algo.</Takeaway>")).toContain("Idea clave");
  });
});

// Holds for every post anyone adds. With no posts yet there is nothing to check.
describe("the posts in this repository", () => {
  const root = path.join(process.cwd(), POSTS_DIR);
  const slugs = fs.existsSync(root)
    ? fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];
  const read = (slug: string, lang: "en" | "es") => {
    const file = path.join(root, slug, `${lang}.mdx`);
    return parsePost(fs.readFileSync(file, "utf8"), slug, lang);
  };

  it("exist in both languages, on the same date and draft state", () => {
    for (const slug of slugs) {
      const [en, es] = POST_LANGUAGES.map((lang) => read(slug, lang));
      expect(es.date, slug).toBe(en.date);
      expect(es.draft, slug).toBe(en.draft);
    }
  });

  it("compile and use only local images", async () => {
    for (const slug of slugs) {
      for (const lang of POST_LANGUAGES) {
        const post = read(slug, lang);
        await expect(compilePost(post), `${slug}/${lang}`).resolves.toBeTypeOf("function");
        expect(post.body, `${slug}/${lang}`).not.toMatch(/!\[[^\]]*\]\(\s*(https?:)?\/\//);
        expect(post.body, `${slug}/${lang}`).not.toMatch(/<img[^>]+src=["'](https?:)?\/\//);
      }
    }
  });
});
