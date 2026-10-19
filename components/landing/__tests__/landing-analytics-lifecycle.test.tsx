// @vitest-environment happy-dom
import { StrictMode, act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LandingAnalytics } from "@/components/landing/landing-analytics";
import { LanguageProvider, useLanguage } from "@/components/landing/language-provider";
import type { LandingCapture } from "@/lib/analytics/landing-policy";

const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/landing-client", () => ({ loadLandingCapture: load }));
let root: Root;
let container: HTMLDivElement;
const capture = vi.fn();

function Surface() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { setLang } = useLanguage();
  return <div ref={rootRef}><LandingAnalytics rootRef={rootRef} /><button onClick={() => setLang("es")}>Español</button></div>;
}
const landing = <StrictMode><LanguageProvider initialLang="en"><Surface /></LanguageProvider></StrictMode>;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  capture.mockReset();
  load.mockReset().mockResolvedValue(capture);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("counts one pageview under Strict Mode and keeps language changes in the same visit", async () => {
  await act(async () => root.render(landing));
  expect(capture.mock.calls.filter(([event]) => event === "$pageview")).toHaveLength(1);
  await act(async () => container.querySelector("button")!.click());
  expect(document.documentElement.lang).toBe("es");
  expect(capture.mock.calls.filter(([event]) => event === "$pageview")).toHaveLength(1);
});

it("never starts tracking after leaving while the SDK loads", async () => {
  let resolve!: (capture: LandingCapture) => void;
  load.mockReturnValue(new Promise<LandingCapture>((done) => { resolve = done; }));
  await act(async () => root.render(landing));
  await act(async () => root.render(<p>Private workspace</p>));
  await act(async () => resolve(capture));
  expect(capture).not.toHaveBeenCalled();
  expect(container.textContent).toBe("Private workspace");
});

it("keeps landing controls functional when analytics is unavailable", async () => {
  load.mockRejectedValue(new Error("analytics blocked"));
  await act(async () => root.render(landing));
  await act(async () => container.querySelector("button")!.click());
  expect(document.documentElement.lang).toBe("es");
  expect(capture).not.toHaveBeenCalled();
});
