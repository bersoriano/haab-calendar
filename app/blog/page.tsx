import type { Metadata } from "next";
import Link from "next/link";

import { BlogShell } from "@/components/blog/blog-shell";
import { blogCopy } from "@/components/blog/copy";
import { BLOG_PATH, buildBlogJsonLd, buildBlogMetadata, postPath } from "@/components/blog/seo";
import { Eyebrow, lpBody } from "@/components/landing/primitives";
import { serializeJsonLd } from "@/components/landing/seo";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import { getServerLanguage } from "@/lib/language/server";
import { formatPostDate } from "@/lib/posts";
import { getPosts } from "@/lib/posts.server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import styles from "./Blog.module.css";

type Props = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { lang: explicit } = await searchParams;
  const lang = await getServerLanguage(explicit);
  const posts = await getPosts(lang);
  return buildBlogMetadata(lang, posts.some((post) => !post.draft));
}

export default async function Blog({ searchParams }: Props) {
  const { lang: explicit } = await searchParams;
  const [lang, supabase] = await Promise.all([getServerLanguage(explicit), createClient()]);
  const [posts, { data }] = await Promise.all([getPosts(lang), supabase.auth.getClaims()]);
  const t = blogCopy[lang];

  return (
    <BlogShell
      lang={lang}
      loggedIn={Boolean(data?.claims)}
      loginHref={withAuthReturnLanguage(`/login?next=${BLOG_PATH}`, lang)}
      path={BLOG_PATH}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildBlogJsonLd(lang, posts)) }}
      />
      <main lang={lang} className={cn(lpBody, "flex-1 bg-white")}>
        <div className={styles.page}>
          <nav aria-label={t.breadcrumb} className={styles.breadcrumbs}>
            <Link href={`/?lang=${lang}`}>{t.home}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{t.blog}</span>
          </nav>
          <Eyebrow>{t.blog}</Eyebrow>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.lead}>{t.description}</p>
          {posts.length ? (
            <ol className={styles.list}>
              {posts.map((post) => (
                <li key={post.slug}>
                  {post.draft && <p className={styles.label}>{t.draft}</p>}
                  <h2>
                    <Link href={`${postPath(post.slug)}?lang=${lang}`}>{post.title}</Link>
                  </h2>
                  <p>{post.description}</p>
                  <time className={styles.date} dateTime={post.date}>
                    {formatPostDate(post.date, lang)}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.empty}>{t.empty}</p>
          )}
        </div>
      </main>
    </BlogShell>
  );
}
