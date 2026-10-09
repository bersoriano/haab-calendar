import type { ReactNode } from "react";

import { badgeStyles } from "@/components/app-ui/styles";
import type { StatusTone } from "@/lib/format";

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={badgeStyles(tone, className)}>
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
