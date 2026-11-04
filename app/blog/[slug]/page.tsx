import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogShell } from "@/components/blog/blog-shell";
import { blogCopy } from "@/components/blog/copy";
import { BLOG_PATH, buildPostJsonLd, buildPostMetadata, postPath } from "@/components/blog/seo";
import { lpBody } from "@/components/landing/primitives";
import { serializeJsonLd } from "@/components/landing/seo";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import { getServerLanguage } from "@/lib/language/server";
import { formatPostDate } from "@/lib/posts";
import { compilePost, getPost } from "@/lib/posts.server";
import { SITE_NAME } from "@/lib/site-metadata";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import styles from "../Blog.module.css";
import { postComponents } from "../mdx";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, { lang: explicit }] = await Promise.all([params, searchParams]);
  const lang = await getServerLanguage(explicit);
  const post = await getPost(slug, lang);
  if (!post) notFound();
  return buildPostMetadata(post);
}

export default async function BlogPost({ params, searchParams }: Props) {
  const [{ slug }, { lang: explicit }] = await Promise.all([params, searchParams]);
  const [lang, supabase] = await Promise.all([getServerLanguage(explicit), createClient()]);
  const post = await getPost(slug, lang);
  if (!post) notFound();
  const [Content, { data }] = await Promise.all([compilePost(post), supabase.auth.getClaims()]);
  const t = blogCopy[lang];
  const path = postPath(post.slug);

  return (
    <BlogShell
      lang={lang}
      loggedIn={Boolean(data?.claims)}
      loginHref={withAuthReturnLanguage(`/login?next=${path}`, lang)}
      path={path}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildPostJsonLd(post)) }}
      />
      <main lang={lang} className={cn(lpBody, "flex-1 bg-white")}>
        <div className={styles.page}>
          <Link className={styles.back} href={`${BLOG_PATH}?lang=${lang}`}>
            {t.allPosts}
          </Link>
          <nav aria-label={t.breadcrumb} className={styles.breadcrumbs}>
            <Link href={`/?lang=${lang}`}>{t.home}</Link>
            <span aria-hidden="true">/</span>
            <Link href={`${BLOG_PATH}?lang=${lang}`}>{t.blog}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{post.title}</span>
          </nav>
          <article className={styles.article}>
            <header className={styles.header}>
              {post.draft && <p className={styles.label}>{t.draft}</p>}
              <h1 className={styles.title}>{post.title}</h1>
              <p className={styles.lead}>{post.description}</p>
              <p className={styles.byline}>
                <span>
                  {t.by} <Link rel="author" href={`/?lang=${lang}`}>{SITE_NAME}</Link>
                </span>
                <span>
                  {t.published} <time dateTime={post.date}>{formatPostDate(post.date, lang)}</time>
                </span>
                {post.updated && post.updated !== post.date && (
                  <span>
                    {t.updated} <time dateTime={post.updated}>{formatPostDate(post.updated, lang)}</time>
                  </span>
                )}
              </p>
            </header>
            <div className={styles.prose}>
              <Content components={postComponents(lang)} />
            </div>
          </article>
        </div>
      </main>
    </BlogShell>
  );
}
