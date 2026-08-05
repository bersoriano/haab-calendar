"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  BOOKING_HOLD_DURATION_MS,
  BOOKING_HOLD_WARNING_MS,
  getMonthFormatter,
  getWeekdayShortFormatter,
} from "@/lib/constants";
import { formatCountdown, formatTimeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";

// The preview mirrors the seeded public page at /doctors/dr-maya-rivera
// (scripts/seed-public-examples.mjs). Availability, services, durations and
// prices are copied from that seed so the demo matches the real page a visitor
// lands on from "Try a real booking".
export const PREVIEW_PUBLIC_PATH = "/doctors/dr-maya-rivera";
const PREVIEW_URL_LABEL = "haab.app/doctors/dr-maya-rivera";
const PREVIEW_PROVIDER_NAME = "Dr. Maya Rivera";

type DayRule = {
  open: boolean;
  start: string;
  end: string;
  breaks: Array<{ start: string; end: string }>;
};

// Index 0 = Sunday, matching Date#getDay().
const AVAILABILITY: DayRule[] = [
  { open: false, start: "09:00", end: "17:00", breaks: [] },
  { open: true, start: "09:00", end: "17:00", breaks: [{ start: "12:00", end: "13:00" }] },
  { open: true, start: "09:00", end: "17:00", breaks: [{ start: "12:00", end: "13:00" }] },
  { open: true, start: "10:00", end: "18:00", breaks: [{ start: "13:00", end: "14:00" }] },
  { open: true, start: "09:00", end: "17:00", breaks: [{ start: "12:00", end: "13:00" }] },
  { open: true, start: "09:00", end: "15:00", breaks: [] },
  { open: false, start: "09:00", end: "17:00", breaks: [] },
];

const SERVICE_DURATIONS = [30, 20];
const VISIBLE_SLOT_COUNT = 6;
const CALENDAR_DAY_COUNT = 21;

// Autoplay beats, in ms after mount. The hold — the thing the hero has to prove
// — is on screen well inside 3 seconds.
const STEP_SERVICE_MS = 450;
const STEP_DATE_MS = 1100;
const STEP_HOLD_MS = 1750;
const STEP_TAKEN_MS = 4200;
const RESTART_AFTER_EXPIRY_MS = 6000;

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTimeString(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function buildSlots(weekday: number, durationMinutes: number) {
  const rule = AVAILABILITY[weekday];
  if (!rule.open) return [];

  const slots: string[] = [];
  const end = toMinutes(rule.end);

  for (
    let start = toMinutes(rule.start);
    start + durationMinutes <= end;
    start += durationMinutes
  ) {
    const overlapsBreak = rule.breaks.some(
      (pause) =>
        start < toMinutes(pause.end) && start + durationMinutes > toMinutes(pause.start),
    );
    if (!overlapsBreak) slots.push(toTimeString(start));
  }

  return slots;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

// One stable per-day "already booked" time so the grid looks like a real page
// instead of reshuffling on every render. A second slot goes during the demo.
function takenIndexesFor(key: string, slotCount: number) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 9973;
  }
  return new Set([hash % slotCount]);
}

type Stage = 0 | 1 | 2 | 3;

// `useSyncExternalStore` with a store that never changes: false during SSR,
// true once hydrated. Gives us a mount flag without a state-setting effect.
function subscribeToNothing() {
  return () => {};
}

export function HeroBookingPreview({ className = "" }: { className?: string }) {
  const { lang, t } = useLanguage();
  const copy = t.heroPreview;

  // Everything date- and clock-derived waits for mount so server and client
  // markup never disagree (the server clock is UTC, the visitor's is not).
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const [stage, setStage] = useState<Stage>(0);
  const [serviceIndex, setServiceIndex] = useState(0);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [showTakenNote, setShowTakenNote] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [visible, setVisible] = useState(true);
  const [runId, setRunId] = useState(0);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const today = useMemo(() => (mounted ? startOfDay(new Date()) : null), [mounted]);

  // Three weeks from the start of the current week. Same window shape as the
  // real public calendar, trimmed so the hold stays above the fold.
  const days = useMemo(() => {
    if (!today) return [];
    const weekStart = addDays(today, -today.getDay());
    return Array.from({ length: CALENDAR_DAY_COUNT }, (_, i) => addDays(weekStart, i));
  }, [today]);

  const isBookable = useCallback(
    (date: Date) => {
      if (!today) return false;
      return date >= today && AVAILABILITY[date.getDay()].open;
    },
    [today],
  );

  const firstBookableIso = useMemo(() => {
    const match = days.find((date) => isBookable(date));
    return match ? match.toISOString() : null;
  }, [days, isBookable]);

  const selectedDate = useMemo(() => {
    const iso = selectedDateIso ?? firstBookableIso;
    return iso ? new Date(iso) : null;
  }, [firstBookableIso, selectedDateIso]);

  const slots = useMemo(() => {
    if (!selectedDate) return [];
    return buildSlots(selectedDate.getDay(), SERVICE_DURATIONS[serviceIndex]);
  }, [selectedDate, serviceIndex]);

  const visibleSlots = slots.slice(0, VISIBLE_SLOT_COUNT);
  const hiddenSlotCount = Math.max(0, slots.length - VISIBLE_SLOT_COUNT);

  const takenIndexes = useMemo(() => {
    if (!selectedDate || visibleSlots.length === 0) return new Set<number>();
    return takenIndexesFor(dateKey(selectedDate), visibleSlots.length);
  }, [selectedDate, visibleSlots.length]);

  const defaultSlot = useMemo(
    () => visibleSlots.find((_, index) => !takenIndexes.has(index)) ?? null,
    [takenIndexes, visibleSlots],
  );

  // The slot that gets sniped mid-demo: never the one being held.
  const liveTakenIndex = useMemo(() => {
    const activeTime = selectedTime ?? defaultSlot;
    const candidate = visibleSlots.findIndex(
      (slot, index) => !takenIndexes.has(index) && slot !== activeTime,
    );
    return candidate === -1 ? null : candidate;
  }, [defaultSlot, selectedTime, takenIndexes, visibleSlots]);

  const activeTime = stage >= 3 ? (selectedTime ?? defaultSlot) : null;

  const startHold = useCallback((time: string) => {
    setSelectedTime(time);
    setStage(3);
    const expiresAt = Date.now() + BOOKING_HOLD_DURATION_MS;
    setHoldExpiresAt(expiresAt);
    setNow(Date.now());
  }, []);

  const stopAutoplay = useCallback(() => {
    setAutoplay(false);
    setShowTakenNote(false);
  }, []);

  const restart = useCallback(() => {
    setStage(0);
    setSelectedDateIso(null);
    setSelectedTime(null);
    setHoldExpiresAt(null);
    setShowTakenNote(false);
    setAutoplay(true);
    setRunId((id) => id + 1);
  }, []);

  // Scripted walkthrough. Any click hands control to the visitor.
  useEffect(() => {
    if (!today || !autoplay) return;

    // With reduced motion we skip the staged walkthrough and land straight on
    // the held state — the countdown is information, not decoration.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const beat = (ms: number) => (reducedMotion ? 0 : ms);

    const timers = [
      window.setTimeout(() => setStage(1), beat(STEP_SERVICE_MS)),
      window.setTimeout(() => setStage(2), beat(STEP_DATE_MS)),
      window.setTimeout(() => {
        setStage(3);
        setHoldExpiresAt(Date.now() + BOOKING_HOLD_DURATION_MS);
        setNow(Date.now());
      }, beat(STEP_HOLD_MS)),
      window.setTimeout(() => setShowTakenNote(true), beat(STEP_TAKEN_MS)),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [autoplay, runId, today]);

  // Pause the ticking clock while the hero is off screen or the tab is hidden;
  // remaining time is derived from a timestamp, so it stays honest on resume.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!holdExpiresAt || !visible) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    const onVisibility = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [holdExpiresAt, visible]);

  const remainingMs = holdExpiresAt ? Math.max(0, holdExpiresAt - now) : BOOKING_HOLD_DURATION_MS;
  const isHolding = stage >= 3 && holdExpiresAt !== null;
  const isExpired = isHolding && remainingMs <= 0;
  const isUrgent = isHolding && !isExpired && remainingMs <= BOOKING_HOLD_WARNING_MS;
  const isWarning = isHolding && !isExpired && !isUrgent && remainingMs <= 5 * 60 * 1000;
  const remainingPercent = Math.max(0, Math.min(100, (remainingMs / BOOKING_HOLD_DURATION_MS) * 100));

  // Let an expired hold sit long enough to read, then run the demo again so the
  // hero never settles on a dead state.
  useEffect(() => {
    if (!isExpired) return;
    const timer = window.setTimeout(restart, RESTART_AFTER_EXPIRY_MS);
    return () => window.clearTimeout(timer);
  }, [isExpired, restart]);

  const monthLabel = today
    ? getMonthFormatter(lang).format(selectedDate ?? today)
    : "";
  const weekdayLabels = useMemo(() => {
    const formatter = getWeekdayShortFormatter(lang);
    // 2024-03-03 is a Sunday: gives locale-correct short names in order.
    return Array.from({ length: 7 }, (_, i) =>
      formatter.format(new Date(2024, 2, 3 + i)),
    );
  }, [lang]);

  return (
    <div
      ref={sectionRef}
      role="group"
      aria-label={copy.ariaLabel}
      className={cn(
        "overflow-hidden rounded-[30px] border border-white/90 bg-white/88 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
          </div>
          <p className="truncate rounded-full bg-[var(--surface-soft)] px-3 py-1 font-mono text-[11px] text-[var(--muted)] sm:text-xs">
            {PREVIEW_URL_LABEL}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--teal-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)] sm:px-3 sm:text-[11px]">
          <span className="haab-live-dot h-1.5 w-1.5 rounded-full bg-[var(--teal)]" aria-hidden="true" />
          {copy.liveBadge}
        </span>
      </div>

      <div className="space-y-3.5 p-4 sm:space-y-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--ink)] sm:text-xl">
              {PREVIEW_PROVIDER_NAME}
            </h2>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)] sm:text-sm">
              {copy.providerMeta}
            </p>
          </div>
          <div
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[rgba(13,148,136,0.16)] to-[rgba(26,115,232,0.06)] text-sm font-bold text-[var(--teal)]"
          >
            +
          </div>
        </div>

        {/* Step 1 — services, straight from the seeded page. */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] sm:text-[11px]">
            {copy.stepService}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {copy.services.map((service, index) => {
              const chosen = stage >= 1 && serviceIndex === index;
              return (
                <button
                  key={service.name}
                  type="button"
                  onClick={() => {
                    stopAutoplay();
                    setServiceIndex(index);
                    setSelectedTime(null);
                    setHoldExpiresAt(null);
                    setStage(2);
                  }}
                  aria-pressed={chosen}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    chosen
                      ? "border-[var(--accent)] bg-white ring-2 ring-[rgba(26,115,232,0.16)]"
                      : "border-[var(--line)] bg-[var(--surface-soft)] hover:border-[rgba(26,115,232,0.4)]",
                  )}
                >
                  <span className="block text-xs font-semibold leading-4 text-[var(--ink)] sm:text-[13px] sm:leading-5">
                    {service.name}
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-[var(--muted)] sm:text-xs">
                    {service.meta}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 — date picker over real open days. */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] sm:text-[11px]">
              {copy.stepDate}
            </p>
            <p className="text-xs font-semibold text-[var(--ink)] first-letter:uppercase">
              {monthLabel}
            </p>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] sm:text-[10px]">
            {weekdayLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {(today
              ? days
              : Array.from({ length: CALENDAR_DAY_COUNT }, () => null)
            ).map((date, index) => {
              if (!date) {
                return (
                  <span
                    key={`skeleton-${index}`}
                    aria-hidden="true"
                    className="h-8 rounded-lg bg-[var(--surface-soft)] sm:h-9"
                  />
                );
              }

              const bookable = isBookable(date);
              const chosen =
                stage >= 2 && selectedDate?.toDateString() === date.toDateString();

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={!bookable}
                  aria-pressed={chosen}
                  aria-label={date.toDateString()}
                  onClick={() => {
                    stopAutoplay();
                    setSelectedDateIso(date.toISOString());
                    setSelectedTime(null);
                    setHoldExpiresAt(null);
                    setStage(2);
                  }}
                  className={cn(
                    "relative grid h-8 place-items-center rounded-lg text-[11px] font-semibold transition sm:h-9 sm:text-xs",
                    chosen
                      ? "bg-[var(--accent)] text-white"
                      : bookable
                        ? "bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-white hover:ring-2 hover:ring-[rgba(26,115,232,0.16)]"
                        : "cursor-default bg-transparent text-[var(--muted)] opacity-40",
                  )}
                >
                  {date.getDate()}
                  {bookable && !chosen ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[var(--accent)]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3 — live slots. One of them gets taken while you watch. */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] sm:text-[11px]">
            {copy.stepTime}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
            {(today && visibleSlots.length > 0
              ? visibleSlots
              : Array.from({ length: VISIBLE_SLOT_COUNT }, () => null)
            ).map((slot, index) => {
              if (!slot) {
                return (
                  <span
                    key={`slot-skeleton-${index}`}
                    aria-hidden="true"
                    className="h-9 rounded-xl bg-[var(--surface-soft)]"
                  />
                );
              }

              const takenNow =
                takenIndexes.has(index) || (showTakenNote && liveTakenIndex === index);
              // An expired hold releases the time, so it stops looking picked.
              const chosen = activeTime === slot && !isExpired;
              const justTaken = showTakenNote && liveTakenIndex === index;

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={takenNow}
                  aria-pressed={chosen}
                  onClick={() => {
                    stopAutoplay();
                    startHold(slot);
                  }}
                  className={cn(
                    "min-h-8 rounded-xl border px-1 text-[11px] font-semibold tabular-nums transition sm:min-h-9 sm:text-xs",
                    chosen
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : takenNow
                        ? "border-transparent bg-[var(--surface-soft)] text-[var(--muted)] line-through opacity-60"
                        : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--primary)]",
                    justTaken && "haab-slot-taken",
                  )}
                >
                  {formatTimeLabel(slot, lang)}
                </button>
              );
            })}
          </div>
          <p
            aria-live="polite"
            className="mt-1.5 min-h-4 text-[10px] font-medium text-[var(--muted)] sm:text-[11px]"
          >
            {showTakenNote
              ? copy.takenNote
              : hiddenSlotCount > 0
                ? copy.moreTimes.replace("{n}", String(hiddenSlotCount))
                : ""}
          </p>
        </div>

        {/* The hold: the whole reason this preview exists. */}
        <div
          className={cn(
            "rounded-[22px] border p-3 transition-colors duration-300 sm:p-4",
            !isHolding
              ? "border-[var(--line)] bg-[var(--surface-soft)]"
              : isExpired || isUrgent
                ? "border-[#fecdd3] bg-[#fff1f2]"
                : isWarning
                  ? "border-[#fde68a] bg-[#fffbeb]"
                  : "border-[rgba(0,191,165,0.35)] bg-[rgba(0,191,165,0.08)]",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:text-[11px]">
                {copy.holdLabel}
              </p>
              <p className="mt-1 truncate text-[13px] font-semibold text-[var(--ink)]">
                {isExpired
                  ? copy.holdExpired
                  : isHolding && activeTime
                    ? `${formatTimeLabel(activeTime, lang)} · ${copy.services[serviceIndex].name}`
                    : copy.holdIdle}
              </p>
            </div>
            <div
              role="timer"
              aria-live="off"
              aria-label={`${copy.holdLabel}: ${isExpired ? copy.holdExpired : formatCountdown(remainingMs)}`}
              className={cn(
                "shrink-0 rounded-2xl px-3 py-1.5 text-2xl font-semibold tabular-nums tracking-[-0.05em] ring-1 transition-colors sm:text-3xl",
                isExpired || isUrgent
                  ? "bg-white text-[#be123c] ring-[#fecdd3]"
                  : isWarning
                    ? "bg-white text-[#92400e] ring-[#fde68a]"
                    : "bg-white/90 text-[var(--ink)] ring-black/5",
              )}
            >
              {formatCountdown(isHolding ? remainingMs : BOOKING_HOLD_DURATION_MS)}
            </div>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/80">
            <div
              aria-hidden="true"
              className={cn(
                "h-full rounded-full transition-[width,background-color] duration-500 ease-out",
                isExpired || isUrgent
                  ? "bg-[#e11d48]"
                  : isWarning
                    ? "bg-[#f59e0b]"
                    : "bg-[var(--action-teal)]",
              )}
              style={{ width: `${isHolding ? remainingPercent : 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--muted)] sm:text-xs">
            {isExpired ? copy.holdExpiredHelper : copy.holdHelper}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)] sm:text-[11px]">
            {copy.noAccountNote}
          </span>
          {isExpired ? (
            <button
              type="button"
              onClick={restart}
              className="min-h-9 rounded-full border border-[var(--line)] bg-white px-4 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
            >
              {copy.restart}
            </button>
          ) : (
            <a
              href={`/try-booking?lang=${lang}`}
              className="min-h-9 rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold !text-white transition hover:bg-[var(--primary)]"
            >
              {copy.confirmCta}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
