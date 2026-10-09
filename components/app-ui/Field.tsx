"use client";

import { createContext, isValidElement, useContext, useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type FieldContextValue = {
  id: string;
  descriptionId?: string;
  errorId?: string;
  invalid: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

/** The kit's own controls; only their `id` can name a Field's control. */
const FIELD_CONTROLS = new WeakSet<object>();

export function registerFieldControl(component: object) {
  FIELD_CONTROLS.add(component);
}

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
};

/** Merges the surrounding Field's id and aria wiring into a control's props. */
export function useFieldControl<P extends ControlProps>(props: P): P {
  const field = useContext(FieldContext);

  if (!field) {
    return props;
  }

  const describedBy = [field.descriptionId, field.errorId, props["aria-describedby"]]
    .filter(Boolean)
    .join(" ");

  return {
    ...props,
    id: props.id ?? field.id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid ? true : undefined),
  };
}

/** True when a control's aria-invalid marks it as failing validation. */
export function isInvalid(value: ControlProps["aria-invalid"]) {
  return value === true || value === "true";
}

export function Field({
  id,
  label,
  description,
  error,
  required = false,
  inline = false,
  labelHidden = false,
  className,
  children,
}: {
  /**
   * The control's id. Needed when the control is not Field's direct child
   * (e.g. inside a layout wrapper) and must keep a known id.
   */
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Checkbox and switch: the control sits left of its label. */
  inline?: boolean;
  labelHidden?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  const controlId = id ?? findControlId(children) ?? generatedId;
  const descriptionId = description ? `${generatedId}-description` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;

  const labelNode = (
    <label htmlFor={controlId} className={cn("text-sm font-medium text-app-fg", labelHidden && "sr-only")}>
      {label}
      {required ? (
        <span aria-hidden="true" className="text-app-danger-fg">
          {" "}
          *
        </span>
      ) : null}
    </label>
  );
  const descriptionNode = description ? (
    <p id={descriptionId} className="text-sm text-app-fg-muted">
      {description}
    </p>
  ) : null;
  const errorNode = error ? (
    <p id={errorId} className="text-sm font-medium text-app-danger-fg">
      {error}
    </p>
  ) : null;

  return (
    <FieldContext.Provider value={{ id: controlId, descriptionId, errorId, invalid: Boolean(error) }}>
      {inline ? (
        <div className={cn("flex items-start gap-3", className)}>
          <div className="flex h-6 shrink-0 items-center">{children}</div>
          <div className="grid gap-1">
            {labelNode}
            {descriptionNode}
            {errorNode}
          </div>
        </div>
      ) : (
        <div className={cn("grid gap-2", className)}>
          {labelNode}
          {children}
          {descriptionNode}
          {errorNode}
        </div>
      )}
    </FieldContext.Provider>
  );
}

/**
 * An id set on a kit control that is Field's direct child names it. Any other
 * child's id (a layout wrapper's) is left alone, or the control would share it.
 */
function findControlId(children: ReactNode): string | undefined {
  if (isValidElement(children) && FIELD_CONTROLS.has(children.type as object)) {
    const id = (children.props as { id?: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}
