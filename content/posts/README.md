# Blog posts

The blog at `/blog` reads this folder. With no post folders here, it says "No posts yet", stays out of the sitemap and asks search engines not to index it.

## Add a post

Create `content/posts/<slug>/en.mdx` and `content/posts/<slug>/es.mdx`. Both languages are required, with the same `date` and `draft`. `npm test` checks this and compiles every post.

```mdx
---
title: "How to stop double bookings"
description: "One sentence under 160 characters, used for search results."
date: 2026-11-04
draft: true
---

Start with a paragraph. The page already shows the title and description.

## Section headings use two hashes

Link to site pages with plain paths, like [live examples](/gallery). They keep the post's language.
```

Optional frontmatter: `seoTitle` (a shorter title for search results) and `updated` (YYYY-MM-DD).

- **Drafts** (`draft: true`) show only under `npm run dev`. Set `draft: false` in both files to publish.
- **Slugs** are lowercase words joined by hyphens, and become `/blog/<slug>`.
- **Prose:** raw `<` and `{` are read as MDX, so put them in backticks.
- **Images** go in `public/blog/<slug>/` and are referenced as `/blog/<slug>/image.jpg`. Remote images are rejected by the tests.
- **`<Takeaway>…</Takeaway>`** renders a boxed key takeaway. **`<CreatePageCta />`** renders the "Create your page" button. GFM tables and footnotes work too.
