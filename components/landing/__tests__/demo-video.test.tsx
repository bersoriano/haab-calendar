import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DemoVideo } from "@/components/landing/demo-video";
import { LanguageProvider } from "@/components/landing/language-provider";
import { translations } from "@/components/landing/translations";
import type { Lang } from "@/lib/types";

function render(lang: Lang) {
  return renderToStaticMarkup(
    <LanguageProvider initialLang={lang}>
      <DemoVideo />
    </LanguageProvider>,
  );
}

const LANGS: Lang[] = ["en", "es"];

describe("landing demo video section", () => {
  it.each(LANGS)("plays only when asked, with native controls (%s)", (lang) => {
    const video = render(lang).match(/<video[^>]*>/)?.[0] ?? "";

    expect(video).toMatch(/\bcontrols=""/);
    expect(video).toMatch(/\bpreload="none"/);
    expect(video).toMatch(/\bplaysInline=""/);
    expect(video).toMatch(/\bposter="\/video\/haab-calendar-demo\.jpg"/);
    expect(video).not.toMatch(/autoplay/i);
    expect(video).not.toMatch(/\bmuted/);
  });

  it.each(LANGS)("turns on the %s caption track and only that one", (lang) => {
    const tracks = render(lang).match(/<track[^>]*>/g) ?? [];
    const on = tracks.filter((track) => /\bdefault=""/.test(track));

    expect(tracks).toHaveLength(2);
    expect(on).toHaveLength(1);
    expect(on[0]).toContain(`srcLang="${lang}"`);
  });

  it.each(LANGS)("speaks the page's language (%s)", (lang) => {
    const html = render(lang);

    expect(html).toContain('id="demo"');
    expect(html).toContain(translations[lang].demoVideo.title);
    expect(html).toContain(translations[lang].demoVideo.download);
  });

  it("sits between How it works and the live examples", () => {
    const landing = readFileSync(join(process.cwd(), "components/landing/landing-ui.tsx"), "utf8");
    const how = landing.indexOf("<HowItWorks />");
    const demo = landing.indexOf("<DemoVideo />");
    const examples = landing.indexOf("<LiveExamples ");

    expect(how).toBeGreaterThan(-1);
    expect(demo).toBeGreaterThan(how);
    expect(examples).toBeGreaterThan(demo);
  });
});
