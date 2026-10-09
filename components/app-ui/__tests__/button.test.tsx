import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { Button, ButtonLink, IconButton, Badge, buttonStyles, inputStyles, segmentStyles } = await import(
  "@/components/app-ui"
);

describe("Button", () => {
  it("is a real button that defaults to type=button", () => {
    const html = renderToStaticMarkup(<Button>Save</Button>);
    expect(html).toMatch(/^<button[^>]*type="button"/);
    expect(html).toContain("bg-app-accent");
  });

  it("keeps an explicit submit type", () => {
    expect(renderToStaticMarkup(<Button type="submit">Go</Button>)).toContain('type="submit"');
  });

  it("is busy and disabled while loading", () => {
    const html = renderToStaticMarkup(<Button loading>Save</Button>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
    expect(html).toContain("Save");
  });

  it("styles each variant from app tokens", () => {
    expect(buttonStyles({ variant: "secondary" })).toContain("ring-app-border-strong");
    expect(buttonStyles({ variant: "danger" })).toContain("bg-app-danger");
    expect(buttonStyles({ variant: "danger-plain" })).toContain("text-app-danger-fg");
    expect(buttonStyles({ variant: "soft" })).toContain("bg-app-accent-soft");
    expect(buttonStyles({ variant: "plain" })).toContain("hover:bg-app-subtle");
  });

  it("sets its own type over the global form-control font reset", () => {
    // globals.css has an unlayered `button, input… { font: inherit }` that
    // outranks layered utilities; only important utilities get past it.
    expect(buttonStyles()).toContain("text-sm!");
    expect(buttonStyles()).toContain("font-semibold!");
    expect(segmentStyles(true)).toContain("text-sm!");
    expect(inputStyles()).toContain("sm:text-sm!");
  });

  it("keeps 44px targets on phones", () => {
    expect(buttonStyles({ size: "md" })).toContain("h-11");
    expect(buttonStyles({ size: "sm" })).toContain("h-11");
  });
});

describe("ButtonLink", () => {
  it("opens external links safely in a new tab", () => {
    const html = renderToStaticMarkup(
      <ButtonLink href="https://example.com" external>
        View page
      </ButtonLink>,
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders internal links without a target", () => {
    const html = renderToStaticMarkup(<ButtonLink href="/dashboard">Home</ButtonLink>);
    expect(html).toContain('href="/dashboard"');
    expect(html).not.toContain("target=");
  });
});

describe("IconButton", () => {
  it("names itself for assistive tech and on hover", () => {
    const html = renderToStaticMarkup(<IconButton label="Sign out" icon={<span />} />);
    expect(html).toContain('aria-label="Sign out"');
    expect(html).toContain('title="Sign out"');
  });
});

describe("Badge", () => {
  it("uses the tone's soft surface and an optional dot", () => {
    const html = renderToStaticMarkup(
      <Badge tone="success" dot>
        Live
      </Badge>,
    );
    expect(html).toContain("bg-app-success-soft");
    expect(html).toContain("ring-app-success-ring");
    expect(html).toContain("rounded-full");
  });
});
