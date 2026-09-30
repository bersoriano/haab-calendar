"use client";

import { useCallback, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades a section in the first time it reaches the viewport.
 *
 * The hidden class is added by script rather than sitting in the markup, so a
 * visitor whose JS never runs — or whose browser lacks IntersectionObserver —
 * gets the fully visible page instead of an empty one. Reduced motion is
 * handled in CSS, where both reveal classes collapse to "visible, no
 * transition".
 */
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  // A ref callback rather than an effect: the hidden class is only ever
  // applied to an element that was measured as below the fold, so nothing
  // already on screen flashes out and back in.
  const attach = useCallback((node: HTMLDivElement | null) => {
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }

    if (node.getBoundingClientRect().top < window.innerHeight) {
      return;
    }

    setState("hidden");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={attach}
      className={cn(
        state === "hidden" && "haab-reveal",
        state === "shown" && "haab-reveal-in",
        className,
      )}
    >
      {children}
    </div>
  );
}
