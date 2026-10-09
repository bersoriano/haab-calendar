import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  Checkbox,
  Field,
  Fieldset,
  FormSection,
  Input,
  Select,
  Switch,
  Textarea,
} from "@/components/app-ui";

function attr(html: string, tag: string, name: string) {
  const element = html.match(new RegExp(`<${tag}[^>]*>`))?.[0] ?? "";
  return element.match(new RegExp(`${name}="([^"]*)"`))?.[1];
}

describe("Field", () => {
  it("labels the control and points it at its description and error", () => {
    const html = renderToStaticMarkup(
      <Field label="Business name" description="Shown on your page" error="Required">
        <Input defaultValue="" />
      </Field>,
    );
    const id = attr(html, "input", "id");
    const describedBy = attr(html, "input", "aria-describedby") ?? "";

    expect(id).toBeTruthy();
    expect(html).toContain(`for="${id}"`);
    expect(describedBy.split(" ")).toHaveLength(2);
    for (const target of describedBy.split(" ")) {
      expect(html).toContain(`id="${target}"`);
    }
    expect(attr(html, "input", "aria-invalid")).toBe("true");
    expect(html).toContain("outline-app-danger-fg");
  });

  it("leaves a valid control unmarked", () => {
    const html = renderToStaticMarkup(
      <Field label="Email">
        <Input type="email" />
      </Field>,
    );
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain("aria-describedby");
  });

  it("lets an explicit id win", () => {
    const html = renderToStaticMarkup(
      <Field label="Slug">
        <Input id="public-slug" />
      </Field>,
    );
    expect(html).toContain('for="public-slug"');
    expect(attr(html, "input", "id")).toBe("public-slug");
  });

  it("wires selects and textareas the same way", () => {
    const select = renderToStaticMarkup(
      <Field label="Status" error="Pick one">
        <Select>
          <option>All</option>
        </Select>
      </Field>,
    );
    expect(attr(select, "select", "aria-invalid")).toBe("true");

    const textarea = renderToStaticMarkup(
      <Field label="Notes" description="Optional">
        <Textarea />
      </Field>,
    );
    expect(attr(textarea, "textarea", "aria-describedby")).toBeTruthy();
  });
});

describe("Input addons", () => {
  it("renders prefix text beside the input", () => {
    const html = renderToStaticMarkup(<Input aria-label="Slug" leadingAddon="haab.app/" />);
    expect(html).toContain("haab.app/");
    expect(html).toContain("focus-within:outline-2");
  });
});

describe("Switch and Checkbox", () => {
  it("renders a native checkbox with switch semantics", () => {
    const html = renderToStaticMarkup(<Switch aria-label="Keep history" defaultChecked />);
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*role="switch"|<input[^>]*role="switch"[^>]*type="checkbox"/);
  });

  it("puts the label beside an inline control", () => {
    const html = renderToStaticMarkup(
      <Field label="Monday" inline>
        <Checkbox />
      </Field>,
    );
    expect(html).toContain('type="checkbox"');
    expect(html.indexOf("<input")).toBeLessThan(html.indexOf("Monday"));
  });
});

describe("Fieldset and FormSection", () => {
  it("groups fields under a legend", () => {
    const html = renderToStaticMarkup(
      <Fieldset legend="Breaks" description="Times you are away">
        <p>fields</p>
      </Fieldset>,
    );
    expect(html).toMatch(/<fieldset[^>]*><legend[^>]*>Breaks<\/legend>/);
  });

  it("lays out a settings section with its heading", () => {
    const html = renderToStaticMarkup(
      <FormSection title="Business profile" description="Shown to clients">
        <p>fields</p>
      </FormSection>,
    );
    expect(html).toMatch(/<h2[^>]*>Business profile<\/h2>/);
    expect(html).toContain("lg:grid-cols-3");
  });
});
