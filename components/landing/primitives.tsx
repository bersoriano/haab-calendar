import Link from "next/link";
import { ArrowRight, Check } from "@phosphor-icons/react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { bricolage, figtree } from "./fonts";
import "./landing.css";

/**
 * Wraps landing content so the `--lp-*` tokens and the landing-only fonts
 * exist for everything inside it, and nowhere else. Dialogs and the booking
 * flow sit outside it and keep the app's own tokens.
 */
export function LandingScope({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("haab-landing", bricolage.variable, figtree.variable, className)}>
      {children}
    </div>
  );
}

/** Display face for headings, numbers and the wordmark. */
export const lpDisplay = "font-[family-name:var(--lp-font-display)]";
/** Mono face for eyebrows and small labels (IBM Plex Mono, loaded in layout). */
/** Landing body face + ink. Apply on landing text roots, never on the wrapper. */
export const lpBody = "lp-body";
export const lpMono = "font-[family-name:var(--lp-font-mono)]";

type EyebrowTone = "teal" | "blue" | "night";

const eyebrowText: Record<EyebrowTone, string> = {
  teal: "text-[var(--lp-teal-600)]",
  blue: "text-[var(--lp-blue-700)]",
  night: "text-[var(--lp-mint-300)]",
};

const eyebrowMarker: Record<EyebrowTone, string> = {
  teal: "bg-[var(--lp-teal-400)]",
  blue: "bg-[var(--lp-blue-600)]",
  night: "bg-[var(--lp-mint-300)]",
};

export function Eyebrow({
  children,
  tone = "teal",
  className,
}: {
  children: ReactNode;
  tone?: EyebrowTone;
  className?: string;
}) {
  return (
    <p
      className={cn(
        lpMono,
        "flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] sm:gap-2.5 sm:text-[13px]",
        eyebrowText[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-[7px] w-[7px] shrink-0 rounded-[2px] sm:h-2 sm:w-2 sm:rounded-[3px]", eyebrowMarker[tone])}
      />
      {children}
    </p>
  );
}

/**
 * Split: heading left, intro right and bottom-aligned. Centered: both centred
 * (How it works). Both stack on phones.
 */
export function SectionHeading({
  eyebrow,
  title,
  body,
  layout = "split",
  tone = "teal",
  night = false,
  as: Heading = "h2",
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  /** A page's own heading is the h1; sections keep the default h2. */
  as?: "h1" | "h2";
  layout?: "split" | "centered";
  tone?: EyebrowTone;
  /** Set on the dark band so the heading and intro switch to light ink. */
  night?: boolean;
  className?: string;
}) {
  const centered = layout === "centered";

  return (
    <div
      className={cn(
        lpBody,
        "flex flex-col gap-3.5 sm:gap-[18px]",
        centered
          ? "items-center text-center"
          : "lg:flex-row lg:items-end lg:justify-between lg:gap-16",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3.5 sm:gap-[18px]",
          centered ? "items-center" : "lg:max-w-[700px]",
        )}
      >
        {eyebrow ? <Eyebrow tone={night ? "night" : tone}>{eyebrow}</Eyebrow> : null}
        <Heading
          className={cn(
            lpDisplay,
            "text-balance text-[36px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[44px] lg:text-[54px] lg:leading-[1.04]",
            night ? "text-white" : "text-[var(--lp-ink)]",
            centered && "max-w-[820px]",
          )}
        >
          {title}
        </Heading>
      </div>
      {body ? (
        <p
          className={cn(
            "text-[16.5px] leading-[1.55] sm:text-[18px] lg:max-w-[400px]",
            night ? "text-[var(--lp-night-text)]" : "text-[var(--lp-muted)]",
          )}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}

export type LpButtonVariant =
  | "primary"
  | "secondary"
  | "inverse"
  | "ghost-inverse"
  | "outline-ink";

/** Heights are the spec's: 56 hero/CTA, 48 cards, 44 nav (all >= 44px targets). */
export type LpButtonSize = "nav" | "card" | "hero";

const variantClass: Record<LpButtonVariant, string> = {
  primary:
    "bg-[var(--lp-teal-700)] !text-white shadow-[var(--lp-shadow-cta)] hover:bg-[var(--lp-teal-700-hover)]",
  secondary:
    "border-[1.5px] border-[#c9dad6] bg-white text-[var(--lp-ink)] hover:border-[var(--lp-teal-600)]",
  inverse: "bg-white text-[var(--lp-teal-700)] hover:bg-[var(--lp-mint-band)]",
  "ghost-inverse":
    "border-[1.5px] border-white/50 text-white hover:border-white hover:bg-white/10",
  "outline-ink":
    "border-[1.5px] border-[var(--lp-ink)] text-[var(--lp-ink)] hover:bg-[var(--lp-ink)] hover:!text-white",
};

const sizeClass: Record<LpButtonSize, string> = {
  nav: "h-11 gap-2 px-5 text-[15.5px]",
  card: "h-12 gap-2.5 px-[22px] text-[16px]",
  hero: "h-[54px] gap-2.5 px-7 text-[17px] sm:h-14",
};

export function lpButtonClass({
  variant = "primary",
  size = "hero",
  className,
}: {
  variant?: LpButtonVariant;
  size?: LpButtonSize;
  className?: string;
} = {}) {
  return cn(
    lpBody,
    "inline-flex items-center justify-center whitespace-nowrap rounded-full font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-teal-600)] focus-visible:ring-offset-2 active:translate-y-px",
    variantClass[variant],
    sizeClass[size],
    className,
  );
}

type LpButtonProps = {
  variant?: LpButtonVariant;
  size?: LpButtonSize;
  /** Right-hand arrow; the spec puts it on primary buttons. */
  arrow?: boolean;
  /** Leading pulsing dot for "See a real page" style buttons. */
  live?: boolean;
  className?: string;
  children: ReactNode;
} & (
  | { href: string; onClick?: never; type?: never }
  | { href?: undefined; onClick?: () => void; type?: "button" | "submit" }
);

/**
 * One button for every landing action. With `href` it renders a link, without
 * it a real <button>, so StartButton/DemoButton-style actions stay buttons.
 */
export function LpButton({
  variant = "primary",
  size = "hero",
  arrow = false,
  live = false,
  className,
  children,
  href,
  onClick,
  type = "button",
}: LpButtonProps) {
  const classes = lpButtonClass({ variant, size, className });
  const content = (
    <>
      {live ? (
        <span
          aria-hidden="true"
          className="haab-live-dot h-2 w-2 rounded-full bg-[var(--lp-teal-400)] shadow-[0_0_0_4px_rgba(31,209,178,0.2)]"
        />
      ) : null}
      {children}
      {arrow ? <ArrowRight aria-hidden="true" weight="bold" className="h-4 w-4 shrink-0" /> : null}
    </>
  );

  if (href !== undefined) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

export function CheckChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        lpBody,
        "inline-flex items-center gap-1.5 rounded-[12px] border border-[#dce8e5] bg-white/75 px-3 py-[7px] text-[13.5px] font-semibold text-[var(--lp-ink-2)] sm:gap-2 sm:px-3.5 sm:py-2 sm:text-[14.5px]",
        className,
      )}
    >
      <Check aria-hidden="true" weight="bold" className="h-3.5 w-3.5 shrink-0 text-[var(--lp-teal-600)] sm:h-4 sm:w-4" />
      {children}
    </span>
  );
}

type IconTileTone = "teal" | "teal-400" | "blue" | "violet" | "coral" | "sun" | "mint-soft" | "blue-soft" | "coral-soft";

const tileTone: Record<IconTileTone, string> = {
  teal: "bg-[var(--lp-teal-600)] text-white",
  "teal-400": "bg-[var(--lp-teal-400)] text-[var(--lp-teal-on-400)]",
  blue: "bg-[var(--lp-blue-600)] text-white",
  violet: "bg-[var(--lp-violet-600)] text-white",
  coral: "bg-[var(--lp-coral-600)] text-white",
  sun: "bg-[var(--lp-sun-500)] text-[var(--lp-sun-ink)]",
  "mint-soft": "bg-[var(--lp-mint-band)] text-[var(--lp-teal-600)]",
  "blue-soft": "bg-[var(--lp-blue-100)] text-[var(--lp-blue-700)]",
  "coral-soft": "bg-[var(--lp-coral-100)] text-[var(--lp-coral-700)]",
};

type PhosphorIcon = ComponentType<{
  className?: string;
  weight?: "regular" | "bold";
  "aria-hidden"?: boolean | "true";
}>;

/** Solid industry-coloured square with an icon. Decorative: the icon is aria-hidden. */
export function IconTile({
  icon: Icon,
  tone = "teal",
  size = 48,
  className,
}: {
  icon: PhosphorIcon;
  tone?: IconTileTone;
  /** Tile edge in px (spec: 44-52). The icon scales with it. */
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 48 ? 16 : size >= 44 ? 14 : 12,
      }}
      className={cn("flex shrink-0 items-center justify-center", tileTone[tone], className)}
    >
      <Icon aria-hidden="true" weight="regular" className="h-[52%] w-[52%]" />
    </span>
  );
}

/** A big number with a one-line caption, for the fact strip. */
export function StatCell({
  value,
  caption,
  valueClassName,
  className,
}: {
  value: ReactNode;
  caption: string;
  /** Colour class for the number, e.g. `text-[var(--lp-teal-600)]`. */
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn(lpBody, "flex flex-col gap-1 p-5 sm:px-8 sm:py-7", className)}>
      <div
        className={cn(
          lpDisplay,
          "text-[30px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[40px]",
          valueClassName ?? "text-[var(--lp-ink)]",
        )}
      >
        {value}
      </div>
      <div className="text-[13.5px] leading-[1.4] text-[var(--lp-muted)] sm:text-[15px] sm:leading-[1.45]">
        {caption}
      </div>
    </div>
  );
}
