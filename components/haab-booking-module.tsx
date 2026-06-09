"use client";

import { parse as parseNaturalLanguage, type ParsedResult } from "chrono-node";
import Link from "next/link";
import QRCode from "qrcode";
import {
  buildManageUrl,
  findBookingByToken,
  generateManageToken,
} from "@/lib/booking-tokens";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useModuleStore } from "@/components/booking/state/useModuleStore";
import type {
  AdminTab,
  BookingFlow,
  BookingHold,
  BookingHoldRecord,
  BookingRecord,
  BookingStatus,
  BookingStep,
  BookingType,
  DayAvailability,
  InjectedConfig,
  ManageLookupState,
  ModuleStore,
  ProviderInfo,
  RescheduleState,
  Service,
  ServiceDraft,
  SetupStep,
  Surface,
  SurfaceMode,
  VerticalId,
  WeekdayKey,
} from "@/lib/types";
import {
  WEEKDAY_KEYS,
  compactBadgeTextClass,
  compactMetaTextClass,
  weekdayShortFormatter,
  BOOKING_HOLD_DURATION_MS,
  DEFAULT_STORAGE_KEY,
} from "@/lib/constants";
import { cn, createId, currentTimestamp, pad, slugify } from "@/lib/utils";
import {
  toMinutes,
  addMinutes,
  getDateKey,
  parseDateKey,
  addDays,
  shiftMonth,
  compareDateKeys,
  getWeekStart,
  createWeekWindow,
  createRollingWeekWindow,
  createMonthMatrix,
  clampDateKey,
  compareMonthAnchors,
  todayKey,
  isPastDate,
  getTimeKeyFromDate,
} from "@/lib/date";
import {
  formatDateLabel,
  formatCompactDate,
  formatMonthLabel,
  formatTimeLabel,
  formatTimeRange,
  formatDuration,
  formatCapacityLabel,
  getBookingTypeLabel,
  statusTone,
  bookingTypeTone,
} from "@/lib/format";
import {
  createEmptyStore,
  createBlankServiceDraft,
  createInitialBookingFlow,
  normalizeServices,
  pruneBookingHolds,
  sortBookings,
  applyVerticalToStore,
} from "@/lib/store";
import {
  getBookingsForDate,
  getAvailableSlots,
  isDateAvailable,
} from "@/lib/availability";
import { getBookingHoldSelectionKey } from "@/lib/holds";
import { buildIcsContent } from "@/lib/ics";
import {
  adminBarClass,
  adminChoiceQuietClass,
  adminFieldClass,
  adminInsetClass,
  adminPanelClass,
} from "@/components/provider/adminGlass";
import { ProviderInfoForm } from "@/components/provider/ProviderInfoForm";
import { ServiceEditor } from "@/components/provider/ServiceEditor";
import { AvailabilityEditor } from "@/components/provider/AvailabilityEditor";
import { VerticalPicker } from "@/components/provider/VerticalPicker";
import { VERTICALS } from "@/config/verticals";
import {
  ActionButton,
  ActionLink,
  BookingHoldCountdownBar,
  EmptyState,
  PublicProgressIndicator,
  SectionTitle,
  SummaryField,
  SummaryStatusTitle,
  ToneBadge,
} from "@/components/ui";

type HaabBookingModuleProps = {
  injectedConfig?: Partial<InjectedConfig>;
  storageKey?: string;
  initialSurface?: Surface;
  surfaceMode?: SurfaceMode;
  requestedPublicSlug?: string;
  onBookingsChange?: (bookings: BookingRecord[]) => void;
  onStoreChange?: (store: ModuleStore) => void;
  manageBookingToken?: string;
  userEmail?: string;
  onSignOut?: () => void | Promise<void>;
};

function hasExplicitTime(result: ParsedResult) {
  return result.start.isCertain("hour");
}

export function HaabBookingModule({
  injectedConfig,
  storageKey = DEFAULT_STORAGE_KEY,
  initialSurface = "management",
  surfaceMode = "adaptive",
  requestedPublicSlug,
  onBookingsChange,
  onStoreChange,
  manageBookingToken,
  userEmail,
  onSignOut,
}: HaabBookingModuleProps) {
  const {
    integratedMode,
    hydrated,
    store: activeStore,
    actions,
  } = useModuleStore({ injectedConfig, storageKey, onStoreChange, onBookingsChange });

  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
  const [isDesktopColumns, setIsDesktopColumns] = useState(false);
  const [surface, setSurface] = useState<Surface>(
    surfaceMode === "public-only" ? "public" : initialSurface,
  );
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [setupStep, setSetupStep] = useState<SetupStep>(1);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupPublished, setSetupPublished] = useState(false);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(() =>
    createBlankServiceDraft(),
  );
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [bookingFlow, setBookingFlow] = useState<BookingFlow>(() =>
    createInitialBookingFlow(normalizeServices(injectedConfig?.services)),
  );
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [naturalLanguageBookingInput, setNaturalLanguageBookingInput] = useState("");
  const [naturalLanguageBookingError, setNaturalLanguageBookingError] = useState<string | null>(
    null,
  );
  const [isNaturalLanguageBookingFocused, setIsNaturalLanguageBookingFocused] = useState(false);
  const [isNLBookingOpen, setIsNLBookingOpen] = useState(false);
  const [isNLChangeDateOpen, setIsNLChangeDateOpen] = useState(false);
  const [
    wasBookingUpdatedWithNaturalLanguage,
    setWasBookingUpdatedWithNaturalLanguage,
  ] = useState(false);
  const [bookingHold, setBookingHold] = useState<BookingHold | null>(null);
  const [bookingHoldNow, setBookingHoldNow] = useState(() => currentTimestamp());
  const [publicMonthAnchor, setPublicMonthAnchor] = useState(new Date());
  const [calendarMonthAnchor, setCalendarMonthAnchor] = useState(new Date());
  const [calendarServicePreference, setCalendarServicePreference] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | BookingType>("all");
  const [rescheduleState, setRescheduleState] = useState<RescheduleState | null>(
    null,
  );
  const [cancellationId, setCancellationId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedManageLink, setCopiedManageLink] = useState(false);
  const [manageLookupState, setManageLookupState] = useState<ManageLookupState>(
    manageBookingToken ? "pending" : "idle",
  );
  const publicPrimaryPanelRef = useRef<HTMLDivElement | null>(null);
  const publicAboutPanelRef = useRef<HTMLDivElement | null>(null);
  const publicSummaryPanelRef = useRef<HTMLDivElement | null>(null);
  const stickyHeaderSentinelRef = useRef<HTMLDivElement | null>(null);
  const stickyHeaderObserverRef = useRef<IntersectionObserver | null>(null);
  const stickyHeaderRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToSlotsRef = useRef(false);
  const [isStickyHeaderStuck, setIsStickyHeaderStuck] = useState(false);
  const [isPublicFlowFadingOut, setIsPublicFlowFadingOut] = useState(false);
  const attachStickyHeaderSentinel = useCallback((node: HTMLDivElement | null) => {
    stickyHeaderSentinelRef.current = node;
    if (stickyHeaderObserverRef.current) {
      stickyHeaderObserverRef.current.disconnect();
      stickyHeaderObserverRef.current = null;
    }
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStickyHeaderStuck(!entry.isIntersecting);
      },
      { root: null, threshold: 0, rootMargin: "0px" },
    );
    observer.observe(node);
    stickyHeaderObserverRef.current = observer;
  }, []);
  const [publicPrimaryPanelHeight, setPublicPrimaryPanelHeight] = useState<number | null>(
    null,
  );
  const [calendarQrCode, setCalendarQrCode] = useState<{
    bookingId: string;
    error: string;
    url: string;
  } | null>(null);

  const provider = activeStore.provider;
  const services = activeStore.services;
  const bookings = activeStore.bookings;
  const bookingHolds = activeStore.bookingHolds;
  const activeBookingHolds = pruneBookingHolds(bookingHolds, bookingHoldNow);
  const availability = activeStore.availability;
  const vertical = activeStore.vertical;

  const onManageBookingFound = useEffectEvent((booking: BookingRecord) => {
    setBookingFlow((current) => ({
      ...current,
      step: 4,
      successBookingId: booking.id,
      serviceId: booking.serviceId,
    }));
    setManageLookupState("found");
  });

  const onManageBookingMissing = useEffectEvent(() => {
    setManageLookupState("not-found");
  });

  useEffect(() => {
    if (!manageBookingToken || !hydrated) {
      return;
    }

    const booking = findBookingByToken({ bookings }, manageBookingToken);
    if (booking) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: useEffectEvent escapes Effect reactivity per React 19 docs
      onManageBookingFound(booking);
    } else {
      onManageBookingMissing();
    }
  }, [manageBookingToken, hydrated, bookings]);

  const businessSlug =
    provider.publicSlug || slugify(provider.businessName || provider.fullName || "haab-calendar");
  const publicUrl = businessSlug ? `/public/${businessSlug}` : "/public";
  const resolvedBookingFlow = {
    ...bookingFlow,
    serviceId:
      bookingFlow.serviceId || (services.length === 1 ? (services[0]?.id ?? "") : ""),
    step:
      bookingFlow.step === 1 && services.length === 1
        ? (2 as BookingStep)
        : bookingFlow.step,
  };
  const selectedService = services.find(
    (service) => service.id === resolvedBookingFlow.serviceId,
  );
  const successfulBooking = bookings.find((booking) => booking.id === bookingFlow.successBookingId);
  const isSuccessfulBookingCancelled = successfulBooking?.status === "cancelled";
  const bookingHoldSelectionKey =
    selectedService &&
    resolvedBookingFlow.step === 3 &&
    bookingFlow.dateKey &&
    (selectedService.bookingType === "full-day" || bookingFlow.time)
      ? getBookingHoldSelectionKey(selectedService, bookingFlow.dateKey, bookingFlow.time)
      : null;
  const hasActiveBookingHold = Boolean(
    bookingHoldSelectionKey &&
      bookingHold &&
      bookingHold.selectionKey === bookingHoldSelectionKey,
  );
  const bookingHoldRemainingMs =
    bookingHold && bookingHold.selectionKey === bookingHoldSelectionKey
      ? Math.max(0, BOOKING_HOLD_DURATION_MS - (bookingHoldNow - bookingHold.startedAt))
      : BOOKING_HOLD_DURATION_MS;
  const bookingHoldRemainingRatio = Math.max(
    0,
    Math.min(1, bookingHoldRemainingMs / BOOKING_HOLD_DURATION_MS),
  );
  const isBookingHoldExpired = hasActiveBookingHold && bookingHoldRemainingMs <= 0;
  const shouldShowHoldWarningToast =
    resolvedBookingFlow.step === 3 &&
    hasActiveBookingHold &&
    !isBookingHoldExpired &&
    bookingHoldRemainingMs <= 2 * 60 * 1000;
  const shouldDimManualBookingPanels =
    isNaturalLanguageBookingFocused && naturalLanguageBookingInput.trim().length > 0;
  const isSetupOpen = !integratedMode && !activeStore.setupComplete;
  const publicRouteReady =
    !requestedPublicSlug || requestedPublicSlug === businessSlug;
  const isDedicatedPublicPage = surfaceMode === "public-only";
  const hasMultipleServices = services.length > 1;
  const calendarServiceId =
    calendarServicePreference &&
    services.some((service) => service.id === calendarServicePreference)
      ? calendarServicePreference
      : (services[0]?.id ?? "");
  const publicShellClass = isDedicatedPublicPage
    ? "w-full"
    : "w-full rounded-[34px] border border-[var(--line)] shadow-[0_40px_100px_rgba(15,23,42,0.08)]";
  const publicPrimaryPanelClass = isDedicatedPublicPage
    ? "rounded-[34px] bg-[rgba(248,249,250,0.94)] p-6 ring-1 ring-[rgba(255,255,255,0.68)] shadow-[0_28px_64px_rgba(25,28,29,0.08)] xl:p-8"
    : "rounded-[28px] border border-[var(--line)] bg-white p-6 xl:p-8";
  const publicElevatedPanelClass = isDedicatedPublicPage
    ? "rounded-[32px] bg-[rgba(255,255,255,0.92)] p-6 ring-1 ring-[rgba(255,255,255,0.84)] shadow-[0_24px_58px_rgba(25,28,29,0.09)] xl:p-7"
    : "rounded-[28px] border border-[var(--line)] bg-white p-6 xl:p-7";
  const isStickyHeaderActive =
    isStickyHeaderStuck && resolvedBookingFlow.step === 2;
  const stickyBarPanelClass = isDedicatedPublicPage
    ? isStickyHeaderActive
      ? "rounded-[32px] border border-white bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_42px_rgba(25,28,29,0.07)] backdrop-blur-[0px] transition-[background-color,backdrop-filter,border-color,box-shadow] duration-500 ease-out"
      : "rounded-[32px] border border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.55)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_42px_rgba(25,28,29,0.07)] backdrop-blur-[20px] transition-[background-color,backdrop-filter,border-color,box-shadow] duration-500 ease-out"
    : "rounded-[28px] border border-[var(--line)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]";
  const publicSoftPanelClass = isDedicatedPublicPage
    ? "rounded-[32px] bg-[rgba(243,244,245,0.94)] p-6 ring-1 ring-[rgba(255,255,255,0.58)] shadow-[0_18px_46px_rgba(25,28,29,0.06)] xl:p-7"
    : "rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-6 xl:p-7";
  const publicInsetCardClass = isDedicatedPublicPage
    ? "rounded-[28px] bg-[rgba(255,255,255,0.88)] p-5 ring-1 ring-[rgba(193,198,214,0.18)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
    : "rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-5";
  const publicGlassBarClass = isDedicatedPublicPage
    ? "border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_22px_48px_rgba(25,28,29,0.08)] backdrop-blur-[20px]"
    : "border border-[var(--line)] bg-white";
  const publicStatusStripClass = isDedicatedPublicPage
    ? "border border-[rgba(255,255,255,0.38)] bg-[rgba(248,249,250,0.9)] shadow-[0_14px_32px_rgba(25,28,29,0.05)]"
    : "border border-[var(--line)] bg-[var(--surface-soft)]";
  const publicQuietChoiceClass = isDedicatedPublicPage
    ? "bg-[rgba(248,249,250,0.92)] ring-1 ring-[rgba(193,198,214,0.18)] shadow-[0_12px_30px_rgba(25,28,29,0.04)]"
    : "border border-[var(--line)] bg-white";
  const publicSoftChoiceClass = isDedicatedPublicPage
    ? "bg-[rgba(243,244,245,0.9)] ring-1 ring-[rgba(193,198,214,0.14)]"
    : "border border-[var(--line)] bg-[var(--surface-soft)]";
  const publicSelectedChoiceClass = isDedicatedPublicPage
    ? "border border-[rgba(255,255,255,0.64)] bg-[rgba(255,255,255,0.58)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_24px_52px_rgba(25,28,29,0.08)] backdrop-blur-[18px]"
    : "border-[var(--accent)] bg-[var(--accent-soft)]";
  const calendarNavPillClass = isDedicatedPublicPage
    ? "min-h-11 rounded-full border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.46)] px-4 text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_18px_36px_rgba(25,28,29,0.08)] backdrop-blur-[18px] hover:border-[rgba(26,115,232,0.24)] hover:bg-[rgba(255,255,255,0.62)] hover:text-[var(--ink)]"
    : "rounded-full border border-[rgba(193,198,214,0.5)] bg-[rgba(255,255,255,0.78)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_30px_rgba(25,28,29,0.04)] backdrop-blur-[18px] hover:border-[rgba(26,115,232,0.22)] hover:bg-[rgba(255,255,255,0.92)] hover:text-[var(--ink)]";
  const publicPillButtonClass = isDedicatedPublicPage ? "min-h-12 rounded-full px-6" : "";
  const publicPrimaryActionClass = isDedicatedPublicPage
    ? cn(publicPillButtonClass, "justify-center")
    : "";
  const publicGhostButtonClass = isDedicatedPublicPage
    ? "border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.44)] text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_18px_36px_rgba(25,28,29,0.08)] backdrop-blur-[18px] hover:bg-[rgba(255,255,255,0.58)] hover:text-[var(--ink)]"
    : "";
  const publicFieldClass = isDedicatedPublicPage
    ? "min-h-14 rounded-[24px] border border-white bg-[rgba(243,244,245,0.96)] px-4 pb-3 pt-4 text-[var(--ink)] shadow-[0px_4px_10px_3px_#89a6c036] outline-none transition placeholder:text-[rgba(25,28,29,0.42)] focus:bg-[rgba(255,255,255,0.98)] focus:ring-2 focus:ring-[rgba(26,115,232,0.2)]"
    : "min-h-12 rounded-2xl border border-white px-4 shadow-[0px_4px_10px_3px_#89a6c036] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]";
  const publicTextareaClass = isDedicatedPublicPage
    ? "rounded-[24px] border border-white bg-[rgba(243,244,245,0.96)] px-4 pb-3 pt-4 text-[var(--ink)] shadow-[0px_4px_10px_3px_#89a6c036] outline-none transition placeholder:text-[rgba(25,28,29,0.42)] focus:bg-[rgba(255,255,255,0.98)] focus:ring-2 focus:ring-[rgba(26,115,232,0.2)]"
    : "rounded-2xl border border-white px-4 py-3 shadow-[0px_4px_10px_3px_#89a6c036] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const syncMobileBrowser = () => setIsMobileBrowser(mediaQuery.matches);
    const frameId = window.requestAnimationFrame(syncMobileBrowser);

    mediaQuery.addEventListener("change", syncMobileBrowser);

    return () => {
      window.cancelAnimationFrame(frameId);
      mediaQuery.removeEventListener("change", syncMobileBrowser);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopColumns = () => setIsDesktopColumns(mediaQuery.matches);
    const frameId = window.requestAnimationFrame(syncDesktopColumns);

    mediaQuery.addEventListener("change", syncDesktopColumns);

    return () => {
      window.cancelAnimationFrame(frameId);
      mediaQuery.removeEventListener("change", syncDesktopColumns);
    };
  }, []);

  useEffect(() => {
    if (
      resolvedBookingFlow.step !== 2 &&
      resolvedBookingFlow.step !== 3 &&
      resolvedBookingFlow.step !== 4
    ) {
      return;
    }

    const primaryNode = publicPrimaryPanelRef.current;

    if (!primaryNode || typeof ResizeObserver === "undefined") {
      return;
    }

    let frameId = 0;
    const syncHeight = () => {
      const measurementNodes =
        resolvedBookingFlow.step === 2
          ? [primaryNode]
          : [
              publicPrimaryPanelRef.current,
              publicAboutPanelRef.current,
              publicSummaryPanelRef.current,
            ].filter((node): node is HTMLDivElement => Boolean(node));

      const previousMinHeights = measurementNodes.map((node) => node.style.minHeight);

      measurementNodes.forEach((node) => {
        node.style.minHeight = "";
      });

      const nextHeight = Math.max(
        ...measurementNodes.map((node) => Math.ceil(node.scrollHeight)),
      );

      measurementNodes.forEach((node, index) => {
        node.style.minHeight = previousMinHeights[index] ?? "";
      });

      setPublicPrimaryPanelHeight((current) => {
        if (current === null) return nextHeight;
        // On the success step, never shrink — preserve the height from the details step
        if (resolvedBookingFlow.step === 4) return Math.max(current, nextHeight);
        return nextHeight;
      });
    };

    frameId = window.requestAnimationFrame(syncHeight);

    const observer = new ResizeObserver(() => {
      syncHeight();
    });

    const observedNodes =
      resolvedBookingFlow.step === 2
        ? [primaryNode]
        : [
            publicPrimaryPanelRef.current,
            publicAboutPanelRef.current,
            publicSummaryPanelRef.current,
          ].filter((node): node is HTMLDivElement => Boolean(node));

    observedNodes.forEach((node) => observer.observe(node));

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [resolvedBookingFlow.step]);

  useEffect(() => {
    if (bookingHolds.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setBookingHoldNow(currentTimestamp());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [bookingHolds.length]);

  useEffect(() => {
    return () => {
      if (stickyHeaderObserverRef.current) {
        stickyHeaderObserverRef.current.disconnect();
        stickyHeaderObserverRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (resolvedBookingFlow.step !== 2 || typeof window === "undefined") {
      return;
    }
    hasScrolledToSlotsRef.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [resolvedBookingFlow.step]);

  useEffect(() => {
    if (!resolvedBookingFlow.dateKey) {
      hasScrolledToSlotsRef.current = false;
    }
  }, [resolvedBookingFlow.dateKey]);

  // Desktop-only: pre-select the first available date when the date/time step opens
  // with no date chosen, so the right-hand time column is populated immediately.
  const preselectFirstAvailableDate = useEffectEvent(() => {
    if (!selectedService || bookingFlow.dateKey) {
      return;
    }

    const ignoredHoldId = bookingHold?.released ? undefined : bookingHold?.id;
    for (let offset = 0; offset < 365; offset += 1) {
      const dateKey = getDateKey(addDays(new Date(), offset));
      if (
        isDateAvailable(
          dateKey,
          selectedService,
          availability,
          bookings,
          undefined,
          activeBookingHolds,
          ignoredHoldId,
        )
      ) {
        setBookingFlow((current) =>
          current.dateKey ? current : { ...current, dateKey, time: "" },
        );
        setPublicMonthAnchor(parseDateKey(dateKey));
        return;
      }
    }
  });

  useEffect(() => {
    if (!isDesktopColumns || resolvedBookingFlow.step !== 2) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: useEffectEvent escapes Effect reactivity per React 19 docs
    preselectFirstAvailableDate();
  }, [isDesktopColumns, resolvedBookingFlow.step, selectedService?.id]);

  useEffect(() => {
    if (!successfulBooking || successfulBooking.status === "cancelled") {
      return;
    }

    let cancelled = false;
    const bookingId = successfulBooking.id;

    QRCode.toDataURL(
      buildIcsContent(
        successfulBooking,
        provider,
        buildManageUrl(provider.publicSlug, successfulBooking.manageToken),
      ),
      {
        errorCorrectionLevel: "M",
        margin: 2,
        scale: 8,
        width: 400,
      },
    )
      .then((url) => {
        if (cancelled) {
          return;
        }

        setCalendarQrCode({ bookingId, error: "", url });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setCalendarQrCode({
          bookingId,
          error: "Unable to generate the calendar QR code.",
          url: "",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [provider, successfulBooking]);

  const releaseExpiredBookingHold = useEffectEvent((holdId: string) => {
    actions.releaseBookingHold(holdId);
  });

  useEffect(() => {
    if (!bookingHoldSelectionKey || !bookingHold) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const now = currentTimestamp();

      setBookingHoldNow(now);

      if (!bookingHold.released && now >= bookingHold.expiresAt) {
        releaseExpiredBookingHold(bookingHold.id);
        setBookingHold((current) =>
          current?.id === bookingHold.id ? { ...current, released: true } : current,
        );
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [bookingHoldSelectionKey, bookingHold]);

  function startFreshBooking(overrides?: Partial<BookingFlow>) {
    const base = createInitialBookingFlow(services);
    const nextServiceId = overrides?.serviceId ?? base.serviceId;
    let nextStep: BookingStep = nextServiceId ? 2 : 1;

    if (overrides?.dateKey) {
      nextStep = 2;
    }

    if (overrides?.clientName) {
      nextStep = 3;
    }

    setBookingError(null);
    setNaturalLanguageBookingInput("");
    setNaturalLanguageBookingError(null);
    setIsNaturalLanguageBookingFocused(false);
    setIsNLBookingOpen(false);
    setWasBookingUpdatedWithNaturalLanguage(false);
    actions.releaseBookingHold(bookingHold?.released ? undefined : bookingHold?.id);
    setBookingHold(null);
    setBookingHoldNow(currentTimestamp());
    setBookingFlow({
      ...base,
      ...overrides,
      serviceId: nextServiceId,
      step: overrides?.step ?? nextStep,
    });
  }

  function downloadBookingCalendarFile(booking: BookingRecord) {
    if (typeof document === "undefined") {
      return;
    }

    const blob = new Blob(
      [
        buildIcsContent(
          booking,
          provider,
          buildManageUrl(provider.publicSlug, booking.manageToken),
        ),
      ],
      { type: "text/calendar;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${businessSlug || "booking"}-${booking.id}.ics`;
    document.body.append(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }

  function launchPublicFlow(overrides?: Partial<BookingFlow>) {
    startFreshBooking(overrides);
    startTransition(() => {
      setSurface("public");
    });
  }

  function continueWithNaturalLanguageBooking() {
    if (!selectedService) {
      return;
    }

    const isUpdatingExistingSelection = resolvedBookingFlow.step === 3;
    const input = naturalLanguageBookingInput.trim();

    if (!input) {
      setNaturalLanguageBookingError(
        selectedService.bookingType === "appointment"
          ? "Enter a request like \"next Monday at 2 PM\" first."
          : "Enter a request like \"next Friday\" first.",
      );
      return;
    }

    const parsed = parseNaturalLanguage(input, new Date(), {
      forwardDate: true,
    })[0];

    if (!parsed) {
      setNaturalLanguageBookingError(
        selectedService.bookingType === "appointment"
          ? "I couldn't understand that request. Try something like \"next Monday at 2 PM\"."
          : "I couldn't understand that request. Try something like \"next Friday\".",
      );
      return;
    }

    const parsedDate = parsed.start.date();
    const dateKey = getDateKey(parsedDate);

    if (isPastDate(dateKey)) {
      setNaturalLanguageBookingError(
        "That request resolves to a past date. Try a future date instead.",
      );
      return;
    }

    setPublicMonthAnchor(parsedDate);
    setBookingError(null);
    setNaturalLanguageBookingError(null);

    if (selectedService.bookingType === "appointment") {
      if (!hasExplicitTime(parsed)) {
        if (!isUpdatingExistingSelection) {
          setBookingFlow((current) => ({
            ...current,
            dateKey,
            time: "",
          }));
        }
        setNaturalLanguageBookingError(
          "Appointments need a time. Try something like \"next Monday at 2 PM\".",
        );
        return;
      }

      const requestedTime = getTimeKeyFromDate(parsedDate);
      const availableSlots = getAvailableSlots(
        dateKey,
        selectedService,
        availability,
        bookings,
        undefined,
        activeBookingHolds,
        bookingHold?.released ? undefined : bookingHold?.id,
      );

      if (availableSlots.length === 0) {
        if (!isUpdatingExistingSelection) {
          setBookingFlow((current) => ({
            ...current,
            dateKey,
            time: "",
          }));
        }
        setNaturalLanguageBookingError(
          `No appointment slots are available on ${formatDateLabel(dateKey)}. Try another phrase or use the calendar below.`,
        );
        return;
      }

      if (!availableSlots.includes(requestedTime)) {
        if (!isUpdatingExistingSelection) {
          setBookingFlow((current) => ({
            ...current,
            dateKey,
            time: "",
          }));
        }
        setNaturalLanguageBookingError(
          `No slot starts at ${formatTimeLabel(requestedTime)} on ${formatDateLabel(dateKey)}. Use another phrase or pick from the available times below.`,
        );
        return;
      }

      const didBeginDetails = beginClientDetailsStep(dateKey, requestedTime);

      if (didBeginDetails && isUpdatingExistingSelection) {
        setWasBookingUpdatedWithNaturalLanguage(true);
        setIsNLChangeDateOpen(false);
      }

      return;
    }

    if (
      !isDateAvailable(
        dateKey,
        selectedService,
        availability,
        bookings,
        undefined,
        activeBookingHolds,
        bookingHold?.released ? undefined : bookingHold?.id,
      )
    ) {
      if (!isUpdatingExistingSelection) {
        setBookingFlow((current) => ({
          ...current,
          dateKey,
          time: "",
        }));
      }
      setNaturalLanguageBookingError(
        `That day is unavailable on ${formatDateLabel(dateKey)}. Try another phrase or use the calendar below.`,
      );
      return;
    }

    const didBeginDetails = beginClientDetailsStep(dateKey, "");

    if (didBeginDetails && isUpdatingExistingSelection) {
      setWasBookingUpdatedWithNaturalLanguage(true);
    }
  }

  function resetServiceEditor() {
    setEditingServiceId(null);
    setServiceDraft(createBlankServiceDraft());
  }

  function beginEditingService(service: Service) {
    setEditingServiceId(service.id);
    setServiceDraft({
      name: service.name,
      bookingType: service.bookingType,
      durationMinutes: service.durationMinutes ?? 30,
      description: service.description,
      capacity: service.capacity ?? "",
      cost: service.cost ?? "",
      notes: service.notes ?? "",
    });
  }

  function upsertService() {
    if (!serviceDraft.name.trim() || !serviceDraft.description.trim()) {
      setSetupError("Add a service name and short description before saving it.");
      return;
    }

    const nextService: Service = {
      id: editingServiceId ?? createId("service"),
      name: serviceDraft.name.trim(),
      bookingType: serviceDraft.bookingType,
      durationMinutes:
        serviceDraft.bookingType === "appointment"
          ? serviceDraft.durationMinutes
          : undefined,
      description: serviceDraft.description.trim(),
      capacity: serviceDraft.capacity.trim() || undefined,
      cost: serviceDraft.cost.trim() || undefined,
      notes: serviceDraft.notes.trim() || undefined,
    };

    if (integratedMode) {
      return;
    }

    actions.updateStandaloneStore((current) => ({
      ...current,
      services: editingServiceId
        ? current.services.map((service) =>
            service.id === editingServiceId ? nextService : service,
          )
        : [...current.services, nextService],
    }));
    setSetupError(null);
    resetServiceEditor();
  }

  function removeService(serviceId: string) {
    if (integratedMode) {
      return;
    }

    if (services.length <= 1) {
      setSetupError("Keep at least one service. Add another before removing this one.");
      return;
    }

    const activeBookingsForService = bookings.some(
      (booking) => booking.serviceId === serviceId && booking.status !== "cancelled",
    );

    if (activeBookingsForService) {
      setSetupError("Cancel active bookings for this service before removing it.");
      return;
    }

    actions.updateStandaloneStore((current) => ({
      ...current,
      services: current.services.filter((service) => service.id !== serviceId),
    }));

    if (editingServiceId === serviceId) {
      resetServiceEditor();
    }
  }

  // Mark the standalone booking page live and persist it. Called when the
  // provider reaches the Done step, so the public URL works however it is
  // opened (new tab, copied link, etc.) — not only via the link's onClick.
  function publishStandaloneSetup() {
    if (integratedMode) {
      return;
    }

    const nextStore: ModuleStore = {
      ...activeStore,
      provider: {
        ...activeStore.provider,
        publicSlug:
          activeStore.provider.publicSlug ||
          slugify(
            activeStore.provider.businessName ||
              activeStore.provider.fullName ||
              "haab-calendar",
          ),
      },
      setupComplete: true,
    };

    actions.persistStandaloneStore(nextStore);
    actions.updateStandaloneStore(() => nextStore);
  }

  // Leave the Done step for the chosen surface. Setup is already published by
  // the time this runs, so these handlers only steer navigation.
  function leaveSetupToSurface(nextSurface: Surface) {
    setSetupPublished(false);
    setSurface(nextSurface);
    startFreshBooking();
  }

  function updateProvider<K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) {
    if (integratedMode) {
      return;
    }

    actions.updateStandaloneStore((current) => ({
      ...current,
      provider: {
        ...current.provider,
        [key]: value,
        publicSlug:
          key === "businessName"
            ? slugify((value as string) || current.provider.fullName || "haab-calendar")
            : current.provider.publicSlug ||
              slugify(current.provider.businessName || current.provider.fullName || "haab-calendar"),
      },
    }));
  }

  function updateAvailabilityDay(
    day: WeekdayKey,
    patch: Partial<DayAvailability>,
  ) {
    if (integratedMode) {
      return;
    }

    actions.updateStandaloneStore((current) => ({
      ...current,
      availability: {
        ...current.availability,
        [day]: {
          ...current.availability[day],
          ...patch,
        },
      },
    }));
  }

  function resetStandaloneSetup() {
    if (integratedMode) {
      return;
    }

    const empty = createEmptyStore();
    setSetupStep(1);
    setSetupError(null);
    resetServiceEditor();
    startFreshBooking();
    actions.updateStandaloneStore(() => empty);
  }

  function applyVertical(id: VerticalId) {
    if (integratedMode) {
      return;
    }

    const preset = VERTICALS.find((item) => item.id === id);
    if (!preset) {
      return;
    }

    setSetupError(null);
    setSetupStep(1);
    actions.updateStandaloneStore((current) => applyVerticalToStore(current, preset));
  }

  function validateSetup(step: SetupStep) {
    if (step === 1) {
      if (!provider.fullName.trim() || !provider.businessName.trim() || !provider.email.trim()) {
        return "Provider name, business name, and email are all required.";
      }
    }

    if (step === 2) {
      const hasEnabledDay = WEEKDAY_KEYS.some((day) => availability[day].enabled);

      if (!hasEnabledDay) {
        return "Enable at least one weekday so clients can book.";
      }

      const invalidWindow = WEEKDAY_KEYS.some(
        (day) =>
          availability[day].enabled &&
          toMinutes(availability[day].endTime) <= toMinutes(availability[day].startTime),
      );

      if (invalidWindow) {
        return "Each enabled day needs an end time later than its start time.";
      }

      const invalidBlockedWindow = WEEKDAY_KEYS.some((day) =>
        availability[day].enabled &&
        (availability[day].blockedWindows ?? []).some(
          (block) => toMinutes(block.endTime) <= toMinutes(block.startTime),
        ),
      );

      if (invalidBlockedWindow) {
        return "Each blocked time needs an end time later than its start time.";
      }

      const blockedWindowOutsideHours = WEEKDAY_KEYS.some((day) => {
        if (!availability[day].enabled) {
          return false;
        }

        const dayStart = toMinutes(availability[day].startTime);
        const dayEnd = toMinutes(availability[day].endTime);

        return (availability[day].blockedWindows ?? []).some(
          (block) =>
            toMinutes(block.startTime) < dayStart ||
            toMinutes(block.endTime) > dayEnd,
        );
      });

      if (blockedWindowOutsideHours) {
        return "Blocked times must sit inside the day's available hours.";
      }

      const overlappingBlockedWindows = WEEKDAY_KEYS.some((day) => {
        if (!availability[day].enabled) {
          return false;
        }

        const blocks = [...(availability[day].blockedWindows ?? [])].sort(
          (left, right) => toMinutes(left.startTime) - toMinutes(right.startTime),
        );

        return blocks.some((block, index) => {
          const nextBlock = blocks[index + 1];
          return Boolean(nextBlock) && toMinutes(block.endTime) > toMinutes(nextBlock.startTime);
        });
      });

      if (overlappingBlockedWindows) {
        return "Blocked times on the same day cannot overlap.";
      }
    }

    return null;
  }

  function goToNextSetupStep() {
    const error = validateSetup(setupStep);

    if (error) {
      setSetupError(error);
      return;
    }

    // Advancing from Availability (step 2) into Done (step 3) publishes the
    // page, so it is live regardless of how the public link is later opened.
    // A published page must have at least one service to be usable.
    if (setupStep === 2) {
      if (services.length === 0) {
        setSetupError("Add at least one service before publishing your booking page.");
        return;
      }

      publishStandaloneSetup();
      setSetupPublished(true);
    }

    setSetupError(null);
    setSetupStep((current) => (current < 3 ? ((current + 1) as SetupStep) : current));
  }

  function goToPreviousSetupStep() {
    setSetupError(null);

    if (setupStep > 1) {
      setSetupStep((current) => (current > 1 ? ((current - 1) as SetupStep) : current));
      return;
    }

    actions.updateStandaloneStore((current) => ({
      ...current,
      vertical: undefined,
    }));
  }

  function updateBookingFlow<K extends keyof BookingFlow>(key: K, value: BookingFlow[K]) {
    setBookingFlow((current) => {
      const next = { ...current, [key]: value };
      if (
        bookingError === "Client name, email, and phone number are required." &&
        (key === "clientName" || key === "clientEmail" || key === "clientPhone") &&
        String(next.clientName).trim() &&
        String(next.clientEmail).trim() &&
        String(next.clientPhone).trim()
      ) {
        setBookingError(null);
      }
      return next;
    });
  }

  function beginClientDetailsStep(dateKey = bookingFlow.dateKey, time = bookingFlow.time) {
    if (!selectedService || !dateKey) {
      return false;
    }

    if (selectedService.bookingType === "appointment" && !time) {
      return false;
    }

    const now = currentTimestamp();
    const latestStandaloneStore = actions.readStandaloneStoreSnapshot();
    const baseStore = latestStandaloneStore ?? activeStore;
    const latestService =
      baseStore.services.find((service) => service.id === selectedService.id) ?? selectedService;
    const currentHoldId = bookingHold?.released ? undefined : bookingHold?.id;
    const currentHolds = pruneBookingHolds(baseStore.bookingHolds, now).filter(
      (hold) => hold.id !== currentHoldId,
    );

    if (
      latestService.bookingType === "appointment" &&
      !getAvailableSlots(
        dateKey,
        latestService,
        baseStore.availability,
        baseStore.bookings,
        undefined,
        currentHolds,
      ).includes(time)
    ) {
      setBookingError(
        "The time you picked is not available anymore. Please go back and pick a new Date/Time.",
      );
      return false;
    }

    if (
      latestService.bookingType === "full-day" &&
      !isDateAvailable(
        dateKey,
        latestService,
        baseStore.availability,
        baseStore.bookings,
        undefined,
        currentHolds,
      )
    ) {
      setBookingError(
        "The time you picked is not available anymore. Please go back and pick a new Date/Time.",
      );
      return false;
    }

    const startedAt = now;
    const expiresAt = startedAt + BOOKING_HOLD_DURATION_MS;
    const holdRecord: BookingHoldRecord = {
      id: createId("hold"),
      serviceId: latestService.id,
      bookingType: latestService.bookingType,
      dateKey,
      startTime: latestService.bookingType === "appointment" ? time : undefined,
      endTime:
        latestService.bookingType === "appointment" && latestService.durationMinutes
          ? addMinutes(time, latestService.durationMinutes)
          : undefined,
      createdAt: new Date(startedAt).toISOString(),
      expiresAt,
    };

    if (!integratedMode && latestStandaloneStore) {
      actions.setStandaloneStore(latestStandaloneStore);
    }

    setBookingError(null);
    actions.commitBookingHolds([...currentHolds, holdRecord], baseStore);
    setBookingHold({
      id: holdRecord.id,
      selectionKey: getBookingHoldSelectionKey(latestService, dateKey, time),
      startedAt,
      expiresAt,
      released: false,
    });
    setBookingHoldNow(startedAt);
    setBookingFlow((current) => ({
      ...current,
      serviceId: latestService.id,
      dateKey,
      time,
      step: 3,
    }));
    return true;
  }

  function confirmBooking() {
    const now = currentTimestamp();
    const latestStandaloneStore = actions.readStandaloneStoreSnapshot();
    const validationStore = latestStandaloneStore ?? activeStore;
    const validationService =
      validationStore.services.find(
        (service) => service.id === resolvedBookingFlow.serviceId,
      ) ?? selectedService;
    const ignoredHoldId = bookingHold?.released ? undefined : bookingHold?.id;
    const validationHolds = pruneBookingHolds(validationStore.bookingHolds, now);

    if (!integratedMode && latestStandaloneStore) {
      actions.setStandaloneStore(latestStandaloneStore);
    }

    if (!validationService) {
      setBookingError("Choose a service before confirming the booking.");
      return;
    }

    if (!bookingFlow.dateKey) {
      setBookingError("Pick a date before confirming the booking.");
      return;
    }

    if (validationService.bookingType === "appointment" && !bookingFlow.time) {
      setBookingError("Select a time slot before continuing.");
      return;
    }

    if (
      !bookingFlow.clientName.trim() ||
      !bookingFlow.clientEmail.trim() ||
      !bookingFlow.clientPhone.trim()
    ) {
      setBookingError("Client name, email, and phone number are required.");
      return;
    }

    if (
      validationService.bookingType === "appointment" &&
      !getAvailableSlots(
        bookingFlow.dateKey,
        validationService,
        validationStore.availability,
        validationStore.bookings,
        undefined,
        validationHolds,
        ignoredHoldId,
      ).includes(bookingFlow.time)
    ) {
      setBookingError(
        "The time you picked is not available anymore. Please go back and pick a new Date/Time.",
      );
      return;
    }

    if (
      validationService.bookingType === "full-day" &&
      !isDateAvailable(
        bookingFlow.dateKey,
        validationService,
        validationStore.availability,
        validationStore.bookings,
        undefined,
        validationHolds,
        ignoredHoldId,
      )
    ) {
      setBookingError(
        "The time you picked is not available anymore. Please go back and pick a new Date/Time.",
      );
      return;
    }

    const createdAt = new Date().toISOString();
    const nextBooking: BookingRecord = {
      id: createId("booking"),
      serviceId: validationService.id,
      serviceName: validationService.name,
      bookingType: validationService.bookingType,
      dateKey: bookingFlow.dateKey,
      startTime:
        validationService.bookingType === "appointment" ? bookingFlow.time : undefined,
      endTime:
        validationService.bookingType === "appointment" && validationService.durationMinutes
          ? addMinutes(bookingFlow.time, validationService.durationMinutes)
          : undefined,
      clientName: bookingFlow.clientName.trim(),
      clientEmail: bookingFlow.clientEmail.trim(),
      clientPhone: bookingFlow.clientPhone.trim(),
      notes: bookingFlow.notes.trim(),
      capacitySnapshot: validationService.capacity,
      cost: validationService.cost ?? "",
      status: "confirmed",
      createdAt,
      updatedAt: createdAt,
      manageToken: generateManageToken(),
    };

    const nextHolds = validationHolds.filter((hold) => hold.id !== ignoredHoldId);

    console.log("Haab Calendar booking confirmed:", nextBooking);

    actions.commitBookings([...validationStore.bookings, nextBooking], validationStore, nextHolds);
    setBookingError(null);
    setBookingHold(null);
    setBookingHoldNow(now);
    setBookingFlow((current) => ({
      ...current,
      step: 4,
      successBookingId: nextBooking.id,
    }));
  }

  function openReschedule(bookingId: string) {
    const booking = bookings.find((candidate) => candidate.id === bookingId);

    if (!booking) {
      return;
    }

    const rescheduleWindow = createRollingWeekWindow(new Date(), 7, 4);
    const initialDateKey = clampDateKey(
      booking.dateKey,
      rescheduleWindow.startKey,
      rescheduleWindow.endKey,
    );
    const initialTime = initialDateKey === booking.dateKey ? (booking.startTime ?? "") : "";

    setRescheduleState({
      bookingId,
      dateKey: initialDateKey,
      time: initialTime,
      monthAnchor: parseDateKey(initialDateKey),
    });
  }

  function confirmReschedule() {
    if (!rescheduleState) {
      return;
    }

    const latestStandaloneStore = actions.readStandaloneStoreSnapshot();
    const validationStore = latestStandaloneStore ?? activeStore;
    const booking = validationStore.bookings.find(
      (candidate) => candidate.id === rescheduleState.bookingId,
    );
    const service = validationStore.services.find(
      (candidate) => candidate.id === booking?.serviceId,
    );

    if (!integratedMode && latestStandaloneStore) {
      actions.setStandaloneStore(latestStandaloneStore);
    }

    if (!booking || !service) {
      return;
    }

    if (!rescheduleState.dateKey) {
      return;
    }

    if (service.bookingType === "appointment") {
      const validationHolds = pruneBookingHolds(validationStore.bookingHolds);
      const nextSlots = getAvailableSlots(
        rescheduleState.dateKey,
        service,
        validationStore.availability,
        validationStore.bookings,
        booking.id,
        validationHolds,
      );

      if (!nextSlots.includes(rescheduleState.time)) {
        setRescheduleState((current) =>
          current
            ? { ...current, error: "That slot is no longer available — please pick another time." }
            : current,
        );
        return;
      }
    } else if (
      !isDateAvailable(
        rescheduleState.dateKey,
        service,
        validationStore.availability,
        validationStore.bookings,
        booking.id,
        pruneBookingHolds(validationStore.bookingHolds),
      )
    ) {
      setRescheduleState((current) =>
        current
          ? { ...current, error: "That date is no longer available — please pick another day." }
          : current,
      );
      return;
    }

    actions.commitBookings(
      validationStore.bookings.map((candidate) =>
        candidate.id === booking.id
          ? {
              ...candidate,
              dateKey: rescheduleState.dateKey,
              startTime:
                service.bookingType === "appointment" ? rescheduleState.time : undefined,
              endTime:
                service.bookingType === "appointment" && service.durationMinutes
                  ? addMinutes(rescheduleState.time, service.durationMinutes)
                  : undefined,
              status: "rescheduled",
              updatedAt: new Date().toISOString(),
            }
          : candidate,
      ),
      validationStore,
    );
    setRescheduleState(null);
  }

  function confirmCancellation() {
    if (!cancellationId) {
      return;
    }

    const latestStandaloneStore = actions.readStandaloneStoreSnapshot();
    const validationStore = latestStandaloneStore ?? activeStore;

    if (!integratedMode && latestStandaloneStore) {
      actions.setStandaloneStore(latestStandaloneStore);
    }

    actions.commitBookings(
      validationStore.bookings.map((booking) =>
        booking.id === cancellationId
          ? {
              ...booking,
              status: "cancelled",
              updatedAt: new Date().toISOString(),
            }
          : booking,
      ),
      validationStore,
    );
    setCancellationId(null);
  }

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1600);
    } catch {
      setCopiedLink(false);
    }
  }

  async function copyManageLink() {
    if (!successfulBooking?.manageToken) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildManageUrl(provider.publicSlug, successfulBooking.manageToken),
      );
      setCopiedManageLink(true);
      window.setTimeout(() => setCopiedManageLink(false), 1600);
    } catch {
      setCopiedManageLink(false);
    }
  }

  const sortedBookings = sortBookings(bookings);
  const upcomingWindowEnd = getDateKey(addDays(new Date(), 6));
  const upcomingBookings = sortedBookings.filter(
    (booking) =>
      booking.status !== "cancelled" &&
      compareDateKeys(booking.dateKey, todayKey()) >= 0 &&
      compareDateKeys(booking.dateKey, upcomingWindowEnd) <= 0,
  );
  const filteredBookings = sortedBookings.filter((booking) => {
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesType = typeFilter === "all" || booking.bookingType === typeFilter;
    const query = deferredSearch.trim().toLowerCase();
    const haystack = [
      booking.clientName,
      booking.clientEmail,
      booking.clientPhone,
      booking.serviceName,
      booking.dateKey,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);

    return matchesStatus && matchesType && matchesQuery;
  });
  const activeCalendarService =
    services.find((service) => service.id === calendarServiceId) ?? services[0];
  const publicSlots =
    selectedService && bookingFlow.dateKey && selectedService.bookingType === "appointment"
      ? getAvailableSlots(
          bookingFlow.dateKey,
          selectedService,
          availability,
          bookings,
          undefined,
          activeBookingHolds,
          bookingHold?.released ? undefined : bookingHold?.id,
        )
      : [];

  function renderWelcome() {
    return (
      <div className={cn(adminPanelClass, "p-6 sm:p-8")}>
        <SectionTitle
          eyebrow="Welcome"
          title="What kind of business is this?"
          body="Pick your industry and we'll set up your services and weekly hours. You can edit everything afterward."
        />
        <div className="mt-6">
          <VerticalPicker verticals={VERTICALS} onSelect={applyVertical} />
        </div>
      </div>
    );
  }

  function renderSetupWizard() {
    return (
      <>
        <div className={cn(adminPanelClass, "p-6 sm:p-8")}>
          <SectionTitle
            eyebrow="Setup"
            title="Set up your booking page"
            body="Add your details and weekly hours, then publish."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["1", "Provider"],
              ["2", "Availability"],
              ["3", "Done"],
            ].map(([index, label]) => {
              const stepNumber = Number(index) as SetupStep;
              const isCurrent = setupStep === stepNumber;
              const isComplete = setupStep > stepNumber;

              return (
                <div
                  key={label}
                  className={cn(
                    "rounded-3xl border px-4 py-4",
                    isCurrent && "border-[var(--accent)] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
                    !isCurrent && "border-[var(--line)] bg-white/70",
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    Step {index}
                  </p>
                  <p className="mt-2 text-base font-semibold text-[var(--ink)]">{label}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {isComplete ? "Ready" : isCurrent ? "Current" : "Next"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {setupStep === 1 ? (
          <div className="mt-8">
            <div className={cn(adminPanelClass, "p-6")}>
              <SectionTitle
                title="Tell us about the provider"
                body="These details feed confirmations, branding, and the public booking URL."
              />
              <div className="mt-6">
                <ProviderInfoForm provider={provider} onChange={updateProvider} />
              </div>
            </div>
          </div>
        ) : null}

        {setupStep === 2 ? (
          <div className={cn("mt-8", adminPanelClass, "p-6")}>
            <SectionTitle
              title="Set the weekly availability schedule"
              body="Appointment services generate real slots from these windows. Full-day services simply need the weekday enabled and free of conflicts."
            />
            <div className="mt-6">
              <AvailabilityEditor
                availability={availability}
                onChange={updateAvailabilityDay}
              />
            </div>
          </div>
        ) : null}

        {setupStep === 3 ? (
          <div className="mt-8">
            <div className={cn(adminPanelClass, "p-6")}>
              <SectionTitle
                eyebrow="Ready"
                title="Your booking page is ready"
                body="Publish now, then manage everything from your workspace."
              />
              <div className={cn("mt-6", adminInsetClass, "p-4")}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Public booking URL
                </p>
                <p className="mt-2 break-all text-sm font-medium text-[var(--ink)]">{publicUrl}</p>
              </div>
              <div className="mt-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Your services
                </p>
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={cn(adminInsetClass, "flex flex-wrap items-center gap-2 px-4 py-3")}
                  >
                    <span className="text-sm font-semibold text-[var(--ink)]">{service.name}</span>
                    <ToneBadge tone={bookingTypeTone(service.bookingType)}>
                      {getBookingTypeLabel(service.bookingType)}
                    </ToneBadge>
                    <ToneBadge tone="neutral">{formatDuration(service)}</ToneBadge>
                  </div>
                ))}
                <p className="text-sm text-[var(--muted)]">
                  Edit these anytime from the Services tab.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton tone="primary" onClick={() => leaveSetupToSurface("management")}>
                  Go to dashboard
                </ActionButton>
                <ActionLink
                  href={`/public/${businessSlug}`}
                  tone="secondary"
                  onClick={() => leaveSetupToSurface("public")}
                >
                  Open public booking page
                </ActionLink>
              </div>
            </div>
          </div>
        ) : null}

        {setupError ? (
          <div className="mt-8 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]">
            {setupError}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <ActionButton
            tone="ghost"
            onClick={goToPreviousSetupStep}
          >
            Back
          </ActionButton>
          {setupStep < 3 ? (
            <ActionButton tone="primary" onClick={goToNextSetupStep}>
              Continue
            </ActionButton>
          ) : null}
        </div>
      </>
    );
  }

  function renderDashboard() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-4">
          {[
            {
              label: "Upcoming (7 days)",
              value: String(upcomingBookings.length),
              detail: "Bookings scheduled soon",
            },
            {
              label: "Services",
              value: String(services.length),
              detail: "Appointment and full-day offerings",
            },
            {
              label: "Confirmed",
              value: String(bookings.filter((booking) => booking.status === "confirmed").length),
              detail: "Currently active bookings",
            },
            {
              label: "Total bookings",
              value: String(bookings.length),
              detail: "All time, every status",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn(adminInsetClass, "p-5")}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">{stat.detail}</p>
            </div>
          ))}
        </div>

        <div className={cn(adminPanelClass, "p-6")}>
          <SectionTitle title="Upcoming bookings" />
          <div className="mt-6 space-y-3">
              {upcomingBookings.length === 0 ? (
                <EmptyState
                  title="No bookings in the next 7 days"
                  body="New bookings appear here automatically."
                  action={
                    <ActionButton tone="primary" onClick={() => launchPublicFlow()}>
                      Open booking flow
                    </ActionButton>
                  }
                />
              ) : (
                upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={cn(adminInsetClass, "p-4")}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-[var(--ink)]">
                            {booking.clientName}
                          </p>
                          <ToneBadge tone={bookingTypeTone(booking.bookingType)}>
                            {getBookingTypeLabel(booking.bookingType)}
                          </ToneBadge>
                          <ToneBadge tone={statusTone(booking.status)}>
                            {booking.status}
                          </ToneBadge>
                        </div>
                        <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                          {booking.serviceName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {formatDateLabel(booking.dateKey)} ·{" "}
                          {formatTimeRange(booking.startTime, booking.endTime)}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {booking.capacitySnapshot
                            ? `Capacity: ${booking.capacitySnapshot}`
                            : "Capacity not set"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {booking.cost ? `Total: ${booking.cost}` : "Total not set"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ActionButton tone="ghost" onClick={() => openReschedule(booking.id)}>
                          Reschedule
                        </ActionButton>
                        <ActionButton tone="danger" onClick={() => setCancellationId(booking.id)}>
                          Cancel
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>
      </div>
    );
  }

  function renderBookingsList() {
    return (
      <div className={cn(adminPanelClass, "p-6")}>
        <SectionTitle title="All bookings" />
        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search client, service, email, or phone"
            className={cn("min-h-12", adminFieldClass)}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | BookingStatus)}
            className={cn("min-h-12", adminFieldClass)}
          >
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | BookingType)}
            className={cn("min-h-12", adminFieldClass)}
          >
            <option value="all">All types</option>
            <option value="appointment">Appointments</option>
            <option value="full-day">Full Day</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {filteredBookings.length === 0 ? (
            <EmptyState
              title="No bookings match the current filters"
              body="Try a broader search or clear the filters."
            />
          ) : (
            filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className={cn(
                  adminInsetClass,
                  "p-5",
                  booking.status === "cancelled" && "opacity-60",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-[var(--ink)]">
                        {booking.clientName}
                      </h4>
                      <ToneBadge tone={bookingTypeTone(booking.bookingType)}>
                        {getBookingTypeLabel(booking.bookingType)}
                      </ToneBadge>
                      <ToneBadge tone={statusTone(booking.status)}>
                        {booking.status}
                      </ToneBadge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                      {booking.serviceName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {formatDateLabel(booking.dateKey)} ·{" "}
                      {formatTimeRange(booking.startTime, booking.endTime)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                      <span>
                        {booking.clientEmail} · {booking.clientPhone}
                      </span>
                      {booking.capacitySnapshot ? (
                        <span>Capacity: {booking.capacitySnapshot}</span>
                      ) : null}
                      {booking.cost ? <span>Total: {booking.cost}</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <ActionButton
                      tone="ghost"
                      disabled={booking.status === "cancelled"}
                      onClick={() => openReschedule(booking.id)}
                    >
                      Reschedule
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      disabled={booking.status === "cancelled"}
                      onClick={() => setCancellationId(booking.id)}
                    >
                      Cancel
                    </ActionButton>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderAdminCalendar() {
    const weeks = createMonthMatrix(calendarMonthAnchor);

    return (
      <div className={cn(adminPanelClass, "space-y-6 p-6")}>
        <SectionTitle
          title="Monthly calendar"
          body="Click an available day to add a booking."
          action={
            services.length > 0 ? (
              <select
                value={activeCalendarService?.id ?? ""}
                onChange={(event) => setCalendarServicePreference(event.target.value)}
                className={cn("min-h-11 text-sm", adminFieldClass)}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    New booking: {service.name}
                  </option>
                ))}
              </select>
            ) : null
          }
        />

        <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-3", adminBarClass)}>
          <div className="flex items-center gap-2">
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              onClick={() => setCalendarMonthAnchor((current) => shiftMonth(current, -1))}
            >
              Previous
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              onClick={() => setCalendarMonthAnchor(new Date())}
            >
              Today
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              onClick={() => setCalendarMonthAnchor((current) => shiftMonth(current, 1))}
            >
              Next
            </ActionButton>
          </div>
          <p className="text-base font-semibold text-[var(--ink)]">
            {formatMonthLabel(calendarMonthAnchor)}
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
              Appointment
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--full-day)]" />
              Full Day
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          {WEEKDAY_KEYS.map((day) => (
            <p key={day}>{weekdayShortFormatter.format(parseDateKey(`2024-03-${pad(WEEKDAY_KEYS.indexOf(day) + 3)}`))}</p>
          ))}
        </div>

        <div className="grid gap-2">
          {weeks.map((week) => (
            <div key={week[0].toISOString()} className="grid grid-cols-7 gap-2">
              {week.map((date) => {
                const dateKey = getDateKey(date);
                const dayBookings = getBookingsForDate(bookings, dateKey);
                const canTest =
                  activeCalendarService &&
                  isDateAvailable(
                    dateKey,
                    activeCalendarService,
                    availability,
                    bookings,
                    undefined,
                    activeBookingHolds,
                  );
                const inMonth = date.getMonth() === calendarMonthAnchor.getMonth();

                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={!activeCalendarService || !canTest}
                    onClick={() =>
                      activeCalendarService
                        ? launchPublicFlow({
                            serviceId: activeCalendarService.id,
                            dateKey,
                            step: 2,
                          })
                        : undefined
                    }
                    className={cn(
                      "min-h-[124px] rounded-[26px] p-3 text-left transition",
                      inMonth
                        ? adminChoiceQuietClass
                        : cn(adminChoiceQuietClass, "text-[var(--muted)] opacity-75"),
                      canTest && "hover:shadow-[0_18px_48px_rgba(15,23,42,0.08)]",
                      !canTest && "cursor-default",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        {date.getDate()}
                      </span>
                      {canTest ? (
                        <ToneBadge tone="primary">Open</ToneBadge>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-2">
                      {dayBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className={cn(
                            "rounded-2xl px-3 py-2 text-xs font-medium",
                            booking.bookingType === "full-day"
                              ? "bg-[var(--full-day)] text-white"
                              : "bg-[var(--accent-soft)] text-[var(--accent)]",
                          )}
                        >
                          <p className="font-semibold">
                            {booking.bookingType === "full-day"
                              ? "Full Day"
                              : formatTimeLabel(booking.startTime)}
                          </p>
                          <p className="mt-1 truncate">{booking.serviceName}</p>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderServices() {
    return (
      <ServiceEditor
        services={services}
        serviceDraft={serviceDraft}
        onDraftChange={setServiceDraft}
        editingServiceId={editingServiceId}
        onUpsert={upsertService}
        onReset={resetServiceEditor}
        onEdit={beginEditingService}
        onRemove={removeService}
        disabled={integratedMode}
        hints={VERTICALS.find((item) => item.id === vertical)?.hints}
      />
    );
  }

  function renderSettings() {
    return (
      <div className="grid items-start gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className={cn(adminPanelClass, "p-6")}>
          <SectionTitle title="Provider information" />
          {integratedMode ? (
            <div className={cn("mt-4", adminInsetClass, "px-4 py-3 text-sm text-[var(--muted)]")}>
              Configured by the parent app. These settings are visible but not editable.
            </div>
          ) : null}
          <div className="mt-6">
            <ProviderInfoForm
              provider={provider}
              onChange={updateProvider}
              disabled={integratedMode}
            />
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Public booking link:{" "}
            <span className="break-all font-medium text-[var(--ink)]">{publicUrl}</span>
          </p>
          {!integratedMode ? (
            <div className="mt-6">
              <ActionButton tone="danger" onClick={resetStandaloneSetup}>
                Reset standalone setup
              </ActionButton>
            </div>
          ) : null}
        </div>

        <div className={cn(adminPanelClass, "p-6")}>
          <SectionTitle title="Weekly availability" />
          <div className="mt-6">
            <AvailabilityEditor
              availability={availability}
              onChange={updateAvailabilityDay}
              disabled={integratedMode}
            />
          </div>
        </div>
      </div>
    );
  }

  function renderPublicCalendar() {
    const earliestVisibleDate = new Date();
    const earliestVisibleDateKey = getDateKey(earliestVisibleDate);
    const earliestVisibleMonthAnchor = new Date(
      earliestVisibleDate.getFullYear(),
      earliestVisibleDate.getMonth(),
      1,
    );
    const monthGridStart = getWeekStart(
      new Date(publicMonthAnchor.getFullYear(), publicMonthAnchor.getMonth(), 1),
    );
    const earliestVisibleWeekStart = getWeekStart(earliestVisibleDate);
    const visibleGridStart =
      compareDateKeys(getDateKey(monthGridStart), earliestVisibleDateKey) < 0
        ? earliestVisibleWeekStart
        : monthGridStart;
    const canGoToPreviousPublicMonth =
      compareMonthAnchors(publicMonthAnchor, earliestVisibleMonthAnchor) > 0;
    const weeks = createWeekWindow(visibleGridStart, 4);

    return (
      <div className="space-y-5">
        <div
          className={cn(
            "flex flex-col gap-3 rounded-[24px] px-4 py-3 sm:flex-row-reverse sm:items-center sm:justify-between",
            publicGlassBarClass,
          )}
        >
          <p className="text-center text-base font-semibold text-[var(--ink)] sm:text-right">
            {formatMonthLabel(publicMonthAnchor)}
          </p>
          <div className="flex items-center gap-2">
            <ActionButton
              tone="ghost"
              className={cn(calendarNavPillClass, "flex-1 sm:flex-none")}
              disabled={!canGoToPreviousPublicMonth}
              onClick={() => setPublicMonthAnchor((current) => shiftMonth(current, -1))}
            >
              Previous
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={cn(calendarNavPillClass, "flex-1 sm:flex-none")}
              onClick={() => setPublicMonthAnchor(new Date())}
            >
              Today
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={cn(calendarNavPillClass, "flex-1 sm:flex-none")}
              onClick={() => setPublicMonthAnchor((current) => shiftMonth(current, 1))}
            >
              Next
            </ActionButton>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-[22px] px-4 py-3",
            publicStatusStripClass,
          )}
        >
          <p className="text-sm font-medium text-[var(--muted)]">
            Only real free dates are active.
          </p>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {bookingFlow.dateKey ? formatDateLabel(bookingFlow.dateKey) : "No date selected yet"}
          </p>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:gap-2 sm:text-xs sm:tracking-[0.18em]">
          {WEEKDAY_KEYS.map((day) => (
            <p key={day}>{weekdayShortFormatter.format(parseDateKey(`2024-03-${pad(WEEKDAY_KEYS.indexOf(day) + 3)}`))}</p>
          ))}
        </div>
        <div className="grid gap-1.5 sm:gap-2">
          {weeks.map((week) => (
            <div key={week[0].toISOString()} className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {week.map((date) => {
                const dateKey = getDateKey(date);
                const inMonth = date.getMonth() === publicMonthAnchor.getMonth();
                const available = selectedService
                  ? isDateAvailable(
                      dateKey,
                      selectedService,
                      availability,
                      bookings,
                      undefined,
                      activeBookingHolds,
                      bookingHold?.released ? undefined : bookingHold?.id,
                    )
                  : false;
                const chosen = bookingFlow.dateKey === dateKey;
                const isToday = dateKey === todayKey();

                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={!selectedService || !available}
                    onClick={() => {
                      setNaturalLanguageBookingError(null);
                      setBookingError(null);
                      const previousDateKey = bookingFlow.dateKey;
                      setBookingFlow((current) => ({
                        ...current,
                        dateKey,
                        time: "",
                      }));
                      if (
                        !hasScrolledToSlotsRef.current &&
                        !previousDateKey &&
                        typeof window !== "undefined"
                      ) {
                        hasScrolledToSlotsRef.current = true;
                        window.requestAnimationFrame(() => {
                          window.requestAnimationFrame(() => {
                            const summaryEl = publicSummaryPanelRef.current;
                            if (!summaryEl) return;
                            const stickyHeight = stickyHeaderRef.current?.offsetHeight ?? 0;
                            const targetY =
                              summaryEl.getBoundingClientRect().top +
                              window.scrollY -
                              stickyHeight -
                              12;
                            window.scrollTo({
                              top: Math.max(0, targetY),
                              behavior: "smooth",
                            });
                          });
                        });
                      }
                    }}
                    className={cn(
                      "flex aspect-square min-h-0 flex-col items-center justify-center gap-1 rounded-2xl p-1.5 text-center transition sm:aspect-auto sm:min-h-[88px] sm:items-stretch sm:rounded-[24px] sm:p-3 sm:text-left md:min-h-[104px]",
                      inMonth
                        ? publicQuietChoiceClass
                        : publicSoftChoiceClass,
                      available &&
                        (isDedicatedPublicPage
                          ? "hover:bg-[rgba(255,255,255,0.72)] hover:ring-2 hover:ring-[rgba(26,115,232,0.12)]"
                          : "hover:border-[var(--accent)]"),
                      chosen &&
                        (isDedicatedPublicPage
                          ? cn(
                              publicSelectedChoiceClass,
                              "border-[var(--accent)] ring-2 ring-[rgba(26,115,232,0.16)]",
                            )
                          : publicSelectedChoiceClass),
                      !available && "cursor-default opacity-50",
                    )}
                  >
                    <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <span className="text-base font-semibold text-[var(--ink)] sm:text-sm">
                        {date.getDate()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {chosen ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-[var(--accent)] sm:hidden" />
                            <span className={cn("hidden shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[var(--accent)] sm:inline", compactBadgeTextClass)}>
                              Selected
                            </span>
                          </>
                        ) : null}
                        {!chosen && isToday ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)] sm:hidden" />
                            <span
                              className={cn(
                                "hidden shrink-0 rounded-full bg-[var(--surface-soft)] px-1.5 py-0.5 text-[var(--muted)] sm:inline",
                                compactBadgeTextClass,
                              )}
                            >
                              Today
                            </span>
                          </>
                        ) : null}
                        {!chosen && !isToday && available ? (
                          <span className="h-2 w-2 rounded-full bg-[var(--accent)] sm:h-2.5 sm:w-2.5" />
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderPublicFlow() {
    const isPublicSelectionStep = resolvedBookingFlow.step === 2;
    const isPublicDetailsStep = resolvedBookingFlow.step === 3;
    const isPublicSuccessStep = resolvedBookingFlow.step === 4 && Boolean(successfulBooking);
    // Confirmation step: compress the three columns to 60% of the measured height.
    const successColumnHeight =
      isDesktopColumns && isPublicSuccessStep && publicPrimaryPanelHeight
        ? Math.round(publicPrimaryPanelHeight * 0.6)
        : null;

    const step2IsAppointment = selectedService?.bookingType === "appointment";
    const step2DateChosen = Boolean(bookingFlow.dateKey);
    const step2TimeChosen = Boolean(bookingFlow.time);
    const step2DateAvailableForFullDay =
      !step2IsAppointment &&
      step2DateChosen &&
      Boolean(selectedService) &&
      isDateAvailable(
        bookingFlow.dateKey,
        selectedService!,
        availability,
        bookings,
        undefined,
        activeBookingHolds,
        bookingHold?.released ? undefined : bookingHold?.id,
      );
    const step2CanContinue = step2IsAppointment
      ? step2DateChosen && step2TimeChosen
      : step2DateChosen && step2DateAvailableForFullDay;
    const step2Summary = step2IsAppointment
      ? step2DateChosen && step2TimeChosen
        ? `${formatDateLabel(bookingFlow.dateKey)} · ${formatTimeLabel(bookingFlow.time)}`
        : step2DateChosen
          ? formatDateLabel(bookingFlow.dateKey)
          : "Select a Day"
      : step2DateChosen
        ? `${formatDateLabel(bookingFlow.dateKey)} · Full day`
        : "Select a Day";
    const step2Helper = step2IsAppointment
      ? !step2DateChosen
        ? "Pick a date from the calendar and time slot below to continue."
        : !step2TimeChosen
          ? "Pick a time slot to continue."
          : "Ready to continue. Click the button to enter your details."
      : !step2DateChosen
        ? "Pick a date to reserve the full day."
        : step2DateAvailableForFullDay
          ? "This day is free. Click the button to enter your details."
          : "This day isn't available. Pick another date.";
    const step2ButtonLabel = step2IsAppointment
      ? !step2DateChosen
        ? "Select a Date"
        : !step2TimeChosen
          ? "Select a Time"
          : "Continue to My Details"
      : "Book full day";

    const advanceToDetailsStep = () => {
      const fadeAndAdvance = () => {
        setIsPublicFlowFadingOut(true);
        window.setTimeout(() => {
          beginClientDetailsStep();
          window.requestAnimationFrame(() => {
            setIsPublicFlowFadingOut(false);
          });
        }, 220);
      };
      if (typeof window === "undefined" || window.scrollY <= 0) {
        if (typeof window === "undefined") {
          beginClientDetailsStep();
          return;
        }
        fadeAndAdvance();
        return;
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.removeEventListener("scrollend", finish);
        clearTimeout(timeoutId);
        fadeAndAdvance();
      };
      const timeoutId = window.setTimeout(finish, 700);
      if ("onscrollend" in window) {
        window.addEventListener("scrollend", finish, { once: true });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const goBackToSelectionStep = () => {
      actions.releaseBookingHold(bookingHold?.released ? undefined : bookingHold?.id);
      setBookingHold(null);
      setBookingHoldNow(currentTimestamp());
      setBookingError(null);
      setWasBookingUpdatedWithNaturalLanguage(false);
      setIsNLBookingOpen(false);
      setNaturalLanguageBookingInput("");
      setNaturalLanguageBookingError(null);
      setBookingFlow((current) => ({ ...current, step: 2 }));
    };

    return (
      <div
        className={cn(
          "transition-opacity duration-300 ease-out",
          isPublicFlowFadingOut ? "opacity-0" : "opacity-100",
        )}
      >
        {(isPublicSelectionStep || isPublicDetailsStep || isPublicSuccessStep) &&
        selectedService ? (
          <>
            <div ref={attachStickyHeaderSentinel} aria-hidden="true" className="h-px" />
            <div
              ref={stickyHeaderRef}
              className={cn(
                "relative px-4 pt-4 sm:px-8 sm:pt-8 transition-[padding-bottom] duration-500 ease-out before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[32px] sm:before:rounded-[56px] xl:before:rounded-[60px] before:bg-[linear-gradient(135deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08))] before:opacity-0 before:[backdrop-filter:blur(24px)_saturate(160%)] before:[-webkit-backdrop-filter:blur(24px)_saturate(160%)] before:ring-1 before:ring-inset before:ring-white/40 before:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(15,23,42,0.08),0_14px_34px_rgba(15,23,42,0.12)] before:transition-opacity before:duration-500 before:ease-out",
                isPublicSelectionStep && "sticky top-0 z-30",
                isDedicatedPublicPage && "xl:px-10 xl:pt-10",
                isStickyHeaderActive &&
                  "pb-6 before:opacity-100 sm:pb-8 xl:pb-10",
              )}
            >
            <div className={cn("relative z-10", stickyBarPanelClass)}>
              <div className="px-5 py-5 sm:px-7 sm:py-6">
                <PublicProgressIndicator
                  currentStep={resolvedBookingFlow.step as 2 | 3 | 4}
                  isDedicatedPublicPage={isDedicatedPublicPage}
                />
              </div>
              {isPublicDetailsStep || isPublicSuccessStep ? (
                <div className="px-5 pb-5 sm:px-7 sm:pb-6">
                  <BookingHoldCountdownBar
                    isCancelled={isPublicSuccessStep && isSuccessfulBookingCancelled}
                    isConfirmed={isPublicSuccessStep && !isSuccessfulBookingCancelled}
                    isExpired={isBookingHoldExpired}
                    remainingMs={bookingHoldRemainingMs}
                    remainingRatio={bookingHoldRemainingRatio}
                    helperDesktopHidden={isPublicDetailsStep}
                  />
                </div>
              ) : null}
              {isPublicSelectionStep ? (
                <>
                  <div className="h-px bg-[rgba(15,23,42,0.06)]" aria-hidden="true" />
                  <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-6 sm:pt-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            Appointment Date:
                          </p>
                          <p className="text-[0.9375rem] font-semibold text-[var(--ink)]">
                            {step2Summary}
                          </p>
                        </div>
                        <p className="mt-1 text-[0.9375rem] leading-6 text-[var(--muted)]">
                          {step2Helper}
                        </p>
                      </div>
                      <div className="hidden w-full flex-wrap items-center justify-end gap-3 lg:flex lg:w-auto">
                        <ActionButton
                          tone="primary"
                          className={cn("min-w-[150px] px-6 !text-[0.9375rem]", publicPrimaryActionClass)}
                          disabled={!step2CanContinue}
                          onClick={advanceToDetailsStep}
                        >
                          {step2ButtonLabel}
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                </>
              ) : isPublicDetailsStep ? (
                <>
                  <div className="h-px bg-[rgba(15,23,42,0.06)]" aria-hidden="true" />
                  <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-6 sm:pt-5">
                    <div className="hidden w-full flex-wrap items-center justify-between gap-4 lg:flex">
                      <p className="min-w-0 flex-1 text-[0.9375rem] leading-6 text-[var(--muted)]">
                        {isBookingHoldExpired
                          ? "This slot may be released, but you can still try booking it."
                          : "Finish your details before the temporary hold expires."}
                      </p>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <ActionButton
                          tone="ghost"
                          className={cn(
                            "min-w-[150px] px-6 !text-[0.9375rem]",
                            isDedicatedPublicPage &&
                              cn(publicPillButtonClass, publicGhostButtonClass),
                          )}
                          onClick={goBackToSelectionStep}
                        >
                          Back
                        </ActionButton>
                        <ActionButton
                          tone="primary"
                          className={cn("min-w-[150px] px-6 !text-[0.9375rem]", publicPrimaryActionClass)}
                          onClick={confirmBooking}
                        >
                          {isBookingHoldExpired ? "Try booking" : "Confirm"}
                        </ActionButton>
                      </div>
                    </div>
                    {bookingError ? (
                      <div className="mt-4 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]">
                        {bookingError}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
          </>
        ) : null}
        {resolvedBookingFlow.step === 1 ? (
          <div className={cn("space-y-6 p-5 sm:p-8", isDedicatedPublicPage && "xl:px-10 xl:py-10")}>
            <SectionTitle
              title="Choose a service"
              body={
                services.length === 1
                  ? "Only one service is available, so the module skips this step automatically."
                  : "Every card clearly shows whether it books a timed appointment or an entire day."
              }
            />
            <div className="grid gap-4 xl:grid-cols-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setNaturalLanguageBookingInput("");
                    setNaturalLanguageBookingError(null);
                    setBookingFlow((current) => ({
                      ...current,
                      serviceId: service.id,
                      dateKey: "",
                      time: "",
                      step: 2,
                    }));
                  }}
                  className={cn(
                    "rounded-[30px] p-6 text-left transition",
                    isDedicatedPublicPage
                      ? "bg-[rgba(248,249,250,0.94)] ring-1 ring-[rgba(255,255,255,0.68)] shadow-[0_18px_42px_rgba(25,28,29,0.06)] hover:translate-y-[-2px] hover:bg-[rgba(255,255,255,0.9)]"
                      : "border border-[var(--line)] bg-white hover:border-[var(--accent)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-semibold text-[var(--ink)]">{service.name}</h4>
                    <ToneBadge tone={bookingTypeTone(service.bookingType)}>
                      {getBookingTypeLabel(service.bookingType)}
                    </ToneBadge>
                    <ToneBadge tone="neutral">{formatDuration(service)}</ToneBadge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {service.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                    {service.capacity ? <span>Capacity: {service.capacity}</span> : null}
                    {service.cost ? <span>Total: {service.cost}</span> : null}
                    {service.notes ? <span>Notes: {service.notes}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {(isPublicSelectionStep || isPublicDetailsStep || isPublicSuccessStep) && selectedService ? (
          <div
            className={cn(
              "grid gap-4 p-4 sm:gap-5 sm:p-8",
              isDedicatedPublicPage && "xl:px-10 xl:py-10",
              isPublicSelectionStep
                ? "lg:grid-cols-[7fr_3fr]"
                : "lg:grid-cols-3",
            )}
          >
            <div
              ref={publicPrimaryPanelRef}
              className={cn(
                "order-1 lg:order-none",
                publicPrimaryPanelClass,
                isPublicSelectionStep && "transition-opacity duration-200",
                isPublicSelectionStep && shouldDimManualBookingPanels && "opacity-50",
                isPublicSuccessStep && successColumnHeight !== null && "flex flex-col overflow-hidden",
              )}
              style={
                isDesktopColumns && isPublicSuccessStep && successColumnHeight
                  ? { height: `${successColumnHeight}px` }
                  : isDesktopColumns && isPublicDetailsStep && publicPrimaryPanelHeight
                    ? { minHeight: `${publicPrimaryPanelHeight}px` }
                    : undefined
              }
            >
              {isPublicSelectionStep ? (
                <>
                  <SectionTitle
                    title="Pick a date and time"
                  />
                  <div className="mt-4">
                    {!isNLBookingOpen ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNLBookingOpen(true);
                          setNaturalLanguageBookingError(null);
                        }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-3.5 w-3.5"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Type a date and time instead
                      </button>
                    ) : (
                      <div className="space-y-3 rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                        <label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]">
                          <span>
                            {selectedService.bookingType === "appointment"
                              ? "Describe a date and time"
                              : "Describe a date"}
                          </span>
                          <input
                            type="text"
                            value={naturalLanguageBookingInput}
                            autoFocus
                            onChange={(event) => {
                              setNaturalLanguageBookingInput(event.target.value);
                              setNaturalLanguageBookingError(null);
                            }}
                            onFocus={() => setIsNaturalLanguageBookingFocused(true)}
                            onBlur={() => setIsNaturalLanguageBookingFocused(false)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                continueWithNaturalLanguageBooking();
                              }
                            }}
                            placeholder={
                              selectedService.bookingType === "appointment"
                                ? "e.g. \"next Monday at 2 PM\""
                                : "e.g. \"next Friday\""
                            }
                            className={publicFieldClass}
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            tone="primary"
                            className={cn("flex-1", publicPrimaryActionClass)}
                            onClick={continueWithNaturalLanguageBooking}
                          >
                            Continue to My Details
                          </ActionButton>
                          <ActionButton
                            tone="ghost"
                            className={
                              isDedicatedPublicPage
                                ? cn(publicPillButtonClass, publicGhostButtonClass)
                                : undefined
                            }
                            onClick={() => {
                              setIsNLBookingOpen(false);
                              setNaturalLanguageBookingInput("");
                              setNaturalLanguageBookingError(null);
                            }}
                          >
                            Cancel
                          </ActionButton>
                        </div>
                        {naturalLanguageBookingError ? (
                          <div className="rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]">
                            {naturalLanguageBookingError}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="mt-6">{renderPublicCalendar()}</div>
                </>
              ) : isPublicDetailsStep || isPublicSuccessStep ? (
                <>
                  <SectionTitle
                    title="My Details"
                  />
                  <div
                    className={cn(
                      "relative mt-6",
                      isPublicSuccessStep && successColumnHeight !== null && "min-h-0 flex-1 overflow-hidden",
                    )}
                  >
                    <div
                      className={cn(
                        "grid gap-4 transition-[filter,opacity] duration-300",
                        isPublicSuccessStep && "pointer-events-none blur-[6px] opacity-45",
                      )}
                    >
                      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                        <span className={cn("text-[var(--muted)]", compactMetaTextClass)}>
                          Full name
                        </span>
                        <input
                          value={bookingFlow.clientName}
                          onChange={(event) => updateBookingFlow("clientName", event.target.value)}
                          placeholder="Jamie Rivera"
                          className={publicFieldClass}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                        <span className={cn("text-[var(--muted)]", compactMetaTextClass)}>
                          Email
                        </span>
                        <input
                          value={bookingFlow.clientEmail}
                          onChange={(event) => updateBookingFlow("clientEmail", event.target.value)}
                          placeholder="jamie@example.com"
                          type="email"
                          className={publicFieldClass}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                        <span className={cn("text-[var(--muted)]", compactMetaTextClass)}>
                          Phone number
                        </span>
                        <input
                          value={bookingFlow.clientPhone}
                          onChange={(event) => updateBookingFlow("clientPhone", event.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className={publicFieldClass}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                        <span className={cn("text-[var(--muted)]", compactMetaTextClass)}>
                          Notes
                        </span>
                        <textarea
                          value={bookingFlow.notes}
                          onChange={(event) => updateBookingFlow("notes", event.target.value)}
                          placeholder="Anything we should know before your booking?"
                          rows={4}
                          className={publicTextareaClass}
                        />
                      </label>
                    </div>
                    {isPublicSuccessStep ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[28px] bg-[rgba(248,249,250,0.52)] backdrop-blur-[10px]">
                        <div className="px-6 text-center">
                          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-3xl">
                            {isSuccessfulBookingCancelled ? (
                              <>
                                Booking
                                <br />
                                Cancelled
                              </>
                            ) : (
                              <>
                                Success
                                <br />
                                Booking Confirmed
                              </>
                            )}
                          </h3>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>

            {(isPublicDetailsStep || (isPublicSuccessStep && !isMobileBrowser)) ? (
              <div
                ref={publicAboutPanelRef}
                className={cn(
                  "order-3 lg:order-none self-start lg:sticky lg:top-8 flex min-h-full flex-col",
                  publicSoftPanelClass,
                )}
                style={
                  isDesktopColumns && isPublicSuccessStep && successColumnHeight
                    ? { height: `${successColumnHeight}px` }
                    : isDesktopColumns && publicPrimaryPanelHeight
                      ? { minHeight: `${publicPrimaryPanelHeight}px` }
                      : undefined
                }
              >
                <SectionTitle
                  title={
                    isPublicSuccessStep && successfulBooking && !isSuccessfulBookingCancelled
                      ? "Download event to your phone"
                      : "About the Appointment"
                  }
                />
                <div
                  className={cn(
                    "mt-6 min-h-0 flex-1",
                    isPublicSuccessStep && successColumnHeight !== null && "overflow-y-auto",
                    publicInsetCardClass,
                  )}
                >
                  {isPublicSuccessStep && successfulBooking && !isSuccessfulBookingCancelled ? (
                    <div className="flex h-full flex-col items-center justify-center">
                      {calendarQrCode?.bookingId === successfulBooking.id && calendarQrCode.url ? (
                        <div
                          aria-label="QR code to add this booking to a calendar"
                          className="min-h-0 w-full flex-1 bg-contain bg-center bg-no-repeat"
                          role="img"
                          style={{ backgroundImage: `url(${calendarQrCode.url})` }}
                        />
                      ) : (
                        <p className="px-5 text-sm leading-6 text-[var(--muted)]">
                          {calendarQrCode?.bookingId === successfulBooking.id && calendarQrCode.error
                            ? calendarQrCode.error
                            : "Preparing calendar QR..."}
                        </p>
                      )}
                      <p className="mt-4 text-sm leading-6 text-[var(--muted)] text-center">
                        Scan to add this booking to your calendar.
                      </p>
                    </div>
                  ) : (
                    <dl className="grid gap-4">
                      <SummaryField label="Type of service" value={selectedService.name} />
                      <SummaryField
                        label="Type"
                        value={getBookingTypeLabel(selectedService.bookingType)}
                      />
                      <SummaryField label="Capacity" value={formatCapacityLabel(selectedService)} />
                      <SummaryField label="Length" value={formatDuration(selectedService)} />
                      <SummaryField label="Total" value={selectedService.cost || "Not set"} />
                      {selectedService.notes ? (
                        <SummaryField label="Notes" value={selectedService.notes} />
                      ) : null}
                    </dl>
                  )}
                </div>
              </div>
            ) : null}

            <div
              ref={publicSummaryPanelRef}
              className={cn(
                "order-2 lg:order-none self-start lg:sticky lg:top-8",
                publicElevatedPanelClass,
                isPublicSelectionStep &&
                  selectedService.bookingType === "appointment" &&
                  bookingFlow.dateKey &&
                  "flex flex-col overflow-hidden",
                (isPublicDetailsStep || isPublicSuccessStep) && "flex min-h-full flex-col",
                isPublicSelectionStep && "transition-opacity duration-200",
                isPublicSelectionStep && shouldDimManualBookingPanels && "opacity-50",
              )}
              style={
                isDesktopColumns &&
                isPublicSelectionStep &&
                selectedService.bookingType === "appointment" &&
                bookingFlow.dateKey &&
                publicPrimaryPanelHeight
                  ? {
                      height: `${publicPrimaryPanelHeight}px`,
                      maxHeight: `${publicPrimaryPanelHeight}px`,
                    }
                  : isDesktopColumns && isPublicSuccessStep && successColumnHeight
                    ? { height: `${successColumnHeight}px` }
                    : isDesktopColumns &&
                        isPublicDetailsStep &&
                        publicPrimaryPanelHeight
                      ? { minHeight: `${publicPrimaryPanelHeight}px` }
                      : undefined
              }
            >
              {isPublicSelectionStep ? (
                <>
                  <SectionTitle
                    eyebrow={hasMultipleServices ? selectedService.name : undefined}
                    title={
                      selectedService.bookingType === "appointment"
                        ? "Available time slots"
                        : "Full-day reservation"
                    }
                    body={
                      bookingFlow.dateKey
                        ? formatDateLabel(bookingFlow.dateKey)
                        : "Select a highlighted date from the calendar first."
                    }
                  />
                  {!bookingFlow.dateKey ? (
                    <div className="mt-6">
                      <EmptyState
                        title="Choose a date"
                        body="Only real free dates are highlighted. Once you pick one, the next action becomes available here."
                      />
                    </div>
                  ) : selectedService.bookingType === "appointment" ? (
                    <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4">
                      {publicSlots.length === 0 ? (
                        <div className="min-h-0 flex-1">
                          <EmptyState
                            title="No slots left on this date"
                            body="Pick another available date from the calendar to continue."
                          />
                        </div>
                      ) : (
                        <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                            {publicSlots.map((slot) => {
                              const slotEnd = addMinutes(
                                slot,
                                selectedService.durationMinutes ?? 30,
                              );
                              const isSelected = bookingFlow.time === slot;

                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => {
                                    setNaturalLanguageBookingError(null);
                                    updateBookingFlow("time", slot);
                                  }}
                                  className={cn(
                                    "relative flex w-full items-start justify-between gap-4 rounded-[24px] px-5 py-4 text-left transition",
                                    isDedicatedPublicPage
                                      ? publicQuietChoiceClass
                                      : "border border-[var(--line)] bg-[var(--surface-soft)]",
                                    isSelected &&
                                      (isDedicatedPublicPage
                                        ? cn(publicSelectedChoiceClass, "text-[var(--ink)]")
                                        : "border-[var(--accent)] bg-[var(--accent-soft)]"),
                                    !isSelected &&
                                      (isDedicatedPublicPage
                                        ? "hover:bg-[rgba(255,255,255,0.72)]"
                                        : "hover:border-[var(--accent)]"),
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "absolute bottom-4 left-0 top-4 w-1 rounded-full transition",
                                      isSelected
                                        ? "bg-[var(--secondary-fixed)]"
                                        : "bg-transparent",
                                    )}
                                  />
                                  <div className="pl-4">
                                    <p className="text-base font-semibold text-[var(--ink)]">
                                      {formatTimeLabel(slot)}
                                    </p>
                                    <p
                                      className={cn(
                                        "mt-1 text-[var(--muted)]",
                                        compactMetaTextClass,
                                      )}
                                    >
                                      Ends {formatTimeLabel(slotEnd)}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      "pt-1 text-[var(--action-teal-deep)]",
                                      compactMetaTextClass,
                                    )}
                                  >
                                    {isSelected ? "Selected" : "Open"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      <div className={publicInsetCardClass}>
                        <p className="text-sm font-medium text-[var(--muted)]">
                          {isDateAvailable(
                            bookingFlow.dateKey,
                            selectedService,
                            availability,
                            bookings,
                            undefined,
                            activeBookingHolds,
                            bookingHold?.released ? undefined : bookingHold?.id,
                          )
                            ? "This day is currently free for a full-day reservation."
                            : "This day is unavailable. Choose another date from the calendar."}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <SectionTitle
                    title={
                      isPublicSuccessStep && successfulBooking ? (
                        <SummaryStatusTitle
                          status={isSuccessfulBookingCancelled ? "cancelled" : "confirmed"}
                        />
                      ) : isPublicDetailsStep && wasBookingUpdatedWithNaturalLanguage ? (
                        <SummaryStatusTitle status="updated" />
                      ) : (
                        "Booking summary"
                      )
                    }
                    body={
                      isPublicSuccessStep
                        ? "The confirmed booking details remain visible here."
                        : "Review the live booking details here before confirming."
                    }
                  />
                  <div
                    className={cn(
                      "mt-6 flex-1",
                      isPublicSuccessStep && successColumnHeight !== null && "min-h-0 overflow-y-auto",
                      publicInsetCardClass,
                    )}
                  >
                    <dl className="grid gap-4">
                      <SummaryField
                        label="When"
                        value={
                          isPublicSuccessStep && successfulBooking
                            ? `${formatDateLabel(successfulBooking.dateKey)} · ${formatTimeRange(
                                successfulBooking.startTime,
                                successfulBooking.endTime,
                              )}`
                            : bookingFlow.dateKey
                              ? `${formatDateLabel(bookingFlow.dateKey)} · ${
                                  selectedService.bookingType === "appointment"
                                    ? formatTimeLabel(bookingFlow.time)
                                    : "Full Day"
                                }`
                          : "Not selected"
                        }
                      />
                      <SummaryField
                        label="Client"
                        value={
                          isPublicSuccessStep && successfulBooking
                            ? successfulBooking.clientName
                            : bookingFlow.clientName.trim() || "Not entered yet"
                        }
                      />
                      <SummaryField
                        label="Email"
                        value={
                          isPublicSuccessStep && successfulBooking
                            ? successfulBooking.clientEmail
                            : bookingFlow.clientEmail.trim() || "Not entered yet"
                        }
                      />
                      <SummaryField
                        label="Phone"
                        value={
                          isPublicSuccessStep && successfulBooking
                            ? successfulBooking.clientPhone
                            : bookingFlow.clientPhone.trim() || "Not entered yet"
                        }
                      />
                      <SummaryField
                        label="Notes"
                        value={
                          isPublicSuccessStep && successfulBooking
                            ? successfulBooking.notes || "None"
                            : bookingFlow.notes.trim() || "None"
                        }
                      />
                      {isPublicSuccessStep && successfulBooking ? (
                        <SummaryField label="Status" value={successfulBooking.status} />
                      ) : null}
                    </dl>
                    {isPublicDetailsStep ? (
                      <div className="mt-4 border-t border-[var(--line)] pt-4">
                        {!isNLChangeDateOpen ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsNLChangeDateOpen(true);
                              setNaturalLanguageBookingInput("");
                              setNaturalLanguageBookingError(null);
                            }}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
                          >
                            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Change date/time
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]">
                              New date/time
                              <input
                                type="text"
                                value={naturalLanguageBookingInput}
                                autoFocus
                                onChange={(event) => {
                                  setNaturalLanguageBookingInput(event.target.value);
                                  setNaturalLanguageBookingError(null);
                                }}
                                onFocus={() => setIsNaturalLanguageBookingFocused(true)}
                                onBlur={() => setIsNaturalLanguageBookingFocused(false)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    continueWithNaturalLanguageBooking();
                                  }
                                }}
                                placeholder={
                                  selectedService.bookingType === "appointment"
                                    ? "e.g. \"next Monday at 2 PM\""
                                    : "e.g. \"next Friday\""
                                }
                                className={publicFieldClass}
                              />
                            </label>
                            <div className="flex gap-2">
                              <ActionButton
                                tone="primary"
                                className={cn("flex-1", publicPrimaryActionClass)}
                                onClick={continueWithNaturalLanguageBooking}
                              >
                                Update
                              </ActionButton>
                              <ActionButton
                                tone="ghost"
                                className={isDedicatedPublicPage ? cn(publicPillButtonClass, publicGhostButtonClass) : undefined}
                                onClick={() => {
                                  setIsNLChangeDateOpen(false);
                                  setNaturalLanguageBookingInput("");
                                  setNaturalLanguageBookingError(null);
                                }}
                              >
                                Cancel
                              </ActionButton>
                            </div>
                            {naturalLanguageBookingError ? (
                              <div className="rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]">
                                {naturalLanguageBookingError}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            {isPublicSuccessStep && successfulBooking ? (
              <div
                className={cn(
                  "lg:col-span-3 !p-4 sm:!p-5",
                  publicElevatedPanelClass,
                )}
              >
                <div className="flex w-full flex-wrap items-center justify-center gap-3">
                  <ActionButton
                    tone="primary"
                    className={cn("min-w-[150px] px-6", publicPrimaryActionClass)}
                    disabled={isSuccessfulBookingCancelled}
                    onClick={() => downloadBookingCalendarFile(successfulBooking)}
                  >
                    Add to calendar
                  </ActionButton>
                  <ActionButton
                    tone="ghost"
                    className={cn(
                      "min-w-[150px]",
                      isDedicatedPublicPage &&
                        cn(publicPillButtonClass, publicGhostButtonClass),
                    )}
                    disabled={isSuccessfulBookingCancelled}
                    onClick={() => openReschedule(successfulBooking.id)}
                  >
                    Reschedule
                  </ActionButton>
                  <ActionButton
                    tone="danger"
                    className={cn(
                      "min-w-[150px]",
                      isDedicatedPublicPage && publicPillButtonClass,
                    )}
                    disabled={isSuccessfulBookingCancelled}
                    onClick={() => setCancellationId(successfulBooking.id)}
                  >
                    Cancel booking
                  </ActionButton>
                  {manageBookingToken ? (
                    <Link
                      href={`/public/${businessSlug}`}
                      className={cn(
                        "inline-flex min-w-[150px] items-center justify-center rounded-2xl border border-[var(--line)] px-5 py-2 text-sm font-semibold transition",
                        isSuccessfulBookingCancelled
                          ? "border-transparent bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-white shadow-[0_14px_32px_rgba(26,115,232,0.24)] hover:saturate-125"
                          : "bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-white",
                        isDedicatedPublicPage && publicPillButtonClass,
                      )}
                    >
                      Book another
                    </Link>
                  ) : (
                    <ActionButton
                      tone={isSuccessfulBookingCancelled ? "primary" : "secondary"}
                      className={cn(
                        "min-w-[150px]",
                        isDedicatedPublicPage && publicPillButtonClass,
                      )}
                      onClick={() => startFreshBooking()}
                    >
                      Book another
                    </ActionButton>
                  )}
                </div>
                {successfulBooking.manageToken ? (
                  <div className="mt-5 flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                      Manage this booking anytime
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={buildManageUrl(provider.publicSlug, successfulBooking.manageToken)}
                        aria-label="Booking management URL"
                        onFocus={(event) => event.currentTarget.select()}
                        className="flex-1 min-w-[260px] rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] [font-family:var(--font-plex-mono)]"
                      />
                      <ActionButton
                        tone="ghost"
                        className={cn(
                          isDedicatedPublicPage &&
                            cn(publicPillButtonClass, publicGhostButtonClass),
                        )}
                        onClick={copyManageLink}
                      >
                        {copiedManageLink ? "Copied" : "Copy link"}
                      </ActionButton>
                      <span className="sr-only" aria-live="polite">
                        {copiedManageLink ? "Manage link copied to clipboard" : ""}
                      </span>
                    </div>
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      Save this link or use the calendar attachment — anyone with the link can
                      manage this booking.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {(isPublicSelectionStep || isPublicDetailsStep) && selectedService ? (
          <div className="sticky bottom-0 z-30 mt-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
            <div
              className={cn(
                "flex gap-3 rounded-[24px] px-4 py-3",
                publicElevatedPanelClass,
                "!p-3",
              )}
            >
              {isPublicSelectionStep ? (
                <ActionButton
                  tone="primary"
                  className={cn("min-h-12 flex-1", publicPrimaryActionClass)}
                  disabled={!step2CanContinue}
                  onClick={advanceToDetailsStep}
                >
                  {step2ButtonLabel}
                </ActionButton>
              ) : (
                <>
                  <ActionButton
                    tone="ghost"
                    className={cn(
                      "min-h-12",
                      isDedicatedPublicPage &&
                        cn(publicPillButtonClass, publicGhostButtonClass),
                    )}
                    onClick={goBackToSelectionStep}
                  >
                    Back
                  </ActionButton>
                  <ActionButton
                    tone="primary"
                    className={cn("min-h-12 flex-1", publicPrimaryActionClass)}
                    onClick={confirmBooking}
                  >
                    {isBookingHoldExpired ? "Try booking" : "Confirm"}
                  </ActionButton>
                </>
              )}
            </div>
          </div>
        ) : null}

      </div>
    );
  }

  function renderCancellationModal() {
    if (!cancellationId) {
      return null;
    }

    const booking = bookings.find((candidate) => candidate.id === cancellationId);

    if (!booking) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
        <div
          className={cn(
            "w-full max-w-lg p-6",
            isDedicatedPublicPage
              ? "rounded-[32px] bg-[rgba(248,249,250,0.98)] ring-1 ring-[rgba(255,255,255,0.72)] shadow-[0_30px_72px_rgba(25,28,29,0.14)]"
              : "rounded-[32px] border border-[var(--line)] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.2)]",
          )}
        >
          <SectionTitle
            eyebrow="Cancel Booking"
            title={booking.serviceName}
            body={`${booking.clientName} · ${formatDateLabel(booking.dateKey)} · ${formatTimeRange(
              booking.startTime,
              booking.endTime,
            )}`}
          />
          <p className="mt-6 text-sm leading-6 text-[var(--muted)]">
            Cancelling frees the slot immediately.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <ActionButton
              tone="ghost"
              className={cn(isDedicatedPublicPage && cn(publicPillButtonClass, publicGhostButtonClass))}
              onClick={() => setCancellationId(null)}
            >
              Keep booking
            </ActionButton>
            <ActionButton
              tone="danger"
              className={cn(isDedicatedPublicPage && publicPillButtonClass)}
              onClick={confirmCancellation}
            >
              Confirm cancellation
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  function renderRescheduleModal() {
    if (!rescheduleState) {
      return null;
    }

    const booking = bookings.find((candidate) => candidate.id === rescheduleState.bookingId);
    const service = services.find((candidate) => candidate.id === booking?.serviceId);

    if (!booking || !service) {
      return null;
    }

    const rescheduleWindow = createRollingWeekWindow(new Date(), 7, 4);
    const rescheduleWindowLabel = `${formatCompactDate(rescheduleWindow.startKey)} - ${formatCompactDate(
      rescheduleWindow.endKey,
    )}`;
    const weeks = rescheduleWindow.weeks;
    const slots =
      service.bookingType === "appointment"
        ? getAvailableSlots(
            rescheduleState.dateKey,
            service,
            availability,
            bookings,
            booking.id,
            activeBookingHolds,
          )
        : [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-8">
        <div
          className={cn(
            "max-h-[92vh] w-full max-w-5xl overflow-auto",
            isDedicatedPublicPage
              ? "rounded-[34px] bg-[rgba(248,249,250,0.98)] p-6 ring-1 ring-[rgba(255,255,255,0.72)] shadow-[0_30px_72px_rgba(25,28,29,0.14)] xl:p-8"
              : "rounded-[32px] border border-[var(--line)] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]",
          )}
        >
          <SectionTitle
            eyebrow="Reschedule Booking"
            title={booking.serviceName}
            body={`${booking.clientName} · ${
              service.bookingType === "appointment" ? "Choose a new slot" : "Choose a new day"
            }`}
            action={
              <ActionButton
                tone="ghost"
                className={cn(isDedicatedPublicPage && cn(publicPillButtonClass, publicGhostButtonClass))}
                onClick={() => setRescheduleState(null)}
              >
                Close
              </ActionButton>
            }
          />
          <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.88fr]">
            <div className="space-y-5">
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-3",
                  isDedicatedPublicPage ? publicGlassBarClass : "border border-[var(--line)] bg-[var(--surface-soft)]",
                )}
              >
                <div className="flex items-center gap-2">
                  <ActionButton
                    tone="ghost"
                    className={calendarNavPillClass}
                    disabled
                    onClick={() => undefined}
                  >
                    Previous
                  </ActionButton>
                  <ActionButton
                    tone="ghost"
                    className={calendarNavPillClass}
                    onClick={() =>
                      setRescheduleState((current) =>
                        current
                          ? {
                              ...current,
                              dateKey: todayKey(),
                              time: "",
                              monthAnchor: new Date(),
                              error: undefined,
                            }
                          : current,
                      )
                    }
                  >
                    Today
                  </ActionButton>
                  <ActionButton
                    tone="ghost"
                    className={calendarNavPillClass}
                    disabled
                    onClick={() => undefined}
                  >
                    Next
                  </ActionButton>
                </div>
                <p className="text-base font-semibold text-[var(--ink)]">
                  {rescheduleWindowLabel}
                </p>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {WEEKDAY_KEYS.map((day) => (
                  <p key={day}>
                    {weekdayShortFormatter.format(
                      parseDateKey(`2024-03-${pad(WEEKDAY_KEYS.indexOf(day) + 3)}`),
                    )}
                  </p>
                ))}
              </div>
              <div className="grid gap-2">
                {weeks.map((week) => (
                  <div key={week[0].toISOString()} className="grid grid-cols-7 gap-2">
                    {week.map((date) => {
                      const dateKey = getDateKey(date);
                      const inMonth = date.getMonth() === new Date().getMonth();
                      const available = isDateAvailable(
                        dateKey,
                        service,
                        availability,
                        bookings,
                        booking.id,
                        activeBookingHolds,
                      );
                      const selected = rescheduleState.dateKey === dateKey;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          disabled={!available}
                          onClick={() =>
                            setRescheduleState((current) =>
                              current
                                ? {
                                    ...current,
                                    dateKey,
                                    time: "",
                                    monthAnchor: date,
                                    error: undefined,
                                  }
                                : current,
                            )
                          }
                          className={cn(
                            "min-h-[84px] rounded-[24px] p-3 text-left transition",
                            inMonth
                              ? isDedicatedPublicPage
                                ? publicQuietChoiceClass
                                : "border border-[var(--line)] bg-[var(--surface-soft)]"
                              : isDedicatedPublicPage
                                ? publicSoftChoiceClass
                                : "border border-[var(--line)] bg-white",
                            available &&
                              (isDedicatedPublicPage
                                ? "hover:bg-[rgba(255,255,255,0.72)] hover:ring-2 hover:ring-[rgba(26,115,232,0.12)]"
                                : "hover:border-[var(--accent)]"),
                            selected &&
                              (isDedicatedPublicPage
                                ? cn(publicSelectedChoiceClass, "ring-2 ring-[rgba(26,115,232,0.16)]")
                                : "border-[var(--accent)] bg-[var(--accent-soft)]"),
                            !available && "cursor-default opacity-45",
                          )}
                        >
                          <span className="text-sm font-semibold text-[var(--ink)]">
                            {date.getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div
              className={cn(
                "flex h-full flex-col",
                isDedicatedPublicPage
                  ? publicElevatedPanelClass
                  : "rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-6",
              )}
            >
              <SectionTitle
                eyebrow={formatCompactDate(rescheduleState.dateKey)}
                title={
                  service.bookingType === "appointment"
                    ? "Select a replacement slot"
                    : "Confirm full-day reschedule"
                }
                body={service.description}
              />
              {rescheduleState.error ? (
                <div
                  role="alert"
                  className="mt-4 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]"
                >
                  {rescheduleState.error}
                </div>
              ) : null}
              {service.bookingType === "appointment" ? (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          setRescheduleState((current) =>
                            current ? { ...current, time: slot, error: undefined } : current,
                          )
                        }
                        className={cn(
                          "min-h-11 rounded-2xl px-4 text-sm font-semibold transition",
                          isDedicatedPublicPage ? publicQuietChoiceClass : "border border-[var(--line)] bg-white",
                          rescheduleState.time === slot &&
                            (isDedicatedPublicPage
                              ? cn(publicSelectedChoiceClass, "text-[var(--accent)]")
                              : "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"),
                          rescheduleState.time !== slot &&
                            (isDedicatedPublicPage
                              ? "hover:bg-[rgba(255,255,255,0.72)]"
                              : "hover:border-[var(--accent)]"),
                        )}
                      >
                        {formatTimeLabel(slot)}
                      </button>
                    ))}
                  </div>
                  {slots.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      No available slots on this date. Choose another date from the calendar.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div
                  className={cn(
                    "mt-6 p-4 text-sm leading-6 text-[var(--muted)]",
                    isDedicatedPublicPage
                      ? publicInsetCardClass
                      : "rounded-3xl border border-white bg-white/90",
                  )}
                >
                  This new day is free and will replace the original full-day reservation as soon as you confirm.
                </div>
              )}
              <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
                <ActionButton
                  tone="danger"
                  className={cn("w-full px-4 sm:px-6", isDedicatedPublicPage && publicPillButtonClass)}
                  onClick={() => setRescheduleState(null)}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  tone="primary"
                  className={cn("w-full px-4 sm:px-6", isDedicatedPublicPage && publicPillButtonClass)}
                  disabled={
                    !rescheduleState.dateKey ||
                    (service.bookingType === "appointment" && !rescheduleState.time)
                  }
                  onClick={confirmReschedule}
                >
                  Save new time
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <section className={cn(publicShellClass, "p-6")}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded-full bg-[var(--surface-soft)]" />
          <div className="h-28 rounded-[28px] bg-[var(--surface-soft)]" />
          <div className="h-96 rounded-[28px] bg-[var(--surface-soft)]" />
        </div>
      </section>
    );
  }

  if (manageBookingToken && manageLookupState === "pending") {
    return (
      <section className={cn(publicShellClass, "p-6 sm:p-8")} aria-busy="true">
        <SectionTitle eyebrow="Manage booking" title="Loading your booking…" />
      </section>
    );
  }

  if (manageBookingToken && manageLookupState === "not-found") {
    const contactEmail = provider.email?.trim();
    return (
      <section className={cn(publicShellClass, "p-6 sm:p-8")} role="alert">
        <SectionTitle
          eyebrow="Manage booking"
          title="We can't find this booking on this device"
          body="Bookings are stored locally in the browser they were created in. If you booked from a different browser or device, please open this link there. If you've cleared your browser data, the booking is no longer accessible from this device."
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/public/${businessSlug}`}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--ink)] px-5 text-sm font-semibold text-white transition hover:opacity-90",
              isDedicatedPublicPage && publicPillButtonClass,
            )}
          >
            Book a new appointment
          </Link>
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-soft)]",
                isDedicatedPublicPage && cn(publicPillButtonClass, publicGhostButtonClass),
              )}
            >
              Contact provider
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  // Any public URL that does not resolve to a live, non-empty booking page
  // shows a friendly not-found screen pointing back to setup.
  if (
    surfaceMode === "public-only" &&
    (!activeStore.setupComplete || !publicRouteReady || services.length === 0)
  ) {
    return (
      <section className={cn(publicShellClass, "p-6 sm:p-8")}>
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            404 · Page not found
          </p>
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
            This booking page doesn&apos;t exist
          </h3>
          <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
            The link may be wrong, or this provider hasn&apos;t finished setting up their
            booking page yet. Head back home to start the setup wizard.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </section>
    );
  }

  // `setupPublished` keeps the Done step visible after publishing flips
  // `setupComplete` true (which would otherwise close the wizard).
  if (isSetupOpen || (setupPublished && !integratedMode)) {
    return (
      <section className={cn(publicShellClass, "p-5 sm:p-8")}>
        {vertical ? renderSetupWizard() : renderWelcome()}
      </section>
    );
  }

  return (
    <>
      <section className={publicShellClass}>
        {!isDedicatedPublicPage ? (
          <div className="border-b border-[var(--line)] p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
                  {provider.businessName || provider.fullName || "Booking workspace"}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="break-all text-sm text-[var(--muted)]">{publicUrl}</span>
                  <button
                    type="button"
                    onClick={copyPublicLink}
                    className="text-sm font-semibold text-[var(--accent)] transition hover:opacity-80"
                  >
                    {copiedLink ? "Copied" : "Copy link"}
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[var(--accent)] transition hover:opacity-80"
                  >
                    View public page
                  </a>
                </div>
              </div>

              {userEmail || onSignOut ? (
                <div className="flex shrink-0 items-center gap-3">
                  {userEmail ? (
                    <span className="hidden text-sm text-[var(--muted)] sm:inline">{userEmail}</span>
                  ) : null}
                  {onSignOut ? (
                    <form action={onSignOut}>
                      <button
                        type="submit"
                        className="min-h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-soft)]"
                      >
                        Sign out
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>

            {surface === "management" && surfaceMode === "adaptive" ? (
              <nav className="mt-6 flex flex-wrap gap-2">
                {(
                  [
                    ["dashboard", "Dashboard"],
                    ["bookings", "Bookings"],
                    ["calendar", "Calendar"],
                    ["services", "Services"],
                    ["settings", "Settings"],
                  ] as Array<[AdminTab, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAdminTab(value)}
                    className={cn(
                      "min-h-11 rounded-2xl px-4 text-sm font-semibold transition",
                      adminTab === value
                        ? "bg-[var(--ink)] text-white"
                        : "bg-[rgba(248,249,250,0.72)] text-[var(--muted)] ring-1 ring-[rgba(193,198,214,0.18)] hover:bg-[rgba(255,255,255,0.92)] hover:text-[var(--ink)]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            ) : surfaceMode === "adaptive" ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setSurface("management")}
                  className="min-h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-soft)]"
                >
                  ← Back to workspace
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {surface === "management" && surfaceMode === "adaptive" ? (
          <div className="p-5 sm:p-8">
            {adminTab === "dashboard" ? renderDashboard() : null}
            {adminTab === "bookings" ? renderBookingsList() : null}
            {adminTab === "calendar" ? renderAdminCalendar() : null}
            {adminTab === "services" ? renderServices() : null}
            {adminTab === "settings" ? renderSettings() : null}
          </div>
        ) : (
          renderPublicFlow()
        )}
      </section>

      {shouldShowHoldWarningToast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 top-4 z-40 max-w-sm rounded-[28px] bg-white px-5 py-4 text-[#be123c] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_24px_60px_rgba(190,18,60,0.16)] ring-1 ring-[#fecdd3] sm:right-6 sm:top-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            Hold ending soon
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
            Your booking hold is ending soon.
          </p>
          <p className="mt-1 text-sm leading-5">
            Confirm now, or the selected time may become available to someone else.
          </p>
        </div>
      ) : null}

      {renderCancellationModal()}
      {renderRescheduleModal()}
    </>
  );
}
