import type { ReactNode } from "react";

import { cardStyles } from "@/components/app-ui/styles";
import { cn } from "@/lib/utils";

export function Card({
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "article";
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
}) {
  return (
    <Tag className={cardStyles(className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionHeading({
  title,
  description,
  actions,
  headingLevel = 2,
  titleId,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  titleId?: string;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <Heading id={titleId} className="text-base font-semibold text-app-fg">
          {title}
        </Heading>
        {description ? <p className="mt-1 text-sm text-app-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardHeader({
  divider = true,
  ...props
}: Parameters<typeof SectionHeading>[0] & { divider?: boolean }) {
  return (
    <SectionHeading
      {...props}
      className={cn("px-4 py-4 sm:px-6", divider && "border-b border-app-border", props.className)}
    />
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-4 py-5 sm:px-6", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-app-border px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
