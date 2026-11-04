import type { NextConfig } from "next";

// Blog posts are read from disk at request time; ship them with these routes.
const posts = ["./content/posts/**/*.mdx"];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/blog": posts,
    "/blog/*": posts,
    "/sitemap.xml": posts,
  },
};

export default nextConfig;
