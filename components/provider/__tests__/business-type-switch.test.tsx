import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { businessTypeDraftKey } from "@/lib/business-type-switch";
import { createEmptyStore } from "@/lib/store";
import type { ModuleStore } from "@/lib/types";

const captured = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }));

vi.mock("@/components/haab-booking-module", () => ({
  HaabBookingModule: (props: Record<string, unknown>) => {
    captured.props.push(props);
    return null;
  },
}));

const { BusinessTypeSwitch, draftBannerText } = await import(
  "@/components/provider/BusinessTypeSwitch"
);

const copy = dashboardCopy.en.businessType;

function liveStore(): ModuleStore {
  const store = createEmptyStore();
  return {
    ...store,
    setupComplete: true,
    vertical: "professional",
    provider: { ...store.provider, businessName: "Acme", publicSlug: "acme" },
  };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
    values,
  };
}

function render(options: { to?: "healthcare" | "spaces"; storage?: ReturnType<typeof memoryStorage> }) {
  captured.props.length = 0;
  const storage = options.storage ?? memoryStorage();
  const html = renderToStaticMarkup(
    <BusinessTypeSwitch
      lang="en"
      liveStore={liveStore()}
      to={options.to}
      storage={storage}
      onCancel={() => undefined}
    />,
  );
  return { html, storage, moduleProps: captured.props[0] };
}

describe("BusinessTypeSwitch", () => {
  beforeEach(() => {
    captured.props.length = 0;
  });

  it("starts a draft for the chosen type and sets it up in the wizard", () => {
    const { html, storage, moduleProps } = render({ to: "healthcare" });
    const key = businessTypeDraftKey("acme");
    const draft = JSON.parse(storage.values.get(key) ?? "null") as ModuleStore;

    expect(draft.vertical).toBe("healthcare");
    expect(draft.provider.businessName).toBe("Acme");
    expect(moduleProps).toMatchObject({
      storageKey: key,
      persistSetup: true,
      publishLabel: copy.publishLabel,
    });
    expect(typeof moduleProps?.publishSetupOverride).toBe("function");
    expect(html).toContain("Setting up your Healthcare page");
    expect(html).toContain(copy.cancelChange);
  });

  it("asks before replacing a draft for another type", () => {
    const key = businessTypeDraftKey("acme");
    const storage = memoryStorage({
      [key]: JSON.stringify({ ...createEmptyStore(), vertical: "spaces" }),
    });
    const { html, moduleProps } = render({ to: "healthcare", storage });

    expect(html).toContain(copy.keepDraft);
    expect(html).toContain(copy.startNew);
    expect(moduleProps).toBeUndefined();
    expect(JSON.parse(storage.values.get(key) ?? "{}").vertical).toBe("spaces");
  });

  it("resumes a draft when no new type is asked for", () => {
    const key = businessTypeDraftKey("acme");
    const storage = memoryStorage({
      [key]: JSON.stringify({ ...createEmptyStore(), vertical: "spaces" }),
    });
    const { moduleProps } = render({ storage });

    expect(moduleProps?.storageKey).toBe(key);
  });

  it("points back to Settings when there is nothing to set up", () => {
    const { html, moduleProps } = render({});

    expect(moduleProps).toBeUndefined();
    expect(html).toContain(copy.pickTitle);
  });

  it("follows the type the owner settles on inside the wizard", () => {
    const { moduleProps } = render({ to: "healthcare" });

    expect(typeof moduleProps?.onVerticalChange).toBe("function");
  });
});

describe("draftBannerText", () => {
  it("names the type being set up", () => {
    expect(draftBannerText("en", "spaces")).toContain("Setting up your Spaces page");
  });

  it("asks for a type while none is chosen, without naming the old one", () => {
    const text = draftBannerText("en", undefined);

    expect(text).toBe(copy.draftBannerChoosing);
    expect(text).not.toContain("{type}");
  });
});
