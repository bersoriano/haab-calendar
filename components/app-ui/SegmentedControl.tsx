"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { appControl, segmentStyles } from "@/components/app-ui/styles";
import { cn } from "@/lib/utils";

/** Roving-focus movement for a radiogroup: arrows wrap, Home/End jump. */
export function nextSegmentIndex(current: number, key: string, length: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return (current + 1) % length;
  if (key === "ArrowLeft" || key === "ArrowUp") return (current - 1 + length) % length;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return null;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  ariaLabel: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextSegmentIndex(index, event.key, options.length);
    if (next === null) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-app-subtle p-1", className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;

        return (
          <button
            {...appControl}
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={segmentStyles(selected)}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className="rounded-md bg-app-subtle px-1.5 py-0.5 text-xs font-medium tabular-nums text-app-fg-secondary">
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
