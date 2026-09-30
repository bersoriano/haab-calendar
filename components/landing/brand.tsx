import Link from "next/link";
import { cn } from "@/lib/utils";
import { lpDisplay } from "./primitives";

/**
 * Logo tile with its status dot, and the wordmark. The dot's ring is drawn in
 * the ground colour so it reads as cut out; `onNight` swaps both for the dark
 * footer.
 */
export function BrandLink({
  label,
  onNight = false,
  hideLabelOnTiny = false,
}: {
  label: string;
  onNight?: boolean;
  /** The nav drops the wordmark under 380px to make room for the controls. */
  hideLabelOnTiny?: boolean;
}) {
  return (
    <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap xl:gap-3">
      <span
        className={cn(
          lpDisplay,
          "relative grid h-[34px] w-[34px] place-items-center rounded-[11px] bg-[var(--lp-blue-600)] text-[18px] font-extrabold text-white xl:h-[38px] xl:w-[38px] xl:rounded-[12px] xl:text-[20px]",
          !onNight && "shadow-[var(--lp-shadow-logo)]",
        )}
      >
        H
        <span
          aria-hidden="true"
          className={cn(
            "absolute -right-[3px] -top-[3px] h-[11px] w-[11px] rounded-full border-2 bg-[var(--lp-teal-400)] xl:h-3 xl:w-3",
            onNight ? "border-[var(--lp-night)]" : "border-[var(--lp-paper)]",
          )}
        />
      </span>
      <span
        className={cn(
          lpDisplay,
          "text-[18px] font-bold tracking-[-0.02em] xl:text-[20px]",
          onNight ? "text-white" : "text-[var(--lp-ink)]",
          hideLabelOnTiny && "max-[379px]:sr-only",
        )}
      >
        {label}
      </span>
    </Link>
  );
}
