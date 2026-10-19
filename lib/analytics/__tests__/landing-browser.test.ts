// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeLanding } from "@/lib/analytics/landing-browser";

let root: HTMLElement;
let stop: (() => void) | undefined;
const capture = vi.fn();
function rect(selector: string, top: number, height: number) {
  root.querySelector(selector)!.getBoundingClientRect = () => new DOMRect(0, top, 1000, height);
}
function visible(value: boolean) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: value ? "visible" : "hidden" });
  document.dispatchEvent(new Event("visibilitychange"));
}
async function scroll() {
  window.dispatchEvent(new Event("scroll"));
  await vi.advanceTimersByTimeAsync(20);
}
beforeEach(() => {
  vi.useFakeTimers();
  capture.mockReset();
  document.body.innerHTML = `<div id="landing">
    <section data-landing-section="hero"><button data-landing-action="create_page"><span id="cta">Create</span></button></section>
    <section id="features"></section>
    <section id="faq"><details data-landing-faq="1" open><summary>Default</summary></details><details data-landing-faq="2"><summary>Question</summary></details></section>
    <section id="demo"><video data-landing-video></video></section>
    <footer data-landing-section="footer"><button data-landing-language="es">ES</button></footer>
  </div><button id="private" data-landing-action="create_page">Outside</button>`;
  root = document.getElementById("landing")!;
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 4000 });
  visible(true);
  rect('[data-landing-section="hero"]', 0, 1800);
  rect("#features", 2000, 2000);
  rect("#faq", 4100, 500);
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
});

describe("landing exposure", () => {
  it("counts tall sections after one continuous visible second and only once", async () => {
    stop = observeLanding(root, capture, () => "en");
    await vi.advanceTimersByTimeAsync(999);
    expect(capture.mock.calls.filter(([event]) => event === "landing_section_view")).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(capture).toHaveBeenCalledWith("landing_section_view", { section: "hero", language: "en" });
    await scroll();
    await vi.advanceTimersByTimeAsync(2000);
    expect(capture.mock.calls.filter(([event]) => event === "landing_section_view")).toHaveLength(1);
  });

  it("does not count quick passes or time spent in hidden tabs", async () => {
    stop = observeLanding(root, capture, () => "en");
    await vi.advanceTimersByTimeAsync(500);
    rect('[data-landing-section="hero"]', -2000, 1800);
    await scroll();
    await vi.advanceTimersByTimeAsync(1500);
    expect(capture.mock.calls.filter(([event]) => event === "landing_section_view")).toEqual([]);
    rect("#features", 0, 2000);
    await scroll();
    await vi.advanceTimersByTimeAsync(500);
    visible(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(capture.mock.calls.filter(([event]) => event === "landing_section_view")).toEqual([]);
    visible(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(capture).toHaveBeenCalledWith("landing_section_view", { section: "features", language: "en" });
  });

  it("keeps visit counts stable across language changes and records click placement", () => {
    let language = "en" as "en" | "es";
    stop = observeLanding(root, capture, () => language);
    document.getElementById("cta")!.click();
    expect(capture).toHaveBeenCalledWith("landing_cta_click", { action: "create_page", section: "hero", language: "en" });
    language = "es";
    root.querySelector<HTMLButtonElement>("[data-landing-language]")!.click();
    expect(capture).toHaveBeenCalledWith("landing_language_change", { target_language: "es", section: "footer", language: "es" });
    document.getElementById("private")!.click();
    expect(capture.mock.calls.filter(([event]) => event === "landing_cta_click")).toHaveLength(1);
    expect(capture.mock.calls.filter(([event]) => event === "$pageview")).toHaveLength(1);
  });

  it("ignores initially open FAQs and records deliberate opens", () => {
    stop = observeLanding(root, capture, () => "en");
    const initial = root.querySelector<HTMLDetailsElement>('[data-landing-faq="1"]')!;
    initial.dispatchEvent(new Event("toggle"));
    expect(capture.mock.calls.filter(([event]) => event === "landing_faq_open")).toEqual([]);
    const next = root.querySelector<HTMLDetailsElement>('[data-landing-faq="2"]')!;
    next.open = true;
    next.dispatchEvent(new Event("toggle"));
    expect(capture).toHaveBeenCalledWith("landing_faq_open", { question: 2, section: "faq", language: "en" });
  });

  it("records scroll thresholds once and ends visits once with foreground time", async () => {
    stop = observeLanding(root, capture, () => "en");
    await vi.advanceTimersByTimeAsync(2000);
    visible(false);
    await vi.advanceTimersByTimeAsync(3000);
    visible(true);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 3200 });
    await scroll();
    await scroll();
    expect(capture.mock.calls.filter(([event]) => event === "landing_scroll_depth").map(([, props]) => props.percent)).toEqual([25, 50, 75, 100]);
    window.dispatchEvent(new Event("pagehide"));
    stop();
    const leaves = capture.mock.calls.filter(([event]) => event === "$pageleave");
    expect(leaves).toHaveLength(1);
    expect(leaves[0][1]).toMatchObject({ duration_seconds: 5, active_seconds: 2, max_scroll_percent: 100 });
    const count = capture.mock.calls.length;
    document.getElementById("cta")!.click();
    await vi.advanceTimersByTimeAsync(2000);
    expect(capture.mock.calls).toHaveLength(count);
  });
});

describe("landing video engagement", () => {
  it("records actual playback milestones once, without treating a seek as watching", () => {
    stop = observeLanding(root, capture, () => "en");
    const video = root.querySelector("video")!;
    Object.defineProperty(video, "duration", { configurable: true, value: 20 });
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    video.dispatchEvent(new Event("play"));
    video.dispatchEvent(new Event("play"));
    for (let second = 1; second <= 6; second++) {
      video.currentTime = second;
      video.dispatchEvent(new Event("timeupdate"));
    }
    video.dispatchEvent(new Event("seeking"));
    video.currentTime = 20;
    video.dispatchEvent(new Event("seeked"));
    video.dispatchEvent(new Event("ended"));
    expect(capture.mock.calls.filter(([event]) => event === "landing_video_progress").map(([, props]) => props.milestone)).toEqual(["start", "25"]);
  });
});
