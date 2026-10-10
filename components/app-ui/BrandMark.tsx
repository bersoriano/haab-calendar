import { cn } from "@/lib/utils";

const SIZES = { sm: "size-8 rounded-lg text-sm", lg: "size-10 rounded-xl text-base" } as const;

/** The Haab square. Decorative: whatever wraps it carries the name. */
export function BrandMark({ size = "sm", className }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid shrink-0 place-items-center bg-app-accent font-bold text-app-on-accent", SIZES[size], className)}
    >
      H
    </span>
  );
}
