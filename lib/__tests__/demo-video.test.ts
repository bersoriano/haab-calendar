import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEMO_VIDEO, demoCaptionModes, demoCaptionTracks } from "@/lib/demo-video";
import { config } from "@/proxy";
import type { Lang } from "@/lib/types";

const LANGS: Lang[] = ["en", "es"];
const publicFile = (path: string) => join(process.cwd(), "public", path);

function cueTimings(path: string) {
  return readFileSync(publicFile(path), "utf8").match(/^\d{2}:\d{2}:\d{2}\.\d{3} --> .+$/gm);
}

describe("landing demo video", () => {
  // iOS (Safari, and Chrome on iPhone) stalls on play when a video has caption
  // tracks and none of them is `default`: the button flips to pause and the
  // time never moves. Desktop browsers don't show it.
  it.each(LANGS)("turns on exactly one caption track, in the page's language (%s)", (lang) => {
    const defaults = demoCaptionTracks(lang).filter((track) => track.default);

    expect(defaults.map((track) => track.srcLang)).toEqual([lang]);
  });

  // The landing switches language without a reload, and browsers read
  // `default` only once, so a switch sets the modes itself. The new language
  // comes first, so the tracks are never all off at once.
  it("switches captions with the language, turning the new one on first", () => {
    expect(demoCaptionModes("en")).toEqual([
      ["en", "showing"],
      ["es", "disabled"],
    ]);
    expect(demoCaptionModes("es")).toEqual([
      ["es", "showing"],
      ["en", "disabled"],
    ]);
  });

  it("ships a light video, poster and both caption files from our own domain", () => {
    expect(DEMO_VIDEO.src).toBe("/video/haab-calendar-demo.mp4");
    expect(statSync(publicFile(DEMO_VIDEO.src)).size).toBeLessThanOrEqual(5 * 1024 * 1024);
    expect(statSync(publicFile(DEMO_VIDEO.poster)).size).toBeLessThanOrEqual(150 * 1024);
    for (const lang of LANGS) {
      expect(readFileSync(publicFile(DEMO_VIDEO.captions[lang]), "utf8")).toMatch(/^WEBVTT\n/);
    }
  });

  it("keeps the English and Spanish captions on the same timings", () => {
    const en = cueTimings(DEMO_VIDEO.captions.en);

    expect(en?.length).toBeGreaterThan(0);
    expect(cueTimings(DEMO_VIDEO.captions.es)).toEqual(en);
  });

  // iOS fetches a video in many range requests; none of them, nor the caption
  // files, should run the session proxy.
  it("serves the video and its captions without running the proxy", () => {
    const matcher = config.matcher.map((source) => new RegExp(`^${source}$`));
    const proxied = (path: string) => matcher.some((pattern) => pattern.test(path));

    expect(proxied(DEMO_VIDEO.src)).toBe(false);
    expect(proxied(DEMO_VIDEO.captions.en)).toBe(false);
    expect(proxied(DEMO_VIDEO.captions.es)).toBe(false);
    expect(proxied("/")).toBe(true);
    expect(proxied("/dashboard")).toBe(true);
  });
});
