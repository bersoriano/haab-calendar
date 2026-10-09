import { cn } from "@/lib/utils";

const SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" } as const;

export function Avatar({
  name,
  src,
  size = "md",
  shape = "circle",
  className,
}: {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  shape?: "circle" | "square";
  className?: string;
}) {
  const classes = cn(
    "shrink-0 overflow-hidden",
    SIZES[size],
    shape === "circle" ? "rounded-full" : "rounded-lg",
    className,
  );

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded image on an arbitrary host
    return <img src={src} alt="" className={cn(classes, "bg-app-surface object-cover ring-1 ring-app-border")} />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn(classes, "grid place-items-center bg-app-accent-soft font-semibold text-app-accent-on-soft")}
    >
      {name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
