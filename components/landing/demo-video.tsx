"use client";

import { useEffect, useRef } from "react";
import { DEMO_VIDEO, demoCaptionModes, demoCaptionTracks } from "@/lib/demo-video";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";
import { Reveal } from "./reveal";
import { SectionHeading, lpBody } from "./primitives";

/**
 * The one-minute demo, between "How it works" and the live examples: setup in
 * three steps, then a client booking, then a page to try. It never autoplays
 * and loads nothing but the poster until the visitor presses play. Captions in
 * the page's language are on (see demoCaptionTracks) and follow the switch.
 */
export function DemoVideo() {
  const { lang, t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  // The language the tracks show. Loading uses `default`; only a later switch
  // sets the modes, so the first render stays exactly as iOS expects.
  const shownLang = useRef(lang);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || shownLang.current === lang) {
      return;
    }

    shownLang.current = lang;
    const tracks = [...video.querySelectorAll("track")];
    for (const [srcLang, mode] of demoCaptionModes(lang)) {
      const track = tracks.find((element) => element.srclang === srcLang)?.track;
      if (track) {
        track.mode = mode;
      }
    }
  }, [lang]);

  return (
    <section
      id="demo"
      className={cn(
        lpBody,
        "scroll-mt-24 bg-[var(--lp-night)] px-5 py-[72px] text-white sm:px-8 lg:py-[120px]",
      )}
    >
      <div className="mx-auto flex max-w-[1000px] flex-col gap-8 lg:gap-12">
        <SectionHeading
          night
          layout="centered"
          eyebrow={t.demoVideo.eyebrow}
          title={t.demoVideo.title}
          body={t.demoVideo.body}
          className="lg:[&_p]:max-w-[640px]"
        />
        <Reveal>
          <figure className="flex flex-col gap-3.5">
            <div className="overflow-hidden rounded-[16px] border border-[var(--lp-night-line)] bg-[var(--lp-night-2)] sm:rounded-[24px]">
              <video
                data-landing-video
                ref={videoRef}
                className="block aspect-video h-auto w-full"
                controls
                preload="none"
                playsInline
                poster={DEMO_VIDEO.poster}
                width={DEMO_VIDEO.width}
                height={DEMO_VIDEO.height}
                aria-label={t.demoVideo.videoLabel}
              >
                <source src={DEMO_VIDEO.src} type="video/mp4" />
                {demoCaptionTracks(lang).map((track) => (
                  <track
                    key={track.srcLang}
                    kind={track.kind}
                    srcLang={track.srcLang}
                    label={track.label}
                    src={track.src}
                    default={track.default}
                  />
                ))}
                <a href={DEMO_VIDEO.src}>{t.demoVideo.download}</a>
              </video>
            </div>
            <figcaption className="text-center text-[14px] leading-[1.5] text-[var(--lp-night-muted)]">
              {t.demoVideo.note}
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
