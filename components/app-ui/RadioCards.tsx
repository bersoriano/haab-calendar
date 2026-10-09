"use client";

import { CheckCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const COLUMNS = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

export function RadioCards<T extends string>({
  name,
  value,
  onChange,
  options,
  ariaLabel,
  ariaLabelledBy,
  columns = 2,
  disabled = false,
  className,
}: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: {
    value: T;
    label: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    preview?: ReactNode;
    disabled?: boolean;
  }[];
  ariaLabel?: string;
  ariaLabelledBy?: string;
  columns?: 1 | 2 | 3 | 4;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn("grid grid-cols-1 gap-3", COLUMNS[columns], className)}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="group relative flex cursor-pointer flex-col gap-3 rounded-lg bg-app-surface p-4 ring-1 ring-app-border transition has-checked:ring-2 has-checked:ring-app-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-app-accent has-disabled:cursor-not-allowed has-disabled:opacity-50"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            disabled={disabled || option.disabled}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.preview}
          <span className="flex items-start gap-3">
            {option.icon ? <span className="shrink-0 text-app-fg-muted">{option.icon}</span> : null}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-app-fg">{option.label}</span>
              {option.description ? (
                <span className="mt-1 block text-sm text-app-fg-muted">{option.description}</span>
              ) : null}
            </span>
            <CheckCircle
              aria-hidden="true"
              size={20}
              weight="fill"
              className="invisible shrink-0 text-app-accent group-has-checked:visible"
            />
          </span>
        </label>
      ))}
    </div>
  );
}
