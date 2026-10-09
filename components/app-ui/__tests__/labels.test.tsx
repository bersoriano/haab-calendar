import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Alert, Dialog, ToastProvider } from "@/components/app-ui";

const noop = () => undefined;

/**
 * The kit serves an English and a Spanish dashboard and has no language of its
 * own, so it never falls back to English words: callers must name close and
 * dismiss buttons. `npm run typecheck` fails if any @ts-expect-error below
 * stops being needed.
 */
describe("button labels come from the caller", () => {
  it("requires them at the type level", () => {
    // @ts-expect-error closeLabel is required
    const dialog = <Dialog open={false} onClose={noop} title="t" />;
    // @ts-expect-error dismissLabel is required once the alert is dismissable
    const alert = <Alert tone="info" onDismiss={noop}>x</Alert>;
    // @ts-expect-error dismissLabel is required
    const toasts = <ToastProvider><p /></ToastProvider>;

    expect([dialog, alert, toasts]).toHaveLength(3);
  });

  it("renders no English fallback when a label is given", () => {
    const html = renderToStaticMarkup(
      <Alert tone="info" onDismiss={noop} dismissLabel="Cerrar aviso">
        Hola
      </Alert>,
    );
    expect(html).toContain('aria-label="Cerrar aviso"');
    expect(html).not.toContain("Dismiss");
  });

  it("does not ask for a label on an alert that cannot be dismissed", () => {
    expect(renderToStaticMarkup(<Alert tone="info">Hola</Alert>)).not.toContain("<button");
  });
});
