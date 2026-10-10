import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConfirmDialog, Dialog, isBackdropClick } from "@/components/app-ui";

const rect = { left: 100, top: 100, right: 500, bottom: 400 };

describe("isBackdropClick", () => {
  it("is true only outside the panel", () => {
    expect(isBackdropClick(rect, { x: 50, y: 200 })).toBe(true);
    expect(isBackdropClick(rect, { x: 300, y: 450 })).toBe(true);
    expect(isBackdropClick(rect, { x: 300, y: 200 })).toBe(false);
    expect(isBackdropClick(rect, { x: 100, y: 100 })).toBe(false);
  });
});

describe("Dialog", () => {
  it("names itself from its title and description", () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={() => undefined} title="Reschedule" description="Pick a new time" closeLabel="Close">
        <p>slots</p>
      </Dialog>,
    );
    const labelledBy = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];

    expect(html).toMatch(/^<dialog/);
    expect(html).toContain(`id="${labelledBy}"`);
    expect(html).toContain(`id="${describedBy}"`);
    expect(html).toContain("slots");
  });

  it("never renders the open attribute itself (showModal owns it)", () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={() => undefined} title="T" closeLabel="Close">
        x
      </Dialog>,
    );
    expect(html).not.toMatch(/<dialog[^>]*\sopen[\s=>]/);
  });

  it("renders no content while closed", () => {
    const html = renderToStaticMarkup(
      <Dialog open={false} onClose={() => undefined} title="Hidden title" closeLabel="Close">
        secret
      </Dialog>,
    );
    expect(html).not.toContain("secret");
    expect(html).not.toContain("Hidden title");
  });
});

describe("ConfirmDialog", () => {
  it("disables both actions and shows progress while pending", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Cancel booking?"
        body="The client is emailed."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        tone="danger"
        pending
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    const actions = buttons.filter((tag) => !tag.includes("aria-label="));

    expect(actions).toHaveLength(2);
    expect(actions.every((tag) => tag.includes("disabled"))).toBe(true);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("bg-app-danger");
  });

  it("describes itself with its body and closes in the caller's language", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="¿Cancelar la cita?"
        body="Se avisará al cliente."
        confirmLabel="Cancelar cita"
        cancelLabel="Mantener cita"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toMatch(new RegExp(`id="${describedBy}"[^>]*>Se avisará al cliente\\.`));
    expect(html).toContain('aria-label="Mantener cita"');
    expect(html).not.toContain('aria-label="Close"');
  });

  it("can be an alert dialog for a decision that interrupts the task", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        alert
        title="Replace your page?"
        confirmLabel="Replace"
        cancelLabel="Cancel"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(html).toMatch(/^<dialog[^>]*role="alertdialog"/);
  });

  it("can keep the confirm locked while the cancel stays usable", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete account?"
        confirmLabel="Delete permanently"
        cancelLabel="Cancel"
        confirmDisabled
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Delete permanently<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Cancel<\/button>/);
  });

  it("shows a failure inside the dialog", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        error="Could not delete."
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not delete.");
  });
});
