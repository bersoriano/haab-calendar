import type { Lang } from "@/lib/types";

/**
 * The one-minute product demo on the landing page: Haab's real booking flow on
 * a demo page with a fictional patient, narrated in English. Self-hosted in
 * public/video (720p H.264, faststart). The source render and how to re-encode
 * it are in docs/landing-demo-video.md.
 */
export const DEMO_VIDEO = {
  src: "/video/haab-calendar-demo.mp4",
  poster: "/video/haab-calendar-demo.jpg",
  width: 1280,
  height: 720,
  captions: {
    en: "/video/haab-calendar-demo.en.vtt",
    es: "/video/haab-calendar-demo.es.vtt",
  },
} as const;

/** English captions the narration; Spanish subtitles translate it. Labels are
 * each language's own name, as browsers list them. */
const CAPTION_TRACKS = [
  { kind: "captions", srcLang: "en", label: "English", src: DEMO_VIDEO.captions.en },
  { kind: "subtitles", srcLang: "es", label: "Español", src: DEMO_VIDEO.captions.es },
] as const satisfies readonly { kind: TextTrackKind; srcLang: Lang; label: string; src: string }[];

/**
 * Caption tracks, with the page's language on by default. Keep exactly one on:
 * iOS (Safari, and Chrome on iPhone) stalls on play when every track is off.
 */
export function demoCaptionTracks(lang: Lang) {
  return CAPTION_TRACKS.map((track) => ({ ...track, default: track.srcLang === lang }));
}

/**
 * Track modes after a language switch, which doesn't reload the page (and
 * browsers read `default` only once). The page's language comes first, so a
 * track is on before the other turns off and they are never all off at once.
 */
export function demoCaptionModes(lang: Lang): [srcLang: Lang, mode: TextTrackMode][] {
  return demoCaptionTracks(lang)
    .sort((a, b) => Number(b.default) - Number(a.default))
    .map((track) => [track.srcLang, track.default ? "showing" : "disabled"]);
}
