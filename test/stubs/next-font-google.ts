// next/font/google is compiled away by Next's SWC plugin; outside a Next build
// the functions do not exist. Unit tests only need the shape of the result.
type FontResult = { className: string; variable: string; style: { fontFamily: string } };

const font = (): FontResult => ({ className: "", variable: "", style: { fontFamily: "" } });

export const Bricolage_Grotesque = font;
export const Figtree = font;
export const Inter = font;
export const IBM_Plex_Mono = font;
