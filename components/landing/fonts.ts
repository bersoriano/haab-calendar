import { Bricolage_Grotesque, Figtree } from "next/font/google";

// Landing-only faces. They are applied to the `.haab-landing` wrapper (see
// LandingScope), never to <html> or <body>, so the booking flow keeps Inter.
export const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  // The optical-size axis tightens the letterforms at display sizes, which is
  // what keeps the 66px headline lines on one line as in the reference.
  axes: ["opsz"],
  display: "swap",
});

export const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
