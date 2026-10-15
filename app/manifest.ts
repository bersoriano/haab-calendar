import type { MetadataRoute } from "next";

import { SITE_NAME } from "@/lib/site-metadata";

/**
 * Name, icons and colours for "Add to Home Screen" and for the platforms that
 * read a manifest to pick a site's icon. The PNGs are rendered from
 * app/icon.svg by scripts/generate-icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Haab",
    description:
      "Booking software for small businesses: one booking link, live availability, no client accounts.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f9f7",
    theme_color: "#1a6be0",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
