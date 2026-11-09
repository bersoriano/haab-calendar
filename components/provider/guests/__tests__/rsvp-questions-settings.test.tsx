// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RsvpQuestionsSettings } from "@/components/provider/guests/RsvpQuestionsSettings";
import type { RsvpQuestion } from "@/lib/rsvp-questions";

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

const services = [
  { id: "svc-1", name: "Ceremonia" },
  { id: "svc-2", name: "Tornaboda" },
];

async function render(questions: RsvpQuestion[], onChange = vi.fn()) {
  await act(async () =>
    root.render(<RsvpQuestionsSettings questions={questions} services={services} lang="en" onChange={onChange} />),
  );
  return onChange;
}

function labelled(text: string) {
  const label = Array.from(container.querySelectorAll("label")).find((element) => element.textContent?.includes(text));
  const target = label?.querySelector("input") ?? (label?.htmlFor ? document.getElementById(label.htmlFor) : null);
  return target as HTMLInputElement;
}

describe("RsvpQuestionsSettings", () => {
  it("switches the built-in diet question on and off", async () => {
    const onChange = await render([]);
    await act(async () => labelled("Allergies or dietary needs").click());
    expect(onChange).toHaveBeenLastCalledWith([
      { id: "diet", kind: "text", label: "", options: [], per: "guest", eventIds: [] },
    ]);

    const off = await render([{ id: "diet", kind: "text", label: "", options: [], per: "guest", eventIds: [] }]);
    expect(labelled("Allergies or dietary needs").checked).toBe(true);
    await act(async () => labelled("Allergies or dietary needs").click());
    expect(off).toHaveBeenLastCalledWith([]);
  });

  it("adds a pick-one question with two empty options, asked of each person at every event", async () => {
    const onChange = await render([]);
    const add = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Add a question")!;
    await act(async () => add.click());

    const [question] = onChange.mock.lastCall![0] as RsvpQuestion[];
    expect(question).toMatchObject({ kind: "choice", label: "", per: "guest", eventIds: [] });
    expect(question.options).toHaveLength(2);
    expect(new Set(question.options.map((option) => option.id)).size).toBe(2);
  });

  it("keeps an option's id when its wording changes", async () => {
    const menu: RsvpQuestion = {
      id: "q-menu",
      kind: "choice",
      label: "Menu",
      options: [
        { id: "o-beef", label: "Beef" },
        { id: "o-fish", label: "Fish" },
      ],
      per: "guest",
      eventIds: [],
    };
    const onChange = await render([menu]);
    const input = container.querySelector<HTMLInputElement>("input[aria-label='Option 2']")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(input, "Fish (grilled)");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect((onChange.mock.lastCall![0] as RsvpQuestion[])[0].options).toEqual([
      { id: "o-beef", label: "Beef" },
      { id: "o-fish", label: "Fish (grilled)" },
    ]);
  });
});
