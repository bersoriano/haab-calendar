import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { SaveBar } from "@/components/provider/SaveBar";
import { dashboardCopy } from "@/components/provider/dashboard-copy";

const noop = () => undefined;

describe("SaveBar", () => {
  it("renders nothing when there is nothing to save or report", () => {
    expect(
      renderToStaticMarkup(<SaveBar visible={false} saving={false} onSave={noop} lang="en" />),
    ).toBe("");
  });

  it("offers save while there are unsaved changes", () => {
    const html = renderToStaticMarkup(<SaveBar visible saving={false} onSave={noop} lang="en" />);

    expect(html).toContain(dashboardCopy.en.unsavedChanges);
    expect(html).toContain(bookingTranslations.en.admin.saveChanges);
    expect(html).toContain('role="region"');
  });

  it("speaks the owner's workspace language", () => {
    const html = renderToStaticMarkup(<SaveBar visible saving={false} onSave={noop} lang="es" />);

    expect(html).toContain(dashboardCopy.es.unsavedChanges);
    expect(html).toContain(bookingTranslations.es.admin.saveChanges);
  });

  it("shows the busy label while saving", () => {
    const html = renderToStaticMarkup(<SaveBar visible saving onSave={noop} lang="en" />);

    expect(html).toContain(bookingTranslations.en.common.saving);
  });

  it("keeps a failure visible", () => {
    const html = renderToStaticMarkup(
      <SaveBar visible saving={false} error="Could not save." onSave={noop} lang="en" />,
    );

    expect(html).toContain("Could not save.");
    expect(html).toContain('role="alert"');
  });

  it("leaves the save confirmation to a toast instead of inline markup", () => {
    const html = renderToStaticMarkup(
      <SaveBar visible={false} saving={false} message="Saved" onSave={noop} lang="en" />,
    );

    expect(html).toBe("");
  });

  it("marks the save button busy while saving", () => {
    const html = renderToStaticMarkup(<SaveBar visible saving onSave={noop} lang="en" />);

    expect(html).toContain('aria-busy="true"');
  });
});
