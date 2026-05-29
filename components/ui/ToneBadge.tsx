import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { compactBadgeTextClass } from "@/lib/constants";

export function ToneBadge({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "secondary" | "danger" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[0.75rem] px-3 py-1 backdrop-blur-[20px]",
        compactBadgeTextClass,
        tone === "primary" &&
          "bg-[rgba(26,115,232,0.12)] text-[var(--primary-container)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
        tone === "secondary" &&
          "bg-[rgba(243,244,245,0.72)] text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        tone === "danger" && "bg-[rgba(255,241,242,0.86)] text-[#be123c]",
        tone === "neutral" &&
          "bg-[rgba(104,250,221,0.22)] text-[var(--action-teal-deep)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
      )}
    >
      {children}
    </span>
  );
}
