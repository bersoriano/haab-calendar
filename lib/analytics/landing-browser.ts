import {
  LANDING_ACTIONS,
  LANDING_SECTIONS,
  type LandingCapture,
  type LandingEventName,
} from "./landing-policy";

const isSection = (value: string): boolean => (LANDING_SECTIONS as readonly string[]).includes(value);
const sectionName = (element: HTMLElement) => element.dataset.landingSection || element.id;

/** Owns only listeners/timers within this landing mount; embedded dialogs are outside it. */
export function observeLanding(root: HTMLElement, capture: LandingCapture, language: () => "en" | "es") {
  let stopped = false;
  let left = false;
  let frame = 0;
  let started = Date.now();
  let foreground = 0;
  let visibleSince: number | null = document.visibilityState === "visible" ? started : null;
  let maxScroll = 0;
  const seen = new Set<string>();
  const depths = new Set<number>();
  const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-landing-section], section[id]"))
    .filter((element) => isSection(sectionName(element)));
  const openQuestions = new Set(root.querySelectorAll("details[data-landing-faq][open]"));
  const emit = (event: LandingEventName, properties: Record<string, unknown> = {}) => {
    if (stopped || left) return;
    try { capture(event, { ...properties, language: language() }); }
    catch { /* Telemetry must not interrupt an interaction. */ }
  };
  const placement = (element: Element): string | undefined => {
    const parent = element.closest<HTMLElement>("[data-landing-section], section[id]");
    const name = parent ? sectionName(parent) : "";
    return isSection(name) ? name : undefined;
  };
  const inView = (element: HTMLElement) => {
    if (document.visibilityState !== "visible" || left) return false;
    const bounds = element.getBoundingClientRect();
    const overlap = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
    // A section taller than the screen must still be measurable on a phone.
    return bounds.height > 0 && overlap >= Math.min(bounds.height, window.innerHeight) / 2;
  };
  function check() {
    frame = 0;
    if (stopped || left) return;
    for (const element of sections) {
      const name = sectionName(element);
      if (seen.has(name)) continue;
      if (!inView(element)) {
        clearTimeout(timers.get(element));
        timers.delete(element);
      } else if (!timers.has(element)) {
        timers.set(element, setTimeout(() => {
          timers.delete(element);
          if (!inView(element) || stopped) return;
          seen.add(name);
          emit("landing_section_view", { section: name });
        }, 1000));
      }
    }
    if (document.visibilityState !== "visible") return;
    const height = document.documentElement.scrollHeight;
    if (height <= 0) return;
    maxScroll = Math.max(maxScroll, Math.min(100, Math.round(100 * (window.scrollY + window.innerHeight) / height)));
    for (const percent of [25, 50, 75, 100]) {
      if (maxScroll >= percent && !depths.has(percent)) {
        depths.add(percent);
        emit("landing_scroll_depth", { percent });
      }
    }
  }
  const schedule = () => { if (!frame && !stopped) frame = requestAnimationFrame(check); };
  const onVisibility = () => {
    if (visibleSince !== null) foreground += Date.now() - visibleSince;
    visibleSince = document.visibilityState === "visible" ? Date.now() : null;
    // Clear immediately when hidden, rather than relying on a throttled frame.
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    check();
  };
  const onClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || document.visibilityState !== "visible") return;
    const target = event.target.closest<HTMLElement>("[data-landing-action], [data-landing-vertical], [data-landing-language], a[href^='#']");
    if (!target || !root.contains(target)) return;
    const section = placement(target);
    if (!section) return;
    if (target.dataset.landingAction && (LANDING_ACTIONS as readonly string[]).includes(target.dataset.landingAction)) {
      const example = target.dataset.landingExample;
      emit("landing_cta_click", { section, action: target.dataset.landingAction, ...(example ? { example: Number(example) } : {}) });
    } else if (target.dataset.landingVertical) {
      emit("landing_vertical_select", { section, vertical: target.dataset.landingVertical });
    } else if (target.dataset.landingLanguage) {
      emit("landing_language_change", { section, target_language: target.dataset.landingLanguage });
    } else {
      const destination = target.getAttribute("href")?.slice(1);
      if (destination && isSection(destination)) emit("landing_nav_click", { section: destination });
    }
  };
  const onToggle = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLDetailsElement) || !target.dataset.landingFaq) return;
    if (target.open) {
      if (!openQuestions.has(target) && document.visibilityState === "visible") {
        emit("landing_faq_open", { section: "faq", question: Number(target.dataset.landingFaq) });
      }
      openQuestions.add(target);
    } else openQuestions.delete(target);
  };

  const video = root.querySelector<HTMLVideoElement>("video[data-landing-video]");
  const milestones = new Set<string>();
  let watched = 0;
  let lastTime = video?.currentTime ?? 0;
  let seeking = false;
  const videoMilestone = (milestone: string) => {
    if (milestones.has(milestone)) return;
    milestones.add(milestone);
    emit("landing_video_progress", { section: "demo", milestone });
  };
  const onPlay = () => {
    lastTime = video?.currentTime ?? 0;
    if (document.visibilityState === "visible") videoMilestone("start");
  };
  const onSeeking = () => { seeking = true; };
  const onSeeked = () => { seeking = false; lastTime = video?.currentTime ?? 0; };
  const onTime = () => {
    if (!video) return;
    const delta = video.currentTime - lastTime;
    lastTime = video.currentTime;
    if (video.paused || seeking || document.visibilityState !== "visible" || delta <= 0 || delta > 2.5 || !Number.isFinite(video.duration)) return;
    watched += delta;
    for (const percent of [25, 50, 75]) {
      if (watched >= video.duration * percent / 100) videoMilestone(String(percent));
    }
  };
  const onEnded = () => {
    if (video && document.visibilityState === "visible" && watched >= video.duration * 0.9) videoMilestone("complete");
  };
  const leave = () => {
    if (left || stopped) return;
    const active = foreground + (visibleSince === null ? 0 : Date.now() - visibleSince);
    emit("$pageleave", {
      duration_seconds: Math.min(86400, Math.floor((Date.now() - started) / 1000)),
      active_seconds: Math.min(86400, Math.floor(active / 1000)), max_scroll_percent: maxScroll,
    });
    left = true;
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted || stopped) return;
    left = false;
    started = Date.now();
    foreground = 0;
    visibleSince = document.visibilityState === "visible" ? started : null;
    seen.clear(); depths.clear(); maxScroll = 0;
    emit("$pageview");
    check();
  };

  emit("$pageview");
  check();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("pagehide", leave);
  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", onVisibility);
  root.addEventListener("click", onClick, true);
  root.addEventListener("toggle", onToggle, true);
  video?.addEventListener("play", onPlay);
  video?.addEventListener("timeupdate", onTime);
  video?.addEventListener("seeking", onSeeking);
  video?.addEventListener("seeked", onSeeked);
  video?.addEventListener("ended", onEnded);

  return () => {
    if (stopped) return;
    leave(); stopped = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("pagehide", leave);
    window.removeEventListener("pageshow", onPageShow);
    document.removeEventListener("visibilitychange", onVisibility);
    root.removeEventListener("click", onClick, true);
    root.removeEventListener("toggle", onToggle, true);
    video?.removeEventListener("play", onPlay);
    video?.removeEventListener("timeupdate", onTime);
    video?.removeEventListener("seeking", onSeeking);
    video?.removeEventListener("seeked", onSeeked);
    video?.removeEventListener("ended", onEnded);
  };
}
