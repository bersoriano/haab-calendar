import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { ServiceEditor } from "@/components/provider/ServiceEditor";
import { createBlankServiceDraft, normalizeProvider, normalizeServices } from "@/lib/store";
import { getVerticalCopy } from "@/lib/vertical-copy";

const copy = getVerticalCopy("spaces", "en");

function render(serviceCount: number, headingLevel?: 2 | 3) {
  const services = normalizeServices(
    Array.from({ length: serviceCount }, (_, index) => ({
      id: `s${index}`,
      name: `Court ${index}`,
      description: "Indoor court",
      bookingType: "appointment" as const,
      durationMinutes: 60,
    })),
  );

  return renderToStaticMarkup(
    <ServiceEditor
      services={services}
      serviceDraft={createBlankServiceDraft("spaces")}
      onDraftChange={() => undefined}
      editingServiceId={null}
      onUpsert={() => undefined}
      onReset={() => undefined}
      onEdit={() => undefined}
      onRemove={() => undefined}
      provider={normalizeProvider({})}
      vertical="spaces"
      copy={copy}
      lang="en"
      headingLevel={headingLevel}
    />,
  );
}

describe("ServiceEditor layout", () => {
  it("titles its cards at the level its host asks for", () => {
    // The dashboard puts them under the page's h1; the wizard under a step's h3.
    expect(render(1).match(/<h2/g)).toHaveLength(2);
    const nested = render(1, 3);
    expect(nested).not.toContain("<h2");
    expect(nested.match(/<h3/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("gives the editor an anchor and its first field an id to focus", () => {
    const html = render(1);

    expect(html).toContain('id="service-editor"');
    expect(html).toContain('id="service-editor-name"');
  });

  it("keeps the editor in view beside a long list on wide screens", () => {
    const editor = render(1).match(/<[a-z]+[^>]*id="service-editor"[^>]*>/)?.[0] ?? "";
    expect(editor).toContain("lg:sticky");
  });

  it("offers a jump to the editor on narrow screens once there is a list", () => {
    expect(render(0)).not.toContain('href="#service-editor"');

    const html = render(3);
    expect(html).toMatch(/href="#service-editor"[^>]*class="[^"]*lg:hidden/);
    expect(html).toContain(copy.phrases.newServiceTitle);
  });

  it("takes the notes on several lines and lists them the way they were typed", () => {
    const notes = "Bring a photo ID.\nArrive 10 minutes early.";
    const html = renderToStaticMarkup(
      <ServiceEditor
        services={normalizeServices([
          { id: "s", name: "Court", description: "Indoor court", bookingType: "appointment", durationMinutes: 60, notes },
        ])}
        serviceDraft={{ ...createBlankServiceDraft("spaces"), notes }}
        onDraftChange={() => undefined}
        editingServiceId={null}
        onUpsert={() => undefined}
        onReset={() => undefined}
        onEdit={() => undefined}
        onRemove={() => undefined}
        provider={normalizeProvider({})}
        vertical="spaces"
        copy={copy}
        lang="en"
      />,
    );
    const placeholder = bookingTranslations.en.admin.notesPlaceholder;

    expect(html).toMatch(new RegExp(`<textarea[^>]*placeholder="${placeholder}"[^>]*>Bring a photo ID\\.\nArrive`));
    expect(html).not.toMatch(new RegExp(`<input[^>]*placeholder="${placeholder}"`));
    expect(html).toMatch(/<span class="[^"]*whitespace-pre-line[^"]*">[^<]*Bring a photo ID\.\nArrive 10 minutes early\./);
  });

  it("shows why a save or delete did not go through", () => {
    const html = renderToStaticMarkup(
      <ServiceEditor
        services={[]}
        serviceDraft={createBlankServiceDraft()}
        onDraftChange={() => undefined}
        editingServiceId={null}
        onUpsert={() => undefined}
        onReset={() => undefined}
        onEdit={() => undefined}
        onRemove={() => undefined}
        provider={normalizeProvider({})}
        error="Add a name and a description."
      />,
    );
    expect(html).toMatch(/role="alert"[\s\S]*Add a name and a description\./);
  });
});

