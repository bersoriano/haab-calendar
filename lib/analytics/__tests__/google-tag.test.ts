import { Window } from "happy-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GOOGLE_ANALYTICS_SCRIPT } from "@/lib/analytics/google-tag";

let window: Window;
let analyticsWindow: Record<string, unknown>;

beforeEach(() => {
  window = new Window({
    url: "https://haabcalendar.com/",
    settings: { disableJavaScriptFileLoading: true, handleDisabledFileLoadingAsSuccess: true },
  });
  analyticsWindow = window as unknown as Record<string, unknown>;
});

afterEach(async () => { await window.happyDOM.close(); });

function start(path: string) {
  window.happyDOM.setURL(new URL(path, window.location.href).href);
  window.eval(GOOGLE_ANALYTICS_SCRIPT);
}

describe("Google Analytics privacy boundary", () => {
  it("initializes marketing collection without query strings or fragments", () => {
    start("/?lang=es&utm_source=newsletter");
    const commands = (analyticsWindow.dataLayer as IArguments[]).map((args) => Array.from(args));
    expect(commands[1]).toEqual(["config", "G-PDRMG0Z2SM", expect.objectContaining({
      page_location: `${window.location.origin}/`,
      page_referrer: "",
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    })]);
    expect(window.document.querySelector("script")?.src).toBe("https://www.googletagmanager.com/gtag/js?id=G-PDRMG0Z2SM");
  });

  it.each([
    "/doctors/test/manage/private-token",
    "/public/test/manage/private-token",
    "/dashboard",
    "/reset-password",
    "/?token=private-token",
    "/#access_token=private-token",
  ])("never loads Google on sensitive URL %s", (path) => {
    start(path);
    expect(window.document.querySelector("script")).toBeNull();
    expect(analyticsWindow.dataLayer).toBeUndefined();
  });

  it.each(["pushState", "replaceState"] as const)("disables collection before %s reaches a private URL", (method) => {
    const original = window.history[method];
    let disabledAtNavigation: unknown;
    window.history[method] = function (...args) {
      disabledAtNavigation = analyticsWindow["ga-disable-G-PDRMG0Z2SM"];
      return original.apply(this, args);
    };
    start("/");
    window.history[method](null, "", "/public/test/manage/private-token");
    expect(disabledAtNavigation).toBe(true);
    expect(analyticsWindow["ga-disable-G-PDRMG0Z2SM"]).toBe(true);
    window.history[method](null, "", "/gallery");
    expect(analyticsWindow["ga-disable-G-PDRMG0Z2SM"]).toBe(true);
  });

  it("disables collection on back/forward navigation to private pages", () => {
    start("/");
    window.happyDOM.setURL("https://haabcalendar.com/public/test/manage/private-token");
    window.dispatchEvent(new window.PopStateEvent("popstate"));
    expect(analyticsWindow["ga-disable-G-PDRMG0Z2SM"]).toBe(true);
  });

  it("keeps collection active between marketing pages and section anchors", () => {
    start("/");
    window.history.pushState(null, "", "/en/online-booking-for-doctors#faq");
    expect(analyticsWindow["ga-disable-G-PDRMG0Z2SM"]).toBeUndefined();
  });

  it.each(["http://localhost:3000/", "https://preview.vercel.app/"])("excludes non-production host %s", (url) => {
    start(url);
    expect(window.document.querySelector("script")).toBeNull();
  });

  it("removes private paths and query strings from the initial referrer", () => {
    Object.defineProperty(window.document, "referrer", { value: "https://haabcalendar.com/public/test/manage/private-token?email=secret" });
    start("/");
    const commands = (analyticsWindow.dataLayer as IArguments[]).map((args) => Array.from(args));
    expect(commands[1][2]).toMatchObject({ page_referrer: "https://haabcalendar.com" });
    expect(JSON.stringify(commands)).not.toContain("private-token");
  });
});
