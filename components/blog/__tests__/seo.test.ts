import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildBlogJsonLd, buildBlogMetadata, buildPostJsonLd, buildPostMetadata } from "@/components/blog/seo";
import type { PostMeta } from "@/lib/posts";

const post: PostMeta = {
  slug: "double-bookings",
  lang: "es",
  title: "Un título largo",
  seoTitle: "Título corto",
  description: "Una descripción.",
  date: "2026-10-01",
  updated: "2026-10-02",
  draft: false,
};

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";
});

afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
});

describe("blog metadata", () => {
  it("names the version served and the full hreflang set", () => {
    const { alternates } = buildBlogMetadata("es", true);
    expect(alternates?.canonical).toBe("https://haabcalendar.com/blog?lang=es");
    expect(alternates?.languages).toEqual({
      en: "https://haabcalendar.com/blog",
      es: "https://haabcalendar.com/blog?lang=es",
      "x-default": "https://haabcalendar.com/blog",
    });
  });

  it("stays out of search results until there is a post to read", () => {
    expect(buildBlogMetadata("en", false).robots).toEqual({ index: false, follow: true });
    expect(buildBlogMetadata("en", true).robots).toBeUndefined();
  });
});

describe("post metadata", () => {
  it("uses the search title, the post's own canonical and the article type", () => {
    const meta = buildPostMetadata(post);
    expect(meta.title).toEqual({ absolute: "Título corto · Haab Calendar" });
    expect(meta.alternates?.canonical).toBe("https://haabcalendar.com/blog/double-bookings?lang=es");
    expect(meta.alternates?.languages).toMatchObject({
      en: "https://haabcalendar.com/blog/double-bookings",
    });
    expect(meta.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-10-01",
      modifiedTime: "2026-10-02",
    });
    expect(meta.robots).toBeUndefined();
  });

  it("keeps a draft out of search results", () => {
    expect(buildPostMetadata({ ...post, draft: true }).robots).toEqual({ index: false, follow: false });
  });
});

describe("blog structured data", () => {
  it("describes a post in its own language, published by the site's organization", () => {
    const graph = buildPostJsonLd(post)["@graph"] as Record<string, unknown>[];
    const article = graph.find((node) => node["@type"] === "BlogPosting");
    expect(article).toMatchObject({
      headline: "Un título largo",
      datePublished: "2026-10-01",
      dateModified: "2026-10-02",
      inLanguage: "es",
      url: "https://haabcalendar.com/blog/double-bookings?lang=es",
      publisher: { "@id": "https://haabcalendar.com/#organization" },
    });
  });

  it("lists published posts only", () => {
    const graph = buildBlogJsonLd("en", [
      { ...post, lang: "en" },
      { ...post, lang: "en", slug: "hidden", draft: true },
    ])["@graph"] as Record<string, unknown>[];
    const blog = graph.find((node) => node["@type"] === "Blog");
    expect(blog?.blogPost).toEqual([
      { "@id": "https://haabcalendar.com/blog/double-bookings#article" },
    ]);
  });
});
