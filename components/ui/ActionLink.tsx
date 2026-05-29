import Link from "next/link";
import { type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/buttonClasses";

export function ActionLink({
  href,
  children,
  className,
  onClick,
  tone = "secondary",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <Link href={href} onClick={onClick} className={buttonClasses(tone, className)}>
      {children}
    </Link>
  );
}
