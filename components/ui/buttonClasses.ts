import { cn } from "@/lib/utils";

export function buttonClasses(
  tone: "primary" | "secondary" | "ghost" | "danger",
  className?: string,
) {
  return cn(
    "inline-flex min-h-11 items-center justify-center rounded-[0.75rem] px-4 text-sm font-semibold transition-[transform,filter,box-shadow,background-color,color] duration-200 disabled:cursor-not-allowed disabled:opacity-45",
    tone === "primary" &&
      "bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-white shadow-[0_30px_48px_rgba(25,28,29,0.08),0_14px_32px_rgba(26,115,232,0.24)] hover:saturate-125 hover:shadow-[0_34px_54px_rgba(25,28,29,0.1),0_18px_36px_rgba(26,115,232,0.3)]",
    tone === "secondary" &&
      "bg-[rgba(243,244,245,0.96)] text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_36px_rgba(25,28,29,0.05)] hover:bg-[rgba(255,255,255,0.92)] hover:text-[var(--primary-container)]",
    tone === "ghost" &&
      "bg-transparent text-[var(--muted)] hover:bg-[rgba(243,244,245,0.72)] hover:text-[var(--ink)]",
    tone === "danger" &&
      "bg-[rgba(255,241,242,0.92)] text-[#be123c] shadow-[0_18px_36px_rgba(25,28,29,0.04)] hover:bg-[rgba(255,228,230,0.96)]",
    className,
  );
}
