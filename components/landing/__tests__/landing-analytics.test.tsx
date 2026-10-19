// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingActionsProvider, LandingPage } from "@/components/landing/landing-ui";
import { LanguageProvider } from "@/components/landing/language-provider";
import { UseCasesSection } from "@/components/landing/use-cases";
import { translations } from "@/components/landing/translations";
import { observeLanding } from "@/lib/analytics/landing-browser";

let stop: (() => void) | undefined;
afterEach(() => stop?.());

function render(hasPage = false, hasDraft = false) {
  document.body.innerHTML = renderToStaticMarkup(
    <LanguageProvider initialLang="en">
      <LandingActionsProvider actions={{ onStart() {}, onSelectVertical() {}, hasPage, hasDraft }}>
        <LandingPage featuredDemos={[0, 1, 2, 3]} afterHero={<UseCasesSection onSelectVertical={() => {}} />} />
      </LandingActionsProvider>
    </LanguageProvider>,
  );
  const root = document.querySelector<HTMLElement>(".haab-landing")!;
  const capture = vi.fn();
  stop = observeLanding(root, capture, () => "en");
  return { root, capture };
}

describe("real landing analytics wiring", () => {
  it("attributes primary CTAs to hero and footer and distinguishes gallery/example clicks", () => {
    const { root, capture } = render();
    const hero = root.querySelector("h1")!.closest("section")!;
    Array.from(hero.querySelectorAll("button")).find((button) => button.textContent?.includes(translations.en.hero.ctaPrimary))!.click();
    expect(capture).toHaveBeenCalledWith("landing_cta_click", { section: "hero", action: "create_page", language: "en" });
    root.querySelector<HTMLButtonElement>("footer button")!.click();
    expect(capture).toHaveBeenCalledWith("landing_cta_click", { section: "footer", action: "create_page", language: "en" });
    root.querySelector<HTMLAnchorElement>("a[href^='/gallery']")!.click();
    expect(capture).toHaveBeenCalledWith("landing_cta_click", { section: "live-examples", action: "view_gallery", language: "en" });
    root.querySelector<HTMLAnchorElement>("#live-examples a[href^='/doctors']")!.click();
    expect(capture).toHaveBeenCalledWith("landing_cta_click", { section: "live-examples", action: "view_example", example: 0, language: "en" });
  });

  it.each([[true, false, "open_dashboard"], [false, true, "resume_setup"]] as const)("distinguishes existing-page and draft CTAs (%s, %s)", (hasPage, hasDraft, action) => {
    const { root, capture } = render(hasPage, hasDraft);
    const hero = root.querySelector("h1")!.closest("section")!;
    const label = hasPage ? translations.en.nav.dashboard : translations.en.hero.ctaPrimary;
    Array.from(hero.querySelectorAll("button")).find((button) => button.textContent?.includes(label))!.click();
    expect(capture).toHaveBeenCalledWith("landing_cta_click", { section: "hero", action, language: "en" });
  });

  it("records industry choices without sending card text or provider form contents", () => {
    const { root, capture } = render();
    root.querySelector<HTMLButtonElement>("#verticals button")!.click();
    expect(capture).toHaveBeenCalledWith("landing_vertical_select", { section: "verticals", vertical: "healthcare", language: "en" });
    expect(JSON.stringify(capture.mock.calls)).not.toContain(translations.en.useCases.title);
  });
});
