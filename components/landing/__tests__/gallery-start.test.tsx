// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { DemoGalleryPage } from "@/components/landing/demo-gallery-page";
import { translations } from "@/components/landing/translations";

// A server action: its module reaches for the server's own Supabase client.
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

// The gallery wore the landing's create buttons without the dialogs behind
// them, so every one of them fell back to a no-op and did nothing at all.
it("opens the first setup step from every create button in the gallery", async () => {
  await act(async () =>
    root.render(<DemoGalleryPage indexes={[0]} initialLanguage="en" loggedIn={false} loginHref="/login" />),
  );
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-landing-action='create_page']"));
  expect(buttons.length).toBeGreaterThan(0);

  for (const button of buttons) {
    await act(async () => button.click());
    const title = document.body.querySelector("[role='dialog'] h2, dialog h2");
    expect(title?.textContent).toBe(translations.en.startDialog.title);
    await act(async () =>
      document.body.querySelector<HTMLButtonElement>(`button[aria-label='${translations.en.startDialog.close}']`)!.click(),
    );
  }
});
