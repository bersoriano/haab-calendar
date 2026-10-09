"use client";

import { CaretDown } from "@phosphor-icons/react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { isInvalid, useFieldControl } from "@/components/app-ui/Field";
import { focusRing, inputStyles } from "@/components/app-ui/styles";
import { cn } from "@/lib/utils";

export function Input({
  leadingAddon,
  trailingAddon,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { leadingAddon?: ReactNode; trailingAddon?: ReactNode }) {
  const control = useFieldControl(props);
  const invalid = isInvalid(control["aria-invalid"]);

  if (!leadingAddon && !trailingAddon) {
    return <input {...control} className={inputStyles({ invalid, className: cn("h-11 sm:h-9", className) })} />;
  }

  return (
    <div
      className={cn(
        "flex h-11 items-center rounded-lg bg-app-surface outline-1 -outline-offset-1 focus-within:outline-2 focus-within:-outline-offset-2 sm:h-9",
        invalid
          ? "outline-app-danger-fg focus-within:outline-app-danger-fg"
          : "outline-app-border-strong focus-within:outline-app-accent",
        className,
      )}
    >
      {leadingAddon ? (
        <span className="flex shrink-0 select-none items-center pl-3 text-sm text-app-fg-muted">
          {leadingAddon}
        </span>
      ) : null}
      <input
        {...control}
        className="block h-full min-w-0 grow bg-transparent px-3 text-base! text-app-fg placeholder:text-app-placeholder focus:outline-none disabled:cursor-not-allowed disabled:text-app-fg-muted sm:text-sm!"
      />
      {trailingAddon ? (
        <span className="flex shrink-0 items-center pr-1.5 text-sm text-app-fg-muted">{trailingAddon}</span>
      ) : null}
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const control = useFieldControl(props);

  return (
    <textarea
      {...control}
      className={inputStyles({ invalid: isInvalid(control["aria-invalid"]), className: cn("min-h-24 py-2", className) })}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const control = useFieldControl(props);

  return (
    <div className={cn("grid grid-cols-1", className)}>
      <select
        {...control}
        className={inputStyles({
          invalid: isInvalid(control["aria-invalid"]),
          className: "col-start-1 row-start-1 h-11 appearance-none pr-8 sm:h-9",
        })}
      >
        {children}
      </select>
      <CaretDown
        aria-hidden="true"
        size={16}
        className="pointer-events-none col-start-1 row-start-1 mr-2.5 self-center justify-self-end text-app-fg-muted"
      />
    </div>
  );
}

export function Checkbox({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const control = useFieldControl(props);

  return (
    <input
      {...control}
      type="checkbox"
      className={cn(
        "size-4 rounded border-app-border-strong accent-app-accent disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className,
      )}
    />
  );
}

/** A native checkbox announced as a switch, drawn as a toggle. */
export function Switch({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role">) {
  const control = useFieldControl(props);

  return (
    <span
      className={cn(
        "group relative inline-flex h-6 w-11 shrink-0 rounded-full bg-app-border-strong p-0.5 transition-colors has-checked:bg-app-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-app-accent has-disabled:opacity-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-5 rounded-full bg-app-surface shadow-xs ring-1 ring-app-border transition-transform group-has-checked:translate-x-5"
      />
      <input
        {...control}
        type="checkbox"
        role="switch"
        className="absolute inset-0 size-full cursor-pointer appearance-none focus:outline-none disabled:cursor-not-allowed forced-colors:appearance-auto"
      />
    </span>
  );
}
