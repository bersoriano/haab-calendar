import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  icon,
  action,
  variant = "plain",
  headingLevel = 3,
  className,
}: {
  title: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: "plain" | "dashed";
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <div
      className={cn(
        "px-6 py-10 text-center",
        variant === "dashed" && "rounded-xl border-2 border-dashed border-app-border-strong",
        className,
      )}
    >
      {icon ? <div className="mx-auto mb-3 flex justify-center text-app-fg-muted">{icon}</div> : null}
      <Heading className="text-sm font-semibold text-app-fg">{title}</Heading>
      {body ? <p className="mx-auto mt-1 max-w-md text-sm text-app-fg-muted">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
