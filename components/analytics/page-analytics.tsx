"use client";

/**
 * Mounted once in the root layout. Sends one Google Analytics page_view per
 * pathname (initial load included); nothing on pages outside ANALYTICS_PATHS,
 * where the client never started or has disabled itself.
 *
 * The generic section_view / cta_click listeners below read the shared
 * markup contract (data-analytics-section, data-cta). This site does not use
 * that markup: landing sections and CTAs carry data-landing-* attributes and
 * are reported by lib/analytics/landing-browser.ts, so those listeners stay
 * idle. Do not add data-analytics-section/data-cta to landing markup, or
 * section_view and cta_click would be counted twice.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { AnalyticsParams } from "@/lib/analytics/analytics";
import { analyticsEnabled, track, trackPageView } from "@/lib/analytics/analytics.client";
import { LANDING_PATHS } from "@/lib/analytics/landing-policy";

/** Page grouping and language, registered as GA custom dimensions. */
function pageParams(pathname: string): AnalyticsParams {
  const page_type = LANDING_PATHS.includes(pathname) ? "landing"
    : pathname === "/privacy" || pathname === "/terms" ? "legal" : "supporting";
  // The server resolves the language before the first byte (cookie, ?lang,
  // Accept-Language, or the path on the doctors pages) and writes it here.
  const locale = document.documentElement.lang;
  return { page_type, ...(["en", "es"].includes(locale) && { locale }) };
}

export function PageAnalytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!analyticsEnabled()) return;
    // Refs survive React Strict Mode's double effect, so dev sends one view too.
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      trackPageView(pageParams(pathname));
    }

    const seen = new Set<string>();
    const observed = new WeakSet<Element>();
    const sections = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.analyticsSection;
        if (!id || seen.has(id) || !entry.isIntersecting) continue;
        // Tall sections never reach a high ratio: also accept half a screen visible.
        if (entry.intersectionRatio >= 0.25 || entry.intersectionRect.height >= window.innerHeight * 0.5) {
          seen.add(id);
          track("section_view", { section_id: id });
        }
      }
    }, { threshold: [0, 0.1, 0.25, 0.5] });
    function observeNew() {
      document.querySelectorAll("[data-analytics-section]").forEach((element) => {
        if (!observed.has(element)) { observed.add(element); sections.observe(element); }
      });
    }
    // Streamed or client-rendered sections can appear after this effect.
    const mutations = new MutationObserver(observeNew);
    mutations.observe(document.body, { childList: true, subtree: true });
    observeNew();

    function click(event: MouseEvent) {
      if (event.type === "auxclick" && event.button !== 1) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-cta]") : null;
      if (!target) return;
      const area = target.closest<HTMLElement>("[data-cta-location], [data-analytics-section], header, footer, nav");
      const href = target instanceof HTMLAnchorElement ? target.href : "";
      let link_domain: string | undefined;
      try {
        const url = new URL(href);
        if (/^https?:$/.test(url.protocol) && url.origin !== window.location.origin) link_domain = url.hostname;
      } catch { /* empty or not a URL */ }
      track("cta_click", {
        cta_type: target.dataset.cta,
        cta_location: area?.dataset.ctaLocation || area?.dataset.analyticsSection || area?.tagName.toLowerCase() || "page",
        link_domain,
      });
    }
    document.addEventListener("click", click, true);
    document.addEventListener("auxclick", click, true);

    return () => {
      sections.disconnect();
      mutations.disconnect();
      document.removeEventListener("click", click, true);
      document.removeEventListener("auxclick", click, true);
    };
  }, [pathname]);

  return null;
}
