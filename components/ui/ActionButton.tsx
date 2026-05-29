import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/buttonClasses";

export function ActionButton({
  children,
  className,
  tone = "secondary",
  ...props
}: {
  children: ReactNode;
  className?: string;
  tone?: "primary" | "secondary" | "ghost" | "danger";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={buttonClasses(tone, className)}
    >
      {children}
    </button>
  );
}
