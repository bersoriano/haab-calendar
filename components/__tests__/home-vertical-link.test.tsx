// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

/**
 * The gallery's first step and the online booking page for doctors both hand
 * the visitor to `/?vertical=<id>&name=<page>`. A signed-in account always
 * opened setup from that (startInApp); a signed-out visitor, who is most of
 * them, used to get the plain landing page and lose what they had chosen.
 */
const opened = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => undefined, push: () => undefined, refresh: () => undefined }),
}));
vi.mock("@/app/login/actions", () => ({ logout: () => undefined }));
vi.mock("@/components/haab-booking-module", () => ({
  HaabBookingModule: (props: Record<string, unknown>) => {
    opened.props.push(props);
    return null;
  },
}));

const { HomeExperience } = await import("@/components/home-experience");

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  // Node's own experimental localStorage global shadows happy-dom's and is
  // unusable without a backing file: a fresh in-memory one, with no draft.
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
  });
  opened.props.length = 0;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function render(initialVertical?: "healthcare") {
  return act(async () =>
    root.render(
      <HomeExperience
        loggedIn={false}
        configured={false}
        initialVertical={initialVertical}
        initialPageName="Clínica Prueba"
        featuredDemos={[]}
        initialLanguage="es"
        viewerLanguage="es"
      />,
    ),
  );
}

it("opens setup for a signed-out visitor who arrives with a chosen business type", async () => {
  await render("healthcare");
  expect(opened.props.length).toBeGreaterThan(0);
  expect(opened.props.at(-1)).toMatchObject({ initialVerticalId: "healthcare" });
});

it("keeps the landing page for a signed-out visitor with no type in the link", async () => {
  await render();
  expect(opened.props).toHaveLength(0);
});
