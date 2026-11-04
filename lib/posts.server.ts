import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import * as runtime from "react/jsx-runtime";

import { evaluate } from "@mdx-js/mdx";
import type { MDXContent } from "mdx/types";
import remarkGfm from "remark-gfm";

import type { Lang } from "@/lib/types";
import {
  isValidSlug,
  isVisible,
  parsePost,
  sortPosts,
  type Post,
} from "./posts";

const production = process.env.NODE_ENV === "production";
// Spelled out, not POSTS_DIR: the bundler traces this call, and a path it cannot
// read statically makes it trace the whole project into the server bundle.
const root = path.join(process.cwd(), "content", "posts");

async function readPost(slug: string, lang: Lang): Promise<Post | null> {
  if (!isValidSlug(slug)) return null;
  try {
    const raw = await fs.readFile(path.join(root, slug, `${lang}.mdx`), "utf8");
    return parsePost(raw, slug, lang);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function listSlugs() {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && isValidSlug(entry.name))
      .map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/** Visible posts in one language, newest first. Drafts show in development only. */
export const getPosts = cache(async (lang: Lang) => {
  const posts = await Promise.all(
    (await listSlugs()).map((slug) => readPost(slug, lang)),
  );
  return sortPosts(
    posts.filter((post): post is Post => !!post && isVisible(post, production)),
  );
});

export const getPost = cache(async (slug: string, lang: Lang) => {
  const post = await readPost(slug, lang);
  return post && isVisible(post, production) ? post : null;
});

// Posts are trusted repo content; compile each once per server instance in
// production, and on every request in development so edits show on reload.
const compiled = new Map<string, Promise<MDXContent>>();

// GFM footnotes (`[^id]`) render as a visible "Sources" list in the post's language.
const FOOTNOTES: Record<Lang, { label: string; back: string }> = {
  en: { label: "Sources", back: "Back to reference" },
  es: { label: "Fuentes", back: "Volver a la referencia" },
};

export function compilePost(post: Post): Promise<MDXContent> {
  const key = `${post.slug}/${post.lang}`;
  const hit = production ? compiled.get(key) : undefined;
  if (hit) return hit;
  const result = evaluate(post.body, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    remarkRehypeOptions: {
      footnoteLabel: FOOTNOTES[post.lang].label,
      footnoteLabelProperties: {},
      footnoteBackLabel: (index, rereference) =>
        `${FOOTNOTES[post.lang].back} ${index + 1}${rereference > 1 ? `-${rereference}` : ""}`,
    },
  }).then((module) => module.default);
  if (production) compiled.set(key, result);
  return result;
}
