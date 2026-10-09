import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { createEmptyStore } from "@/lib/store";
import type { Lang, ModuleStore } from "@/lib/types";

/**
 * The dashboard is a composed screen: shell chrome around the booking module.
 * These render the composition and assert both halves are fed from one source
 * — the URL for the section, the owner's workspace language for the words.
 */
const captured = vi.hoisted(() => ({
  props: [] as Record<string, unknown>[],
  switchProps: [] as Record<string, unknown>[],
  pathname: "/dashboard",
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => captured.pathname,
  useSearchParams: () => new URLSearchParams(captured.search),
}));
vi.mock("@/components/provider/BusinessTypeSwitch", () => ({
  BusinessTypeSwitch: (props: Record<string, unknown>) => {
    captured.switchProps.push(props);
    return <p>business-type-switch</p>;
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/app/login/actions", () => ({ logout: () => undefined }));
vi.mock("@/app/super-admin/actions", () => ({ stopDemoEdit: () => undefined }));
// The module mounts in the browser only (see DashboardApp); render it inline
// here so its props can be read.
vi.mock("@/components/ui/ClientOnly", () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/haab-booking-module", () => ({
  HaabBookingModule: (props: Record<string, unknown>) => {
    captured.props.push(props);
    return null;
  },
}));

const { DashboardApp } = await import("@/components/provider/DashboardApp");

function store(dashboardLanguage?: Lang): ModuleStore {
  const base = createEmptyStore();
  return {
    ...base,
    setupComplete: true,
    vertical: "events",
    provider: {
      ...base.provider,
      businessName: "Ferias del Sur",
      publicSlug: "ferias",
      // The owner's *clients* read Spanish. Their own workspace must not.
      language: "es",
      dashboardLanguage,
    },
  };
}

function render(
  options: {
    pathname?: string;
    dashboardLanguage?: Lang;
    isSuperAdmin?: boolean;
    viewerLanguage?: Lang;
    publishingEnabled?: boolean;
    demoEdit?: { label: string; publicPath: string };
    googleOutcome?: "connected" | "failed";
    search?: string;
    switchedTo?: "healthcare";
    profileUnsaved?: boolean;
  } = {},
) {
  captured.props.length = 0;
  captured.switchProps.length = 0;
  captured.pathname = options.pathname ?? "/dashboard";
  captured.search = options.search ?? "";
  const html = renderToStaticMarkup(
    <DashboardApp
      initialSection="dashboard"
      store={store(options.dashboardLanguage)}
      email="owner@example.com"
      isSuperAdmin={options.isSuperAdmin ?? false}
      viewerLanguage={options.viewerLanguage ?? "en"}
      demoEdit={options.demoEdit}
      googleOutcome={options.googleOutcome}
      switchedTo={options.switchedTo}
      profileUnsaved={options.profileUnsaved}
      publicationStatus={
        options.publishingEnabled === undefined
          ? undefined
          : {
              publishingEnabled: options.publishingEnabled,
              dashboardMessage: options.publishingEnabled ? undefined : "Publishing paused.",
            }
      }
    />,
  );

  return { html, moduleProps: captured.props[0] ?? {}, switchProps: captured.switchProps[0] };
}

describe("DashboardApp", () => {
  beforeEach(() => {
    captured.props.length = 0;
  });

  it("drives the module section from the URL", () => {
    expect(render({ pathname: "/dashboard/calendar" }).moduleProps.adminSection).toBe("calendar");
    expect(render({ pathname: "/dashboard" }).moduleProps.adminSection).toBe("dashboard");
  });

  it("asks the module for shell chrome and owns the account controls itself", () => {
    const { html, moduleProps } = render();

    expect(moduleProps.chrome).toBe("shell");
    expect(moduleProps).not.toHaveProperty("onSignOut");
    expect(html).toContain(dashboardCopy.en.signOut);
    expect(html).toContain("owner@example.com");
  });

  it("writes the chrome in the same language it hands the module", () => {
    const { html, moduleProps } = render({ viewerLanguage: "en" });

    expect(html).toContain(dashboardCopy.en.copyLink);
    expect(html).not.toContain(dashboardCopy.es.copyLink);
    expect(moduleProps.viewerLanguage).toBe("en");
  });

  it("follows the owner's pinned workspace language, not the clients' language", () => {
    const { html, moduleProps } = render({ dashboardLanguage: "es", viewerLanguage: "en" });

    expect(html).toContain(dashboardCopy.es.copyLink);
    expect(moduleProps.viewerLanguage).toBe("es");
    expect(moduleProps).not.toHaveProperty("onLanguageChange");
  });

  it("links every section and shows super admin only to super admins", () => {
    const { html } = render();

    for (const path of [
      "/dashboard/bookings",
      "/dashboard/calendar",
      "/dashboard/analytics",
      "/dashboard/services",
      "/dashboard/availability",
      "/dashboard/appearance",
      "/dashboard/integrations",
      "/dashboard/settings",
    ]) {
      expect(html).toContain(`href="${path}"`);
    }
    expect(html).not.toContain('href="/super-admin"');
    expect(render({ isSuperAdmin: true }).html).toContain('href="/super-admin"');
  });

  it("titles the page after the active section", () => {
    expect(render({ pathname: "/dashboard/availability" }).html).toMatch(
      /<h1[^>]*>Availability<\/h1>/,
    );
  });

  it("links the live booking page", () => {
    expect(render().html).toContain('href="/events/ferias"');
  });

  it("tells the module whether the page can take bookings", () => {
    expect(render({ publishingEnabled: false }).moduleProps.publishingEnabled).toBe(false);
    expect(render().moduleProps.publishingEnabled).toBeUndefined();
  });

  it("shows the publication message and the demo page being edited", () => {
    const paused = render({ publishingEnabled: false });
    expect(paused.html).toContain("Publishing paused.");
    expect(paused.html).toContain(dashboardCopy.en.publishingOff);

    const demo = render({ demoEdit: { label: "Doctors", publicPath: "/doctors/dr-maya" } });
    expect(demo.html).toContain(dashboardCopy.en.editingDemo);
    expect(demo.html).toContain(dashboardCopy.en.exitDemo);
  });

  it("reports the Google Calendar outcome on the integrations section only", () => {
    expect(
      render({ pathname: "/dashboard/integrations", googleOutcome: "connected" }).html,
    ).toContain(dashboardCopy.en.google.connected);
    expect(render({ pathname: "/dashboard", googleOutcome: "connected" }).html).not.toContain(
      dashboardCopy.en.google.connected,
    );
  });

  it("mounts the module in the browser only, behind a placeholder", async () => {
    const source = (await import("node:fs")).readFileSync(
      new URL("../DashboardApp.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/<ClientOnly[\s\S]*<HaabBookingModule[\s\S]*<\/ClientOnly>/);
  });

  it("lets the owner start a business type change, but not while editing a demo", () => {
    expect(typeof render().moduleProps.onChangeBusinessType).toBe("function");
    expect(
      render({ demoEdit: { label: "Doctors", publicPath: "/doctors/dr-maya" } }).moduleProps
        .onChangeBusinessType,
    ).toBeUndefined();
  });

  it("runs the switch on its own page, keeping the live dashboard mounted but hidden", () => {
    const { html, switchProps, moduleProps } = render({
      pathname: "/dashboard/business-type",
      search: "to=healthcare",
    });

    expect(switchProps?.to).toBe("healthcare");
    expect(html).toContain("business-type-switch");
    expect(moduleProps.adminSection).toBe("business-type");
    expect(html).toMatch(/<div hidden="">/);
  });

  it("confirms a finished switch, and asks for a profile review when that save failed", () => {
    const done = render({ switchedTo: "healthcare" }).html;
    expect(done).toContain("Your page is now a Healthcare page");

    const partial = render({ switchedTo: "healthcare", profileUnsaved: true }).html;
    expect(partial).toContain(dashboardCopy.en.businessType.profileUnsaved);
  });
});
