import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Alert } from "@/components/ui/Alert";

/**
 * The pre-app-ui Alert, still used by sections that later PRs migrate.
 * Moved here from app-shell.test.tsx when the shell switched to app-ui.
 */
describe("legacy Alert", () => {
  it("uses status tokens instead of fixed colors", () => {
    const html = renderToStaticMarkup(<Alert tone="danger">Nope</Alert>);

    expect(html).toContain("var(--danger-soft)");
    expect(html).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it("carries the role it is given", () => {
    expect(renderToStaticMarkup(<Alert tone="success" role="status">Saved</Alert>)).toContain(
      'role="status"',
    );
  });
});
