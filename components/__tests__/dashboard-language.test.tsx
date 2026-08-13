import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { translations as landingTranslations } from "@/components/landing/translations";
import { createEmptyStore } from "@/lib/store";
import type { Lang, ModuleStore } from "@/lib/types";

/**
 * The dashboard is a *composed* screen: chrome rendered by `home-experience`
 * sits directly above the booking module. Every other test in this repo renders
 * one component in isolation, which is exactly why the two halves were able to
 * drift into different languages on the same screen. These tests render the
 * composition and assert the two halves are fed from one source.
 */
const captured = vi.hoisted(() => ({
  props: [] as Record<string, unknown>[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: () => undefined,
    push: () => undefined,
    refresh: () => undefined,
  }),
}));

vi.mock("@/app/login/actions", () => ({ logout: () => undefined }));
vi.mock("@/app/super-admin/actions", () => ({ stopDemoEdit: () => undefined }));

vi.mock("@/components/haab-booking-module", () => ({
  HaabBookingModule: (props: Record<string, unknown>) => {
    captured.props.push(props);
    return null;
  },
}));

const { HomeExperience } = await import("@/components/home-experience");

function configuredStore(dashboardLanguage?: Lang): ModuleStore {
  const store = createEmptyStore();
  return {
    ...store,
    setupComplete: true,
    vertical: "events",
    provider: {
      ...store.provider,
      businessName: "Ferias del Sur",
      // The owner's *clients* read Spanish. Their own workspace must not.
      language: "es",
      dashboardLanguage,
    },
  };
}

function renderDashboard(options: {
  initialLanguage: Lang;
  viewerLanguage: Lang;
  dashboardLanguage?: Lang;
  configured?: boolean;
}) {
  captured.props.length = 0;

  const configured = options.configured ?? false;
  const html = renderToStaticMarkup(
    <HomeExperience
      loggedIn
      configured={configured}
      email="owner@example.com"
      // Both props force the "app" view — the composed dashboard screen. A
      // configured owner only lands there directly while editing, so that
      // case uses the demo-edit entry point.
      initialVertical="events"
      demoEdit={
        configured ? { label: "Ferias del Sur", publicPath: "/events/ferias" } : undefined
      }
      initialLanguage={options.initialLanguage}
      viewerLanguage={options.viewerLanguage}
      dashboardStore={configured ? configuredStore(options.dashboardLanguage) : undefined}
    />,
  );

  return { html, moduleProps: captured.props[0] ?? {} };
}

/** The language a rendered chrome is actually written in, read back from it. */
function chromeLanguage(html: string): Lang | "mixed" | "none" {
  const seen = (["en", "es"] as const).filter(
    (lang) =>
      html.includes(bookingTranslations[lang].admin.heroTitle) &&
      html.includes(landingTranslations[lang].home.selectedWorkflow),
  );

  if (seen.length === 1) return seen[0];
  return seen.length === 0 ? "none" : "mixed";
}

describe("composed dashboard language", () => {
  beforeEach(() => {
    captured.props.length = 0;
  });

  it("renders the chrome in the same language it hands the module", () => {
    // The visitor-facing landing language and the signed-in viewer's language
    // are separate inputs. The dashboard belongs to the viewer, so the chrome
    // above the module must follow the same value the module is given — not
    // the landing provider's.
    const { html, moduleProps } = renderDashboard({
      initialLanguage: "es",
      viewerLanguage: "en",
    });

    expect(chromeLanguage(html)).toBe("en");
    expect(moduleProps.viewerLanguage).toBe("en");
  });

  it("follows the owner's pinned workspace language in both halves", () => {
    const { html, moduleProps } = renderDashboard({
      initialLanguage: "en",
      viewerLanguage: "en",
      dashboardLanguage: "es",
      configured: true,
    });

    expect(chromeLanguage(html)).toBe("es");
    expect(moduleProps.viewerLanguage).toBe("es");
  });

  it("gives the client-facing setting no channel to the owner's own language", () => {
    // `updateProvider("language", …)` changes what the owner's *clients* see.
    // Wiring its callback to the landing provider's `setLang` wrote the global
    // haab-lang cookie and flipped the owner's own chrome — a Spanish headline
    // over an English workspace. Only workspace-language changes report upward.
    const { moduleProps } = renderDashboard({
      initialLanguage: "en",
      viewerLanguage: "en",
    });

    expect(moduleProps).not.toHaveProperty("onLanguageChange");
    expect(typeof moduleProps.onDashboardLanguageChange).toBe("function");
  });
});
