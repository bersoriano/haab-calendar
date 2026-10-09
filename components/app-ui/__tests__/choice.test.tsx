import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageToggle, RadioCards, SegmentedControl, nextSegmentIndex } from "@/components/app-ui";

describe("SegmentedControl", () => {
  const html = renderToStaticMarkup(
    <SegmentedControl
      ariaLabel="Booking view"
      value="archive"
      onChange={() => undefined}
      options={[
        { value: "active", label: "Active", count: 4 },
        { value: "archive", label: "Archive", count: 9 },
      ]}
    />,
  );

  it("is a radiogroup of radio buttons", () => {
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Booking view"');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
  });

  it("checks and focuses only the selected option", () => {
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-checked="true"[^>]*tabindex="0"|tabindex="0"[^>]*aria-checked="true"/);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(1);
  });

  it("keeps unselected options at AA contrast on the track", () => {
    // fg-muted on the subtle track is 4.39:1; fg-secondary is 9.37:1.
    const idle = html.match(/<button[^>]*aria-checked="false"[^>]*>/)?.[0] ?? "";
    expect(idle).toContain("text-app-fg-secondary");
    expect(idle).not.toContain("text-app-fg-muted");
  });

  it("opts its buttons out of the global font reset", () => {
    expect(html.match(/data-app-control/g)).toHaveLength(2);
  });

  it("shows counts", () => {
    expect(html).toContain(">9<");
  });
});

describe("SegmentedControl without a matching value", () => {
  it("keeps the first option reachable by Tab", () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        ariaLabel="Period"
        value={"year" as string}
        onChange={() => undefined}
        options={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
      />,
    );
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toMatch(/tabindex="0"[^>]*>Week|>Week<\/button>/);
    expect(html.indexOf('tabindex="0"')).toBeLessThan(html.indexOf("Month"));
    expect(html).not.toContain('aria-checked="true"');
  });
});

describe("nextSegmentIndex", () => {
  it("moves with arrows and wraps", () => {
    expect(nextSegmentIndex(0, "ArrowRight", 3)).toBe(1);
    expect(nextSegmentIndex(2, "ArrowRight", 3)).toBe(0);
    expect(nextSegmentIndex(0, "ArrowLeft", 3)).toBe(2);
    expect(nextSegmentIndex(1, "ArrowDown", 3)).toBe(2);
    expect(nextSegmentIndex(1, "ArrowUp", 3)).toBe(0);
  });

  it("jumps to the ends and ignores other keys", () => {
    expect(nextSegmentIndex(1, "Home", 3)).toBe(0);
    expect(nextSegmentIndex(1, "End", 3)).toBe(2);
    expect(nextSegmentIndex(1, "a", 3)).toBeNull();
  });
});

describe("RadioCards", () => {
  it("renders native radios sharing one name, the selected one checked", () => {
    const html = renderToStaticMarkup(
      <RadioCards
        name="theme"
        ariaLabel="Theme"
        value="dark"
        onChange={() => undefined}
        options={[
          { value: "default", label: "Classic" },
          { value: "dark", label: "Dark", description: "Charcoal" },
        ]}
      />,
    );
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html.match(/name="theme"/g)).toHaveLength(2);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain("Charcoal");
  });
});

describe("LanguageToggle", () => {
  it("renders links when the page builds the URLs", () => {
    const html = renderToStaticMarkup(<LanguageToggle lang="es" hrefFor={(lang) => `?lang=${lang}`} />);
    expect(html).toContain('href="?lang=en"');
    expect(html).toMatch(/<a[^>]*href="\?lang=es"[^>]*aria-current="true"/);
    expect(html).not.toContain('role="radio"');
  });

  it("names each option by its language for screen readers", () => {
    const html = renderToStaticMarkup(<LanguageToggle lang="en" onChange={() => undefined} />);
    expect(html).toContain('<span aria-hidden="true">ES</span><span class="sr-only">Español</span>');
  });

  it("renders a segmented control when it changes state", () => {
    const html = renderToStaticMarkup(<LanguageToggle lang="en" onChange={() => undefined} />);
    expect(html).toContain('role="radiogroup"');
  });
});
