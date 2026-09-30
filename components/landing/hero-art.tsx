/**
 * Decorative hero atmosphere: three blurred glows and a dot grid. Everything
 * is aria-hidden and pointer-events-none, so it never affects the layout above.
 */
export function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="lp-glow-mint absolute -left-40 -top-36 h-[420px] w-[420px] rounded-full lg:-left-44 lg:-top-56 lg:h-[720px] lg:w-[720px]" />
      <div className="lp-glow-blue absolute -right-52 top-[420px] h-[520px] w-[520px] rounded-full lg:-right-32 lg:top-14 lg:h-[900px] lg:w-[900px]" />
      <div className="lp-glow-coral absolute -left-28 bottom-14 h-[320px] w-[320px] rounded-full lg:bottom-[-160px] lg:left-auto lg:right-[420px] lg:h-[420px] lg:w-[420px]" />
      <div className="lp-dot-grid absolute inset-0" />
    </div>
  );
}

/** The hand-drawn coral underline under the H1's last line. */
export function HeadlineUnderline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 16"
      preserveAspectRatio="none"
      fill="none"
      className="absolute bottom-[-10px] left-0 h-3 w-full lg:bottom-[-14px] lg:h-4"
    >
      <path
        d="M3 11C80 4 170 3 250 6s110 4 147 1"
        stroke="#FF7A59"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
