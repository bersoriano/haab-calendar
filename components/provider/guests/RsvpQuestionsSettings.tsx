"use client";

import { Plus, Trash } from "@phosphor-icons/react";

import { Button, Checkbox, Field, IconButton, Input, Select, Switch } from "@/components/app-ui";
import { fillCopy } from "@/components/invitations/invitation-copy";
import {
  MAX_QUESTION_OPTIONS,
  MAX_RSVP_QUESTIONS,
  questionLabel,
  type RsvpQuestion,
} from "@/lib/rsvp-questions";
import type { Lang, Service } from "@/lib/types";

const COPY = {
  en: {
    builtInsLabel: "Ask every guest",
    diet: "Allergies or dietary needs (each person)",
    shuttle: "Hotel for the shuttle (once per household)",
    customTitle: "Questions with options",
    customHint: "A menu, a children's meal, a bus to the venue: each guest picks one option.",
    labelField: "Question",
    labelPlaceholder: "Menu",
    optionsLabel: "Options",
    optionPlaceholder: "Option {n}",
    addOption: "Add option",
    removeOption: "Remove option {n}",
    perLabel: "Asked",
    perGuest: "Of each person",
    perInvitation: "Once per household",
    eventsLabel: "At",
    allEvents: "Every event",
    addQuestion: "Add a question",
    removeQuestion: "Remove this question",
    limit: "Up to {count} questions.",
  },
  es: {
    builtInsLabel: "Preguntar a cada invitado",
    diet: "Alergias o restricciones alimentarias (cada persona)",
    shuttle: "Hotel para el transporte (una vez por familia)",
    customTitle: "Preguntas con opciones",
    customHint: "Un menú, un menú infantil, el autobús al lugar: cada invitado elige una opción.",
    labelField: "Pregunta",
    labelPlaceholder: "Menú",
    optionsLabel: "Opciones",
    optionPlaceholder: "Opción {n}",
    addOption: "Agregar opción",
    removeOption: "Quitar la opción {n}",
    perLabel: "Se pregunta",
    perGuest: "A cada persona",
    perInvitation: "Una vez por familia",
    eventsLabel: "En",
    allEvents: "Todos los eventos",
    addQuestion: "Agregar una pregunta",
    removeQuestion: "Quitar esta pregunta",
    limit: "Hasta {count} preguntas.",
  },
} as const;

const BUILT_INS: Record<"diet" | "shuttle", RsvpQuestion> = {
  diet: { id: "diet", kind: "text", label: "", options: [], per: "guest", eventIds: [] },
  shuttle: { id: "shuttle", kind: "text", label: "", options: [], per: "invitation", eventIds: [] },
};

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The questions an invitation-only page asks with the RSVP. Option ids never
 * change once made, so answers already given keep pointing at their option
 * when its wording is edited.
 */
export function RsvpQuestionsSettings({
  questions,
  services,
  lang,
  disabled,
  onChange,
}: {
  questions: RsvpQuestion[];
  services: Pick<Service, "id" | "name">[];
  lang: Lang;
  disabled?: boolean;
  onChange: (questions: RsvpQuestion[]) => void;
}) {
  const t = COPY[lang];
  const custom = questions.filter((question) => question.kind === "choice");
  const has = (id: string) => questions.some((question) => question.id === id);

  function toggleBuiltIn(id: "diet" | "shuttle", on: boolean) {
    onChange(on ? [...questions, BUILT_INS[id]] : questions.filter((question) => question.id !== id));
  }

  function update(id: string, change: Partial<RsvpQuestion>) {
    onChange(questions.map((question) => (question.id === id ? { ...question, ...change } : question)));
  }

  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-app-fg">{t.builtInsLabel}</legend>
        <Field label={t.diet} inline>
          <Switch checked={has("diet")} disabled={disabled} onChange={(event) => toggleBuiltIn("diet", event.target.checked)} />
        </Field>
        <Field label={t.shuttle} inline>
          <Switch
            checked={has("shuttle")}
            disabled={disabled}
            onChange={(event) => toggleBuiltIn("shuttle", event.target.checked)}
          />
        </Field>
      </fieldset>

      <div className="grid gap-3">
        <div>
          <p className="text-sm font-medium text-app-fg">{t.customTitle}</p>
          <p className="text-sm text-app-fg-muted">{t.customHint}</p>
        </div>

        {custom.map((question) => (
          <fieldset key={question.id} className="grid gap-3 rounded-lg p-4 ring-1 ring-app-border">
            <legend className="sr-only">{questionLabel(question, lang) || t.labelField}</legend>
            <div className="flex items-end gap-2">
              <Field label={t.labelField} className="flex-1">
                <Input
                  value={question.label}
                  maxLength={80}
                  placeholder={t.labelPlaceholder}
                  disabled={disabled}
                  onChange={(event) => update(question.id, { label: event.target.value })}
                />
              </Field>
              <IconButton
                label={t.removeQuestion}
                icon={<Trash aria-hidden="true" size={16} />}
                disabled={disabled}
                onClick={() => onChange(questions.filter((entry) => entry.id !== question.id))}
              />
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium text-app-fg">{t.optionsLabel}</p>
              {question.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    aria-label={fillCopy(t.optionPlaceholder, { n: index + 1 })}
                    value={option.label}
                    maxLength={80}
                    placeholder={fillCopy(t.optionPlaceholder, { n: index + 1 })}
                    disabled={disabled}
                    onChange={(event) =>
                      update(question.id, {
                        options: question.options.map((entry) =>
                          entry.id === option.id ? { ...entry, label: event.target.value } : entry,
                        ),
                      })
                    }
                  />
                  <IconButton
                    label={fillCopy(t.removeOption, { n: index + 1 })}
                    icon={<Trash aria-hidden="true" size={16} />}
                    disabled={disabled || question.options.length <= 1}
                    onClick={() =>
                      update(question.id, { options: question.options.filter((entry) => entry.id !== option.id) })
                    }
                  />
                </div>
              ))}
              <div>
                <Button
                  variant="plain"
                  size="sm"
                  leadingIcon={<Plus aria-hidden="true" size={16} />}
                  disabled={disabled || question.options.length >= MAX_QUESTION_OPTIONS}
                  onClick={() =>
                    update(question.id, { options: [...question.options, { id: newId("o"), label: "" }] })
                  }
                >
                  {t.addOption}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.perLabel}>
                <Select
                  value={question.per}
                  disabled={disabled}
                  onChange={(event) =>
                    update(question.id, { per: event.target.value === "invitation" ? "invitation" : "guest" })
                  }
                >
                  <option value="guest">{t.perGuest}</option>
                  <option value="invitation">{t.perInvitation}</option>
                </Select>
              </Field>
              <fieldset className="grid gap-1">
                <legend className="mb-1 text-sm font-medium text-app-fg">{t.eventsLabel}</legend>
                <Field label={t.allEvents} inline>
                  <Checkbox
                    checked={question.eventIds.length === 0}
                    disabled={disabled}
                    onChange={(event) => update(question.id, { eventIds: event.target.checked ? [] : services.slice(0, 1).map((service) => service.id) })}
                  />
                </Field>
                {question.eventIds.length > 0
                  ? services.map((service) => (
                      <Field key={service.id} label={service.name} inline>
                        <Checkbox
                          checked={question.eventIds.includes(service.id)}
                          disabled={disabled}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...question.eventIds, service.id]
                              : question.eventIds.filter((id) => id !== service.id);
                            update(question.id, { eventIds: next });
                          }}
                        />
                      </Field>
                    ))
                  : null}
              </fieldset>
            </div>
          </fieldset>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            leadingIcon={<Plus aria-hidden="true" size={16} />}
            disabled={disabled || questions.length >= MAX_RSVP_QUESTIONS}
            onClick={() =>
              onChange([
                ...questions,
                {
                  id: newId("q"),
                  kind: "choice",
                  label: "",
                  options: [
                    { id: newId("o"), label: "" },
                    { id: newId("o"), label: "" },
                  ],
                  per: "guest",
                  eventIds: [],
                },
              ])
            }
          >
            {t.addQuestion}
          </Button>
          {questions.length >= MAX_RSVP_QUESTIONS ? (
            <span className="text-sm text-app-fg-muted">{fillCopy(t.limit, { count: MAX_RSVP_QUESTIONS })}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
