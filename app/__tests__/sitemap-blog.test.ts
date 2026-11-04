import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Post } from "@/lib/posts";

const posts = vi.hoisted(() => ({ list: [] as Post[] }));

vi.mock("@/lib/posts.server", () => ({ getPosts: async () => posts.list }));

import sitemap from "@/app/sitemap";

const post = (overrides: Partial<Post>): Post => ({
  slug: "double-bookings",
  lang: "en",
  title: "T",
  description: "D",
  date: "2026-10-01",
  draft: false,
  body: "",
  ...overrides,
});

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://haabcalendar.com";
});

afterEach(() => {
  posts.list = [];
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
});

describe("the blog in sitemap.xml", () => {
  it("leaves the blog out while it has nothing to read", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.includes("/blog"))).toBe(false);
  });

  it("leaves out a blog that has only drafts", async () => {
    posts.list = [post({ draft: true })];
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.includes("/blog"))).toBe(false);
  });

  it("lists the blog and each published post in both languages, with hreflang", async () => {
    posts.list = [post({ updated: "2026-10-05" }), post({ slug: "hidden", draft: true })];
    const entries = (await sitemap()).filter((entry) => entry.url.includes("/blog"));

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://haabcalendar.com/blog",
      "https://haabcalendar.com/blog?lang=es",
      "https://haabcalendar.com/blog/double-bookings",
      "https://haabcalendar.com/blog/double-bookings?lang=es",
    ]);
    expect(entries[3].lastModified).toBe("2026-10-05");
    expect(entries[3].alternates?.languages).toEqual({
      en: "https://haabcalendar.com/blog/double-bookings",
      es: "https://haabcalendar.com/blog/double-bookings?lang=es",
      "x-default": "https://haabcalendar.com/blog/double-bookings",
    });
  });
});
