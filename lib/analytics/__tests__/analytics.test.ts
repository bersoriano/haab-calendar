/**
 * Contract tests for the shared landing-page GA baseline (analytics.ts +
 * analytics.client.ts), ported from the landing-page-ga skill, plus this
 * site's privacy boundary: the real public allowlist and manage links, whose
 * URL is a booking credential. The fake browser stands in for the only
 * external boundaries: window, document and gtag.js.
 */
import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import { campaignUrl, cleanReferrer, limitParams } from "@/lib/analytics/analytics";
import { createAnalytics, type AnalyticsConfig } from "@/lib/analytics/analytics.client";
import { ANALYTICS_PATHS, isAnalyticsPath } from "@/lib/analytics/landing-policy";

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
});

const SITE = "https://example.com";
const ID = "G-TEST1234";

function browser({ href = `${SITE}/`, referrer = "", doNotTrack = null as string | null, gpc = false } = {}) {
  const scripts: { src: string }[] = [];
  const win: Record<string, unknown> & { location: URL; dataLayer?: IArguments[] } = {
    location: new URL(href),
    navigator: { doNotTrack, globalPrivacyControl: gpc },
  };
  const doc = {
    referrer,
    title: "Home",
    createElement: () => ({ async: false, src: "" }),
    head: { appendChild: (script: { src: string }) => scripts.push(script) },
  };
  Object.assign(globalThis, { window: win, document: doc });
  const navigate = (next: string, title = "Page") => { win.location = new URL(next, win.location); doc.title = title; };
  // gtag.js receives `arguments` objects; read them back as arrays.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- gtag commands mix names and settings
  const commands = () => Array.from(win.dataLayer ?? [], (entry) => Array.from(entry) as [string, ...any[]]);
  return { win, scripts, commands, navigate };
}

function start(config: Partial<AnalyticsConfig> = {}) {
  const analytics = createAnalytics();
  analytics.init({ gaId: ID, siteUrl: SITE, ...config });
  return analytics;
}

test("addresses keep only campaign tags; referrers from other sites keep only their origin", () => {
  assert.equal(campaignUrl(`${SITE}/p?utm_source=li&gclid=x&email=a%40b.c#top`), `${SITE}/p?utm_source=li`);
  assert.equal(cleanReferrer("https://www.google.com/search?q=private", `${SITE}/`), "https://www.google.com");
  assert.equal(cleanReferrer(`${SITE}/blog?ref=x`, `${SITE}/`), `${SITE}/blog`);
  assert.equal(cleanReferrer("", `${SITE}/`), "");
});

test("params respect GA limits", () => {
  const out = limitParams({ long: "x".repeat(150), skip: undefined, bad: Number.NaN, ["k".repeat(41)]: 1 });
  assert.deepEqual(out, { long: "x".repeat(100) });
});

test("GA stays off on preview hosts, without a valid ID, and under Do Not Track or GPC", () => {
  for (const href of ["https://abc123.example.pages.dev/", "https://example-git-main.vercel.app/", "http://localhost:3000/"]) {
    const { scripts } = browser({ href });
    assert.equal(start().enabled(), false, href);
    assert.equal(scripts.length, 0, href);
  }
  browser();
  assert.equal(start({ gaId: "UA-123" }).enabled(), false, "GA4 IDs only");
  browser({ doNotTrack: "1" });
  assert.equal(start().enabled(), false, "Do Not Track");
  browser({ gpc: true });
  assert.equal(start().enabled(), false, "Global Privacy Control");
});

test("settings are queued with set before js, so the Google tag's own GA tag uses them", () => {
  const { scripts, commands } = browser({ href: `${SITE}/?utm_campaign=x&gclid=secret`, referrer: "https://news.site/a?b=c" });
  start();
  assert.equal(scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${ID}`);
  assert.deepEqual(commands().map(([command]) => command), ["set", "js", "config"]);
  const [[, set], , [, id, config]] = commands();
  assert.equal(id, ID);
  for (const settings of [set, config]) {
    assert.equal(settings.send_page_view, false);
    assert.equal(settings.allow_google_signals, false);
    assert.equal(settings.allow_ad_personalization_signals, false);
    assert.equal(settings.page_location, `${SITE}/?utm_campaign=x`);
    assert.equal(settings.page_referrer, "https://news.site");
    assert.equal(settings.debug_mode, undefined);
  }
});

test("debug mode reaches DebugView from localhost but never marks production traffic", () => {
  browser({ href: "http://localhost:3000/" });
  const local = browser({ href: "http://localhost:3000/" });
  start({ debug: true });
  assert.equal(local.commands()[0][1].debug_mode, true);
  const prod = browser();
  start({ debug: true });
  assert.equal(prod.commands()[0][1].debug_mode, undefined);
});

test("one page_view per route, previous page as referrer, events carry clean page fields", () => {
  const { commands, navigate } = browser({ href: `${SITE}/?utm_source=li&email=a`, referrer: "https://www.google.com/search?q=x" });
  const analytics = start();
  analytics.pageView({ page_type: "landing" });
  navigate("/pricing?coupon=SECRET", "Pricing");
  analytics.pageView({ page_type: "supporting" });
  analytics.track("cta_click", { cta_type: "whatsapp", cta_location: "hero" });
  analytics.track("generate_lead", { form_name: "contact" });

  const events = commands().filter(([command]) => command === "event");
  const views = events.filter(([, name]) => name === "page_view");
  assert.equal(views.length, 2);
  assert.equal(views[0][2].page_location, `${SITE}/?utm_source=li`);
  assert.equal(views[0][2].page_referrer, "https://www.google.com");
  assert.equal(views[1][2].page_location, `${SITE}/pricing`);
  assert.equal(views[1][2].page_referrer, `${SITE}/`);
  assert.equal(views[1][2].page_type, "supporting");
  const [, , click] = events.find(([, name]) => name === "cta_click")!;
  assert.equal(click.transport_type, "beacon");
  assert.equal(click.page_location, `${SITE}/pricing`);
  const [, , lead] = events.find(([, name]) => name === "generate_lead")!;
  assert.equal(lead.transport_type, undefined);
  // Automatic hits read globals: each view also updates them.
  assert.deepEqual(commands().filter(([command]) => command === "set").at(-1)?.[1].page_location, `${SITE}/pricing`);
});

test("secret URLs never initialize, and reaching one stops collection until reload", () => {
  const isTrackablePath = (path: string) => !path.startsWith("/manage/");
  const secret = browser({ href: `${SITE}/manage/tok_123` });
  assert.equal(start({ isTrackablePath }).enabled(), false);
  assert.equal(secret.scripts.length, 0);

  const { win, commands, navigate } = browser();
  const analytics = start({ isTrackablePath });
  analytics.pageView();
  navigate("/manage/tok_123");
  analytics.pageView();
  assert.equal(win[`ga-disable-${ID}`], true);
  navigate("/");
  analytics.pageView();
  analytics.track("cta_click", { cta_type: "booking" });
  assert.equal(commands().filter(([command, name]) => command === "event" && name !== "page_view").length, 0);
  assert.ok(!JSON.stringify(commands()).includes("tok_123"));
});

// ---- haabcalendar.com ------------------------------------------------------

const HAAB = "https://haabcalendar.com";
const MANAGE_PATHS = ["/doctors/casa-azul/manage/tok_private123", "/public/casa-azul/manage/tok_private123"];

function startHaab() {
  const analytics = createAnalytics();
  analytics.init({ gaId: "G-2RHC147XNR", siteUrl: HAAB, isTrackablePath: isAnalyticsPath });
  return analytics;
}

test("the allowlist is the landing pages, gallery and legal pages, and nothing private", () => {
  assert.deepEqual([...ANALYTICS_PATHS].sort(), [
    "/", "/en/online-booking-for-doctors", "/es/agenda-online-para-medicos", "/gallery", "/privacy", "/terms",
  ].sort());
  for (const path of [...MANAGE_PATHS, "/dashboard", "/login", "/reset-password", "/doctors/casa-azul", "/blog/x", "/en"]) {
    assert.equal(isAnalyticsPath(path), false, path);
  }
});

test("a manage link never loads Google, and reaching one client-side stops collection without leaking the token", () => {
  for (const path of [...MANAGE_PATHS, "/dashboard", "/reset-password"]) {
    const { scripts, win } = browser({ href: `${HAAB}${path}` });
    assert.equal(startHaab().enabled(), false, path);
    assert.equal(scripts.length, 0, path);
    assert.equal(win.dataLayer, undefined, path);
  }

  const { win, commands, navigate } = browser({ href: `${HAAB}/` });
  const analytics = startHaab();
  analytics.pageView({ page_type: "landing" });
  navigate(MANAGE_PATHS[1]);
  analytics.pageView();
  analytics.track("cta_click", { cta_type: "signup" });
  assert.equal(win["ga-disable-G-2RHC147XNR"], true);
  navigate("/gallery");
  analytics.pageView({ page_type: "supporting" });
  assert.equal(commands().filter(([command]) => command === "event").length, 1, "only the first landing view");
  assert.ok(!JSON.stringify(commands()).includes("tok_private123"));
});

test("a full page load from a manage link reports only the site origin as referrer", () => {
  const { commands } = browser({ href: `${HAAB}/`, referrer: `${HAAB}${MANAGE_PATHS[0]}?email=a%40b.c` });
  startHaab().pageView();
  assert.ok(!JSON.stringify(commands()).includes("tok_private123"));
  const view = commands().find(([command, name]) => command === "event" && name === "page_view")!;
  assert.equal(view[2].page_referrer, HAAB);
  assert.equal(commands()[0][1].page_referrer, HAAB, "the queued set as well");
  assert.equal(cleanReferrer(`${HAAB}/gallery?x=1`, `${HAAB}/`, isAnalyticsPath), `${HAAB}/gallery`);
});

test("query strings and fragments on public pages never reach Google", () => {
  const { commands } = browser({ href: `${HAAB}/?token=tok_private123&lang=es&utm_source=newsletter#access_token=tok_private123` });
  startHaab().pageView();
  assert.ok(!JSON.stringify(commands()).includes("tok_private123"));
  const view = commands().find(([command, name]) => command === "event" && name === "page_view")!;
  assert.equal(view[2].page_location, `${HAAB}/?utm_source=newsletter`);
});

test("only the canonical host collects: previews, localhost and the www alias stay off", () => {
  for (const href of ["https://haab-calendar-git-main-team.vercel.app/", "http://localhost:3000/", "https://www.haabcalendar.com/"]) {
    const { scripts } = browser({ href });
    assert.equal(startHaab().enabled(), false, href);
    assert.equal(scripts.length, 0, href);
  }
});
