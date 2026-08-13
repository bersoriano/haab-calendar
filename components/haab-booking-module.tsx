"use client";

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
  Lang,
  LocationKey,
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
  WeeklyAvailability,
} from "@/lib/types";
import {
  WEEKDAY_KEYS,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  DURATION_OPTIONS,
  compactBadgeTextClass,
  compactMetaTextClass,
  getWeekdayShortFormatter,
  BOOKING_HOLD_DURATION_MS,
  BOOKING_HOLD_EXTENSION_MS,
  DEFAULT_STORAGE_KEY,
} from "@/lib/constants";
import { cn, createId, currentTimestamp, pad, slugify } from "@/lib/utils";
import { buildProviderPath, getPublicVerticalSegment, getServiceSlug } from "@/lib/public-url";
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
  getTimeWindowDurationMinutes,
  isValidTimeWindow,
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
  getOccurrenceModeLabel,
  getBookingStatusLabel,
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
  setServiceBookingLength,
  parseMaxSpots,
  normalizeStore,
  seedSetupLanguage,
} from "@/lib/store";
import {
  getBookingsForDate,
  getAvailableSlots as getAvailableSlotsAtTime,
  getDayAvailability as getDayAvailabilityAtTime,
  isDateAvailable as isDateAvailableAtTime,
  isSingleOccurrence,
  isWeeklyOccurrence,
  getSpotsLeft,
} from "@/lib/availability";
import type { AvailabilityClock, DayAvailabilityLevel } from "@/lib/availability";
import { getServiceLocations, getEffectiveCost } from "@/lib/locations";
import {
  canExtendBookingHold,
  expireBookingHoldAtServerTime,
  getBookingHoldRemainingMs,
  getBookingHoldSelectionKey,
  isBookingHoldWarning,
} from "@/lib/holds";
import { buildIcsContent } from "@/lib/ics";
import { detectTimeZone } from "@/lib/timezone";
import {
  bookingFlowReducer,
  createBookingFlowState,
  type BookingFlowEvent,
  type BookingFlowNotice,
} from "@/lib/booking-flow-machine";
import {
  adminBarClass,
  adminChoiceQuietClass,
  adminFieldClass,
  adminInsetClass,
  adminPanelClass,
} from "@/components/provider/adminGlass";
import { ProviderInfoForm } from "@/components/provider/ProviderInfoForm";
import { LogoImageUploader } from "@/components/provider/HeaderImageUploader";
import { ServiceEditor } from "@/components/provider/ServiceEditor";
import { AvailabilityEditor } from "@/components/provider/AvailabilityEditor";
import { AvailabilitySettingsSection } from "@/components/provider/AvailabilitySettingsSection";
import { LanguageSettingsSection } from "@/components/provider/LanguageSettingsSection";
import { VerticalPicker } from "@/components/provider/VerticalPicker";
import { getVerticalPreset, getVerticals } from "@/config/verticals";
import { getVerticalCopy } from "@/lib/vertical-copy";
import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { resolveSurfaceLanguage } from "@/lib/language/surface";
import { localizePublicExampleContent } from "@/lib/public-content-i18n";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  ActionButton,
  ActionLink,
  BookingHoldCountdownBar,
  EmptyState,
  PrivateLinkCard,
  PublicProgressIndicator,
  SectionTitle,
  SummaryField,
  ToneBadge,
} from "@/components/ui";
import {
  ManageBookingPanel,
  type ManageNoteStatus,
} from "@/components/booking/ManageBookingPanel";
import { BookingPass, type PassField } from "@/components/booking/BookingPass";
import { PublicBookingHeader } from "@/components/booking/PublicBookingHeader";
import {
  isGuestDraftMeaningful,
  prepareGuestPreviewStore,
} from "@/lib/guest-builder";

type HaabBookingModuleProps = {
  injectedConfig?: Partial<InjectedConfig>;
  storageKey?: string;
  initialSurface?: Surface;
  surfaceMode?: SurfaceMode;
  requestedPublicSlug?: string;
  requestedServiceSlug?: string;
  onBookingsChange?: (bookings: BookingRecord[]) => void;
  onStoreChange?: (store: ModuleStore) => void;
  manageBookingToken?: string;
  userEmail?: string;
  onSignOut?: () => void | Promise<void>;
  persistSetup?: boolean;
  persistAdminChanges?: boolean;
  onSetupPersisted?: (store: ModuleStore) => void;
  // Seeds an incomplete setup store from the visitor's landing/login choice.
  // Completed providers continue to use their persisted provider language.
  initialLanguage?: Lang;
  // Seeds the visitor-owned language on a server-rendered public route, avoiding
  // an English/Spanish flash before browser preferences can be restored.
  initialPublicLanguage?: Lang;
  /** Language resolved for the signed-in viewer; the dashboard default. */
  viewerLanguage?: Lang;
  providerTimeZone?: string;
  /**
   * Reports the owner pinning a new *workspace* language, so the dashboard
   * chrome rendered above this module follows it without a reload. There is
   * deliberately no matching callback for `provider.language`: that setting
   * changes what the owner's clients read, and letting it report upward is
   * what put a Spanish headline over an English workspace.
   */
  onDashboardLanguageChange?: (language: Lang) => void;
  onVerticalChange?: (vertical?: VerticalId) => void;
  // When set (standalone mode, fresh setup), pre-applies this vertical's preset
  // and starts the setup wizard on it. Used by the landing verticals picker.
  initialVerticalId?: VerticalId;
  // Page name captured on the landing page before setup opened. Applied with the
  // vertical preset so step 1 starts already filled in.
  initialBusinessName?: string;
  /** Browser-owned draft: all editing works, but publishing requires auth. */
  isGuestDraft?: boolean;
  /** After auth, migrate the browser-owned draft through the provider API. */
  resumeGuestPublish?: boolean;
  /** Opens signup-first auth without discarding the current local draft. */
  onRequestPublish?: (store: ModuleStore) => void;
};

function formatSlotSizeOption(minutes: number, lang: Lang = "en") {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return lang === "es" ? `${hours} h` : `${hours} hr`;
  }
  return `${minutes} min`;
}

// Start/end times for a booking record. Single-occurrence events use the
// event's own fixed window; everything else derives end from the duration.
function resolveBookingStartTime(service: Service, time: string): string | undefined {
  if (isSingleOccurrence(service) || isWeeklyOccurrence(service)) {
    return service.startTime || time || undefined;
  }
  return service.bookingType === "appointment" ? time : undefined;
}

function resolveBookingEndTime(service: Service, time: string): string | undefined {
  if (isSingleOccurrence(service) || isWeeklyOccurrence(service)) {
    if (service.endTime) return service.endTime;
    return service.durationMinutes ? addMinutes(time, service.durationMinutes) : undefined;
  }
  return service.bookingType === "appointment" && service.durationMinutes
    ? addMinutes(time, service.durationMinutes)
    : undefined;
}

function getSetupBookingLengthValue(services: Service[]) {
  if (services.length > 0 && services.every((service) => service.bookingType === "full-day")) {
    return "full-day";
  }

  return String(
    services.find((service) => service.bookingType === "appointment")?.durationMinutes ??
      DEFAULT_APPOINTMENT_DURATION_MINUTES,
  );
}

// Calendar day tints. A tinted level supplies the cell's whole background
// instead of layering over the default one: `cn` is a plain join, not
// tailwind-merge, so two bg-* utilities on one element would resolve by
// stylesheet order rather than class order. "full" and "closed" keep the
// default surface and dim the number instead, so the unbookable states stay
// quiet next to the coded ones.
//
// The literal var() fallbacks keep the colours right even where the tokens in
// globals.css have not been picked up yet.
const DAY_AVAILABILITY_BG: Record<DayAvailabilityLevel, string> = {
  open: "bg-[var(--avail-open,rgba(13,148,136,0.16))]",
  tight: "bg-[var(--avail-tight,rgba(217,119,6,0.16))]",
  full: "",
  closed: "",
};

const DAY_AVAILABILITY_EDGE: Record<DayAvailabilityLevel, string> = {
  open: "ring-1 ring-[var(--avail-open-line,rgba(13,148,136,0.32))]",
  tight: "ring-1 ring-[var(--avail-tight-line,rgba(217,119,6,0.34))]",
  full: "",
  closed: "",
};

// Diagonal strike over a fully-booked day's number. An SVG rather than a
// rotated pseudo-element: the cell clips its overflow at mobile sizes, and
// currentColor keeps the line matched to the dimmed number.
function DayNumberStrike() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -inset-x-1 -inset-y-0.5 h-[calc(100%+0.25rem)] w-[calc(100%+0.5rem)]"
    >
      <line
        x1="0.5"
        y1="9.5"
        x2="9.5"
        y2="0.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function HaabBookingModule({
  injectedConfig,
  storageKey = DEFAULT_STORAGE_KEY,
  initialSurface = "management",
  surfaceMode = "adaptive",
  requestedPublicSlug,
  requestedServiceSlug,
  onBookingsChange,
  onStoreChange,
  manageBookingToken,
  userEmail,
  onSignOut,
  persistSetup = false,
  persistAdminChanges = false,
  onSetupPersisted,
  initialLanguage,
  initialPublicLanguage,
  viewerLanguage = "en",
  providerTimeZone,
  initialVerticalId,
  initialBusinessName,
  onDashboardLanguageChange,
  onVerticalChange,
  isGuestDraft = false,
  resumeGuestPublish = false,
  onRequestPublish,
}: HaabBookingModuleProps) {
  const {
    integratedMode,
    hydrated,
    store: activeStore,
    actions,
  } = useModuleStore({
    injectedConfig,
    initialLanguage,
    storageKey,
    onStoreChange,
    onBookingsChange,
  });

  const [isDesktopColumns, setIsDesktopColumns] = useState(false);
  const [surface, setSurface] = useState<Surface>(
    surfaceMode === "public-only" ? "public" : initialSurface,
  );
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [setupStep, setSetupStep] = useState<SetupStep>(1);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupPublished, setSetupPublished] = useState(false);
  const [isPersistingSetup, setIsPersistingSetup] = useState(false);
  const resumeGuestPublishAttemptedRef = useRef(false);
  const [adminSaveError, setAdminSaveError] = useState<string | null>(null);
  const [adminSaveMessage, setAdminSaveMessage] = useState<string | null>(null);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(() =>
    createBlankServiceDraft(),
  );
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const initialServices = normalizeServices(injectedConfig?.services);
  const requestedInitialServiceId = requestedServiceSlug
    ? initialServices.find((service) => getServiceSlug(service) === requestedServiceSlug)?.id
    : undefined;
  const [bookingFlow, setBookingFlow] = useState<BookingFlow>(() =>
    createInitialBookingFlow(initialServices, requestedInitialServiceId),
  );
  const [bookingError, setBookingError] = useState<string | null>(null);
  // Why the visitor was last sent back to time selection (expired hold, or a
  // slot someone else confirmed first). Rendered as a banner on step 2.
  const [flowNotice, setFlowNotice] = useState<BookingFlowNotice>(null);
  const [isConfirmingBooking, setIsConfirmingBooking] = useState(false);
  const [isCreatingHold, setIsCreatingHold] = useState(false);
  // The slot currently being held server-side, so its card can show progress.
  const [pendingHoldTime, setPendingHoldTime] = useState<string | null>(null);
  const [isMutatingBooking, setIsMutatingBooking] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const [bookingHold, setBookingHold] = useState<BookingHold | null>(null);
  const [bookingHoldNow, setBookingHoldNow] = useState(() => currentTimestamp());
  const [availabilityNow, setAvailabilityNow] = useState(() => currentTimestamp());
  const [bookingHoldClockOffsetMs, setBookingHoldClockOffsetMs] = useState(0);
  const [isNetworkOnline, setIsNetworkOnline] = useState(true);
  const [isExtendingHold, setIsExtendingHold] = useState(false);
  const [holdExtensionMessage, setHoldExtensionMessage] = useState<string | null>(null);
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
  const [isCalendarQrModalOpen, setIsCalendarQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedManageLink, setCopiedManageLink] = useState(false);
  const [manageLookupState, setManageLookupState] = useState<ManageLookupState>(
    manageBookingToken ? "pending" : "idle",
  );
  // Rescheduling from the private link re-enters the real availability flow for
  // the same service, instead of opening a second, smaller calendar.
  const [isManageRescheduling, setIsManageRescheduling] = useState(false);
  const [clientNoteDraft, setClientNoteDraft] = useState("");
  const [isSavingClientNote, setIsSavingClientNote] = useState(false);
  const [clientNoteStatus, setClientNoteStatus] = useState<ManageNoteStatus>("idle");
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

  const storedProvider = activeStore.provider;
  const storedServices = activeStore.services;
  const configuredLanguage = storedProvider.language ?? "en";
  const [publicLanguage, setPublicLanguage] = useState<Lang>(
    initialPublicLanguage ?? configuredLanguage,
  );
  // The owner's workspace language is their own; it falls back to whatever the
  // rest of the app resolved for them, never to their clients' setting. See
  // resolveSurfaceLanguage for the guarded logic and its tests.
  const lang = resolveSurfaceLanguage({
    surface,
    publicLanguage,
    providerDashboardLanguage: storedProvider.dashboardLanguage,
    viewerLanguage,
  });
  const localizedPublicContent = localizePublicExampleContent(
    storedProvider,
    storedServices,
    lang,
  );
  const provider = surface === "public" ? localizedPublicContent.provider : storedProvider;
  const services =
    surface === "public" ? localizedPublicContent.services : storedServices;
  const bookings = activeStore.bookings;
  const bookingHolds = activeStore.bookingHolds;
  const activeBookingHolds = pruneBookingHolds(bookingHolds, bookingHoldNow);
  const availability = activeStore.availability;
  const vertical = activeStore.vertical;
  const copy = getVerticalCopy(vertical, lang);
  const t = bookingTranslations[lang];
  const healthcareRole = vertical === "healthcare" ? t.healthcareRole : null;
  const eventOrganizerRole = vertical === "events" ? t.eventOrganizerRole : null;
  const profileRole = healthcareRole ?? eventOrganizerRole;
  const isDedicatedPublicPage = surfaceMode === "public-only";
  const businessSlug =
    provider.publicSlug || slugify(provider.businessName || provider.fullName || "haab-calendar");
  const publicUrl =
    businessSlug && vertical ? buildProviderPath(vertical, businessSlug) : "/public";

  const refreshProviderDashboardStore = useEffectEvent(async () => {
    try {
      const response = await fetch("/api/provider/store", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        store?: ModuleStore;
      };

      if (response.ok && payload.store) {
        actions.replaceIntegratedBookings(payload.store.bookings);
      }
    } catch {
      // Realtime reconnects automatically and the fallback refresh runs again.
    }
  });

  useEffect(() => {
    if (!integratedMode || !persistAdminChanges) {
      return;
    }

    let disposed = false;
    let refreshInFlight = false;
    let refreshQueued = false;

    const refresh = async () => {
      if (disposed) return;
      if (refreshInFlight) {
        refreshQueued = true;
        return;
      }

      refreshInFlight = true;
      await refreshProviderDashboardStore();
      refreshInFlight = false;

      if (refreshQueued && !disposed) {
        refreshQueued = false;
        void refresh();
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("provider-bookings-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => void refresh(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refresh();
        }
      });
    const fallbackRefreshId = window.setInterval(() => void refresh(), 15_000);

    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    void refresh();

    return () => {
      disposed = true;
      window.clearInterval(fallbackRefreshId);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [integratedMode, persistAdminChanges]);

  const availabilityClock: AvailabilityClock = {
    now: new Date(availabilityNow),
    timeZone: providerTimeZone,
  };

  function getAvailableSlots(
    dateKey: string,
    service: Service,
    weeklyAvailability: WeeklyAvailability,
    currentBookings: BookingRecord[],
    ignoredBookingId?: string,
    currentBookingHolds: BookingHoldRecord[] = [],
    ignoredHoldId?: string,
  ) {
    return getAvailableSlotsAtTime(
      dateKey,
      service,
      weeklyAvailability,
      currentBookings,
      ignoredBookingId,
      currentBookingHolds,
      ignoredHoldId,
      availabilityClock,
    );
  }

  function getDayAvailability(
    dateKey: string,
    service: Service,
    weeklyAvailability: WeeklyAvailability,
    currentBookings: BookingRecord[],
    ignoredBookingId?: string,
    currentBookingHolds: BookingHoldRecord[] = [],
    ignoredHoldId?: string,
  ) {
    return getDayAvailabilityAtTime(
      dateKey,
      service,
      weeklyAvailability,
      currentBookings,
      ignoredBookingId,
      currentBookingHolds,
      ignoredHoldId,
      availabilityClock,
    );
  }

  function isDateAvailable(
    dateKey: string,
    service: Service,
    weeklyAvailability: WeeklyAvailability,
    currentBookings: BookingRecord[],
    ignoredBookingId?: string,
    currentBookingHolds: BookingHoldRecord[] = [],
    ignoredHoldId?: string,
  ) {
    return isDateAvailableAtTime(
      dateKey,
      service,
      weeklyAvailability,
      currentBookings,
      ignoredBookingId,
      currentBookingHolds,
      ignoredHoldId,
      availabilityClock,
    );
  }

  useEffect(() => {
    if (!hydrated || surface !== "public") return;

    const queryLanguage = new URLSearchParams(window.location.search).get("lang");
    const preferredLanguage =
      queryLanguage === "en" || queryLanguage === "es" ? queryLanguage : configuredLanguage;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the visitor's explicit public-language preference after hydration
    setPublicLanguage(preferredLanguage);
  }, [configuredLanguage, hydrated, surface]);

  useEffect(() => {
    if (!hydrated || surface !== "public") return;
    document.documentElement.lang = lang;
  }, [hydrated, lang, surface]);

  function choosePublicLanguage(nextLanguage: Lang) {
    setPublicLanguage(nextLanguage);
    setBookingError(null);
    setCancellationError(null);
    setRescheduleState((current) =>
      current ? { ...current, error: undefined } : current,
    );
    setCalendarQrCode(null);
    if (typeof window === "undefined") return;

    // Scoped to this page's URL only. Writing the global language cookie here
    // would let a client's choice on one business's page follow them to the
    // marketing site and to other businesses. The proxy holds up the other end:
    // isPublicBookingRoute keeps applyLanguageCookie from reading this `?lang`
    // back into the shared cookie on the next request.
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLanguage);
    window.history.replaceState(window.history.state, "", url);
  }

  // Default a fresh (untouched) service draft to the vertical's occurrence mode:
  // events start single-occurrence, every other vertical stays periodic.
  useEffect(() => {
    const desired = vertical === "events" ? "single" : "periodic";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync draft default to vertical; guarded to a no-op once set
    setServiceDraft((current) =>
      !editingServiceId && !current.name.trim() && current.occurrenceMode !== desired
        ? { ...current, occurrenceMode: desired }
        : current,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key off vertical only; draft edits must not retrigger
  }, [vertical]);

  const onManageBookingFound = useEffectEvent((booking: BookingRecord) => {
    setBookingFlow((current) => ({
      ...current,
      step: 4,
      successBookingId: booking.id,
      serviceId: booking.serviceId,
    }));
    setClientNoteDraft(booking.clientNote ?? "");
    setClientNoteStatus("idle");
    setManageLookupState("found");
  });

  const onManageBookingMissing = useEffectEvent(() => {
    setManageLookupState("not-found");
  });

  const commitManagedBooking = useEffectEvent((booking: BookingRecord) => {
    actions.commitBookings([booking], activeStore);
  });

  const findLocalManagedBooking = useEffectEvent((token: string) =>
    findBookingByToken({ bookings }, token),
  );

  useEffect(() => {
    if (!manageBookingToken || !hydrated) {
      return;
    }

    if (integratedMode && isDedicatedPublicPage && vertical) {
      let cancelled = false;

      fetch(
        `/api/public/${getPublicVerticalSegment(vertical)}/${encodeURIComponent(businessSlug)}/manage/${encodeURIComponent(manageBookingToken)}`,
      )
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as {
            booking?: BookingRecord;
          };

          if (cancelled) return;

          if (!response.ok || !payload.booking) {
            onManageBookingMissing();
            return;
          }

          commitManagedBooking(payload.booking);
          onManageBookingFound(payload.booking);
        })
        .catch(() => {
          if (!cancelled) {
            onManageBookingMissing();
          }
        });

      return () => {
        cancelled = true;
      };
    }

    const booking = findLocalManagedBooking(manageBookingToken);
    if (booking) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: useEffectEvent escapes Effect reactivity per React 19 docs
      onManageBookingFound(booking);
    } else {
      onManageBookingMissing();
    }
  }, [manageBookingToken, hydrated, integratedMode, isDedicatedPublicPage, vertical, businessSlug]);

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
  // Single-occurrence events have one fixed date + time: auto-select it so the
  // public flow can skip the calendar entirely.
  useEffect(() => {
    if (!selectedService || !isSingleOccurrence(selectedService)) return;
    if (bookingFlow.step !== 2) return;
    const date = selectedService.occurrenceDate ?? "";
    if (!date) return;
    const time = selectedService.startTime ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-select the single event's fixed slot; guarded to a no-op once set
    setBookingFlow((current) =>
      current.dateKey === date && current.time === time
        ? current
        : { ...current, dateKey: date, time },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key off the event identity + step
  }, [selectedService?.id, selectedService?.occurrenceDate, selectedService?.startTime, bookingFlow.step]);
  // Default the public flow's location to the first available one (and capture a
  // single location's price override), keeping the selection valid per service.
  useEffect(() => {
    if (!selectedService) return;
    const locs = getServiceLocations(selectedService, provider);
    const valid = locs.some((loc) => loc.key === bookingFlow.locationKey);
    const desired = locs[0]?.key;
    if (valid || bookingFlow.locationKey === desired) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync default location to the selected service
    setBookingFlow((current) => ({ ...current, locationKey: desired }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key off service + its linked addresses
  }, [selectedService?.id, selectedService?.linkedAddress1, selectedService?.linkedAddress2, selectedService?.customAddress, provider.address1, provider.address2]);
  const successfulBooking = bookings.find((booking) => booking.id === bookingFlow.successBookingId);
  const successfulManageUrl =
    successfulBooking?.manageToken && vertical
      ? buildManageUrl(businessSlug, successfulBooking.manageToken, vertical, lang)
      : "";
  const localizedSuccessfulBooking = successfulBooking
    ? {
        ...successfulBooking,
        serviceName:
          services.find((service) => service.id === successfulBooking.serviceId)?.name ??
          successfulBooking.serviceName,
      }
    : undefined;
  const isSuccessfulBookingCancelled = successfulBooking?.status === "cancelled";
  // The private-link page: a found booking, shown as its own screen rather than
  // as the confirmation receipt the booker just came from.
  const isManageView = Boolean(manageBookingToken) && manageLookupState === "found";
  // While moving an existing booking, its own slot must read as free.
  const flowIgnoredBookingId =
    isManageView && isManageRescheduling ? successfulBooking?.id : undefined;
  const calendarQrRequestKey = successfulBooking && vertical
    ? JSON.stringify([
        successfulBooking.id,
        successfulBooking.updatedAt,
        successfulBooking.status,
        localizedSuccessfulBooking?.serviceName,
        successfulBooking.bookingType,
        successfulBooking.dateKey,
        successfulBooking.startTime,
        successfulBooking.endTime,
        successfulBooking.clientName,
        successfulBooking.clientPhone,
        successfulBooking.notes,
        successfulBooking.manageToken,
        provider.email,
        businessSlug,
        vertical,
        lang,
      ])
    : "";
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
      ? getBookingHoldRemainingMs(bookingHold, bookingHoldNow)
      : BOOKING_HOLD_DURATION_MS;
  const bookingHoldRemainingRatio = Math.max(
    0,
    Math.min(1, bookingHoldRemainingMs / BOOKING_HOLD_DURATION_MS),
  );
  const isBookingHoldExpired = hasActiveBookingHold && bookingHoldRemainingMs <= 0;
  const shouldOfferHoldExtension =
    resolvedBookingFlow.step === 3 &&
    hasActiveBookingHold &&
    canExtendBookingHold(bookingHold, bookingHoldRemainingMs);
  const isSetupOpen = !integratedMode && !activeStore.setupComplete;
  const publicRouteReady =
    !requestedPublicSlug || requestedPublicSlug === businessSlug;
  const requestedServiceReady =
    !requestedServiceSlug ||
    services.some((service) => getServiceSlug(service) === requestedServiceSlug);
  const hasMultipleServices = services.length > 1;
  const calendarServiceId =
    calendarServicePreference &&
    services.some((service) => service.id === calendarServicePreference)
      ? calendarServicePreference
      : (services[0]?.id ?? "");
  const publicShellClass = isDedicatedPublicPage
    ? "min-w-0 w-full"
    : "min-w-0 w-full rounded-[34px] border border-[var(--line)] shadow-[0_40px_100px_rgba(15,23,42,0.08)]";
  const publicPrimaryPanelClass = isDedicatedPublicPage
    ? "min-w-0 rounded-[34px] bg-[rgba(248,249,250,0.94)] p-6 ring-1 ring-[rgba(255,255,255,0.68)] shadow-[0_28px_64px_rgba(25,28,29,0.08)] xl:p-8"
    : "min-w-0 rounded-[28px] border border-[var(--line)] bg-white p-6 xl:p-8";
  const publicElevatedPanelClass = isDedicatedPublicPage
    ? "min-w-0 rounded-[32px] bg-[rgba(255,255,255,0.92)] p-6 ring-1 ring-[rgba(255,255,255,0.84)] shadow-[0_24px_58px_rgba(25,28,29,0.09)] xl:p-7"
    : "min-w-0 rounded-[28px] border border-[var(--line)] bg-white p-6 xl:p-7";
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

  /**
   * Two surfaces, two treatments. On the page background the control has to
   * supply its own material; inside the header band that material is already
   * there, so white-on-white would flatten it and the track recesses instead.
   */
  function renderPublicLanguageChooser(
    className = "",
    variant: "floating" | "inset" = "floating",
  ) {
    if (surface !== "public") return null;

    return (
      <LanguageSwitcher
        lang={lang}
        onChange={choosePublicLanguage}
        tone={variant}
        className={className}
      />
    );
  }

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

    if (!isDesktopColumns) {
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
  }, [isDesktopColumns, resolvedBookingFlow.step]);

  useEffect(() => {
    if (surface !== "public") {
      return;
    }

    const refreshAvailabilityClock = () => setAvailabilityNow(currentTimestamp());
    const intervalId = window.setInterval(refreshAvailabilityClock, 30_000);
    document.addEventListener("visibilitychange", refreshAvailabilityClock);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshAvailabilityClock);
    };
  }, [surface]);

  useEffect(() => {
    if (bookingHolds.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setBookingHoldNow(currentTimestamp() + bookingHoldClockOffsetMs);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [bookingHolds.length, bookingHoldClockOffsetMs]);

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
    // Jump instantly to the top. A smooth scroll here passes through scrolled
    // positions, which makes the sticky progress header collapse mid-scroll and
    // then expand on arrival — a visible flicker when entering the booking flow.
    window.scrollTo({ top: 0, behavior: "instant" });
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

  const getCalendarQrRequest = useEffectEvent(() => {
    if (!successfulBooking || successfulBooking.status === "cancelled" || !vertical) {
      return null;
    }

    return {
      bookingId: successfulBooking.id,
      content: buildIcsContent(
        localizedSuccessfulBooking ?? successfulBooking,
        provider,
        buildManageUrl(businessSlug, successfulBooking.manageToken, vertical, lang),
        lang,
      ),
    };
  });

  useEffect(() => {
    const request = getCalendarQrRequest();

    if (!request) {
      return;
    }

    let cancelled = false;
    const { bookingId } = request;

    QRCode.toDataURL(request.content, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      width: 400,
    })
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
          error: t.errors.qrGenerationFailed,
          url: "",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [calendarQrRequestKey, t.errors.qrGenerationFailed]);

  function releaseSupabaseBookingHold(holdId?: string, keepalive = false) {
    if (!holdId || !integratedMode || !isDedicatedPublicPage || !vertical) {
      return;
    }

    void fetch(
      `/api/public/${getPublicVerticalSegment(vertical)}/${encodeURIComponent(businessSlug)}/holds`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId }),
        keepalive,
      },
    ).catch(() => undefined);
  }

  const releaseExpiredBookingHold = useEffectEvent((holdId: string) => {
    actions.releaseBookingHold(holdId);
    releaseSupabaseBookingHold(holdId);
  });

  const releaseBookingHoldOnPageHide = useEffectEvent((holdId: string) => {
    releaseSupabaseBookingHold(holdId, true);
  });

  async function refreshBookingHold(
    currentHold: BookingHold,
    showRestoredMessage = false,
  ) {
    if (
      currentHold.released ||
      !integratedMode ||
      !isDedicatedPublicPage ||
      !vertical
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/public/${getPublicVerticalSegment(vertical)}/${encodeURIComponent(businessSlug)}/holds?holdId=${encodeURIComponent(currentHold.id)}`,
        { method: "GET", cache: "no-store" },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        active?: boolean;
        hold?: BookingHoldRecord;
        serverNow?: number;
      };

      if (!response.ok) {
        return;
      }

      const serverNow = payload.serverNow ?? currentTimestamp();
      setBookingHoldClockOffsetMs(serverNow - currentTimestamp());
      setBookingHoldNow(serverNow);

      if (!payload.active || !payload.hold) {
        actions.releaseBookingHold(currentHold.id);
        setBookingHold((value) =>
          value?.id === currentHold.id
            ? expireBookingHoldAtServerTime(value, serverNow)
            : value,
        );
        setHoldExtensionMessage(null);
        return;
      }

      const refreshedHold = payload.hold;
      actions.commitBookingHolds(
        [
          ...activeStore.bookingHolds.filter((hold) => hold.id !== refreshedHold.id),
          refreshedHold,
        ],
        activeStore,
      );
      setBookingHold((value) =>
        value?.id === refreshedHold.id
          ? {
              ...value,
              expiresAt: refreshedHold.expiresAt,
              extensionCount: refreshedHold.extensionCount ?? value.extensionCount,
              released: false,
            }
          : value,
      );
      if (showRestoredMessage) {
        setHoldExtensionMessage(t.public.backOnline);
      }
    } catch {
      // The local countdown remains authoritative to the last server expiry.
      // A later online/visibility event retries this refresh.
    }
  }

  const refreshBookingHoldFromServer = useEffectEvent(
    async (showRestoredMessage = false) => {
      const currentHold = bookingHold;
      if (!currentHold) {
        return;
      }
      await refreshBookingHold(currentHold, showRestoredMessage);
    },
  );

  useEffect(() => {
    const handleOffline = () => {
      setIsNetworkOnline(false);
      setHoldExtensionMessage(null);
    };
    const handleOnline = () => {
      setIsNetworkOnline(true);
      void refreshBookingHoldFromServer(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void refreshBookingHoldFromServer();
      }
    };

    const initialNetworkStateId = window.setTimeout(() => {
      setIsNetworkOnline(navigator.onLine);
    }, 0);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialNetworkStateId);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!bookingHold || bookingHold.released || resolvedBookingFlow.step !== 3) {
      return;
    }

    const holdId = bookingHold.id;
    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        releaseBookingHoldOnPageHide(holdId);
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [bookingHold, resolvedBookingFlow.step]);

  // Being bounced back to the slots is only useful if the reason is on screen —
  // on a phone the banner sits below the fold otherwise.
  const flowNoticeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!flowNotice || typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      flowNoticeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [flowNotice]);

  useEffect(() => {
    if (!bookingHoldSelectionKey || !bookingHold) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const now = currentTimestamp() + bookingHoldClockOffsetMs;

      setBookingHoldNow(now);

      if (!bookingHold.released && now >= bookingHold.expiresAt) {
        releaseExpiredBookingHold(bookingHold.id);
        setBookingHold((current) =>
          current?.id === bookingHold.id ? { ...current, released: true } : current,
        );
        // The visitor stays on the details step with everything they typed still
        // on screen. Expiry only changes what the buttons do: one tap takes the
        // same slot again, and the calendar is one tap further.
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [bookingHoldSelectionKey, bookingHold, bookingHoldClockOffsetMs]);

  async function extendCurrentBookingHold() {
    if (
      !bookingHold ||
      bookingHold.released ||
      !selectedService ||
      isExtendingHold ||
      !canExtendBookingHold(bookingHold, bookingHoldRemainingMs)
    ) {
      return;
    }

    if (integratedMode && !isNetworkOnline) {
      setHoldExtensionMessage(null);
      return;
    }

    setIsExtendingHold(true);
    setHoldExtensionMessage(null);

    try {
      let updatedHold: BookingHoldRecord = {
        ...(activeStore.bookingHolds.find((hold) => hold.id === bookingHold.id) ?? {}),
        id: bookingHold.id,
        serviceId: selectedService.id,
        bookingType: selectedService.bookingType,
        dateKey: bookingFlow.dateKey,
        startTime: resolveBookingStartTime(selectedService, bookingFlow.time),
        endTime: resolveBookingEndTime(selectedService, bookingFlow.time),
        createdAt: new Date(bookingHold.startedAt).toISOString(),
        expiresAt: bookingHold.expiresAt + BOOKING_HOLD_EXTENSION_MS,
        extensionCount: 1,
      };
      let serverNow = currentTimestamp();

      if (integratedMode && isDedicatedPublicPage && vertical) {
        const response = await fetch(
          `/api/public/${getPublicVerticalSegment(vertical)}/${encodeURIComponent(businessSlug)}/holds`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ holdId: bookingHold.id }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          hold?: BookingHoldRecord;
          serverNow?: number;
        };

        if (!response.ok || !payload.hold) {
          if (response.status === 409) {
            await refreshBookingHold(bookingHold);
          } else {
            setBookingError(t.errors.holdFailed);
          }
          return;
        }

        updatedHold = payload.hold;
        serverNow = payload.serverNow ?? serverNow;
        setBookingHoldClockOffsetMs(serverNow - currentTimestamp());
      }

      actions.commitBookingHolds(
        [
          ...activeStore.bookingHolds.filter((hold) => hold.id !== updatedHold.id),
          updatedHold,
        ],
        activeStore,
      );
      setBookingHold((value) =>
        value?.id === updatedHold.id
          ? {
              ...value,
              expiresAt: updatedHold.expiresAt,
              extensionCount: updatedHold.extensionCount ?? 1,
              released: false,
            }
          : value,
      );
      setBookingHoldNow(serverNow);
      setHoldExtensionMessage(t.public.holdExtended);
      setBookingError(null);
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsNetworkOnline(false);
      }
      setBookingError(t.errors.holdFailed);
    } finally {
      setIsExtendingHold(false);
    }
  }

  // One tap out of an expired hold: take the same slot again, without touching
  // anything the visitor already typed. Only when the slot is genuinely gone do
  // we send them back to the calendar, and then with the reason on screen.
  async function retryExpiredBookingHold() {
    if (isCreatingHold || !selectedService || !bookingFlow.dateKey) {
      return;
    }

    if (integratedMode && !isNetworkOnline) {
      setBookingError(t.public.offlineBody);
      return;
    }

    const expiredHoldId = bookingHold?.id;
    // `beginClientDetailsStep` replaces the hold on success; the expired one is
    // already released, so it only needs dropping from the local store.
    const outcome = await beginClientDetailsStep(bookingFlow.dateKey, bookingFlow.time);

    if (outcome === "held") {
      if (expiredHoldId) {
        actions.releaseBookingHold(expiredHoldId);
      }
      return;
    }

    // A failed request leaves the expired panel up so the same tap can be tried
    // again. Only a genuinely lost slot sends the visitor back to the calendar.
    if (outcome === "unavailable") {
      returnToTimeSelection("SELECTION_CONFLICT");
    }
  }

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
    setHoldExtensionMessage(null);
    setIsCalendarQrModalOpen(false);
    const holdIdToRelease = bookingHold?.released ? undefined : bookingHold?.id;
    actions.releaseBookingHold(holdIdToRelease);
    releaseSupabaseBookingHold(holdIdToRelease);
    setBookingHold(null);
    setBookingHoldClockOffsetMs(0);
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
          {
            ...booking,
            serviceName:
              services.find((service) => service.id === booking.serviceId)?.name ??
              booking.serviceName,
          },
          provider,
          vertical ? buildManageUrl(businessSlug, booking.manageToken, vertical, lang) : "",
          lang,
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

  function resetServiceEditor() {
    setEditingServiceId(null);
    setServiceDraft(createBlankServiceDraft(vertical));
  }

  async function persistAdminStore(nextStore: ModuleStore, fallbackMessage: string) {
    if (!integratedMode || !persistAdminChanges) {
      return true;
    }

    setIsSavingAdmin(true);
    setAdminSaveError(null);
    setAdminSaveMessage(null);

    try {
      const response = await fetch("/api/provider/store", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ store: nextStore }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        store?: ModuleStore;
        userMessage?: string;
      };

      if (!response.ok || !payload.store) {
        setAdminSaveError(payload.userMessage ?? fallbackMessage);
        return false;
      }

      const persistedStore = normalizeStore(payload.store);
      actions.updateStandaloneStore(() => persistedStore);
      onSetupPersisted?.(persistedStore);
      setAdminSaveMessage(t.common.saved);
      window.setTimeout(() => setAdminSaveMessage(null), 1600);
      return true;
    } catch {
      setAdminSaveError(fallbackMessage);
      return false;
    } finally {
      setIsSavingAdmin(false);
    }
  }

  // Single-occurrence events have one fixed date, so rescheduling is meaningless
  // — offer cancel instead.
  function isServiceSingleOccurrence(serviceId: string) {
    const svc = services.find((service) => service.id === serviceId);
    return svc ? isSingleOccurrence(svc) : false;
  }

  function beginEditingService(service: Service) {
    setEditingServiceId(service.id);
    setServiceDraft({
      name: service.name,
      bookingType: service.bookingType,
      durationMinutes: service.durationMinutes ?? 30,
      description: service.description,
      medicalSpecialty: service.medicalSpecialty ?? "",
      capacity: service.capacity ?? "",
      occurrenceMode:
        service.occurrenceMode ?? (vertical === "events" ? "single" : "periodic"),
      occurrenceDate: service.occurrenceDate ?? "",
      weekdays: service.weekdays ?? [],
      startTime: service.startTime ?? "",
      endTime: service.endTime ?? "",
      maxSpots:
        typeof service.maxSpots === "number" ? String(service.maxSpots) : "",
      cost: service.cost ?? "",
      locationPrices: {
        address1: service.locationPrices?.address1 ?? "",
        address2: service.locationPrices?.address2 ?? "",
        custom: service.locationPrices?.custom ?? "",
      },
      notes: service.notes ?? "",
      linkedAddress1: service.linkedAddress1 ?? false,
      linkedAddress2: service.linkedAddress2 ?? false,
      linkedPhone1: service.linkedPhone1 ?? false,
      linkedPhone2: service.linkedPhone2 ?? false,
      customAddress: service.customAddress ?? "",
      customPhone: service.customPhone ?? "",
    });
  }

  async function upsertService() {
    if (!serviceDraft.name.trim() || !serviceDraft.description.trim()) {
      setSetupError(copy.phrases.serviceNameRequiredError);
      return;
    }

    if (vertical === "events" && !parseMaxSpots(serviceDraft.maxSpots)) {
      setSetupError(copy.phrases.maxSpotsRequiredError);
      return;
    }

    if (serviceDraft.occurrenceMode === "single" && !serviceDraft.occurrenceDate) {
      setSetupError(copy.phrases.pickEventDateError);
      return;
    }

    const isFixedWindow =
      vertical === "events" &&
      (serviceDraft.occurrenceMode === "single" ||
        serviceDraft.occurrenceMode === "weekly");

    if (
      isFixedWindow &&
      !isValidTimeWindow(serviceDraft.startTime, serviceDraft.endTime)
    ) {
      setSetupError(
        lang === "es"
          ? "Agregue horas de inicio y fin válidas. La hora de fin debe ser posterior a la de inicio."
          : "Add valid start and end times. The end time must be later than the start time.",
      );
      return;
    }

    if (
      serviceDraft.occurrenceMode === "weekly" &&
      serviceDraft.weekdays.length === 0
    ) {
      setSetupError(copy.phrases.pickWeekdaysError);
      return;
    }

    // Promote the typed value to the first empty provider slot; if both slots
    // are already taken, keep the value as a service-local override. The
    // service link flag is set whenever we promote. Provider + service writes
    // happen inside a single updater so they stay consistent.
    const typedAddress = serviceDraft.customAddress.trim();
    const typedPhone = serviceDraft.customPhone.trim();

    const buildNextStore = (current: ModuleStore): ModuleStore => {
      let nextProvider = current.provider;
      let linkedAddress1 = serviceDraft.linkedAddress1;
      let linkedAddress2 = serviceDraft.linkedAddress2;
      let linkedPhone1 = serviceDraft.linkedPhone1;
      let linkedPhone2 = serviceDraft.linkedPhone2;
      let customAddress: string | undefined = typedAddress || undefined;
      let customPhone: string | undefined = typedPhone || undefined;

      if (typedAddress) {
        if (!nextProvider.address1.trim()) {
          nextProvider = { ...nextProvider, address1: typedAddress };
          linkedAddress1 = true;
          customAddress = undefined;
        } else if (!nextProvider.address2.trim()) {
          nextProvider = { ...nextProvider, address2: typedAddress };
          linkedAddress2 = true;
          customAddress = undefined;
        }
      }

      if (typedPhone) {
        if (!nextProvider.phoneNumber1.trim()) {
          nextProvider = { ...nextProvider, phoneNumber1: typedPhone };
          linkedPhone1 = true;
          customPhone = undefined;
        } else if (!nextProvider.phoneNumber2.trim()) {
          nextProvider = { ...nextProvider, phoneNumber2: typedPhone };
          linkedPhone2 = true;
          customPhone = undefined;
        }
      }

      const hasFixedWindow =
        serviceDraft.occurrenceMode === "single" ||
        serviceDraft.occurrenceMode === "weekly";
      const windowMinutes =
        getTimeWindowDurationMinutes(serviceDraft.startTime, serviceDraft.endTime);

      const nextService: Service = {
        id: editingServiceId ?? createId("service"),
        name: serviceDraft.name.trim(),
        // Fixed-window events are represented by their own start/end times.
        // Keep the internal booking type timed so legacy full-day seeds do not
        // override the visible event window or its derived duration.
        bookingType: hasFixedWindow ? "appointment" : serviceDraft.bookingType,
        durationMinutes:
          hasFixedWindow
            ? windowMinutes > 0
              ? windowMinutes
              : 60
            : serviceDraft.bookingType === "appointment"
              ? serviceDraft.durationMinutes
              : undefined,
        description: serviceDraft.description.trim(),
        medicalSpecialty:
          serviceDraft.bookingType === "appointment"
            ? serviceDraft.medicalSpecialty?.trim() || undefined
            : undefined,
        // Events derive capacity from maxSpots (single source of truth); only
        // other verticals keep a free-text capacity string.
        capacity:
          vertical === "events" ? undefined : serviceDraft.capacity.trim() || undefined,
        occurrenceMode: serviceDraft.occurrenceMode,
        occurrenceDate:
          serviceDraft.occurrenceMode === "single"
            ? serviceDraft.occurrenceDate || undefined
            : undefined,
        weekdays:
          serviceDraft.occurrenceMode === "weekly"
            ? [...serviceDraft.weekdays]
            : undefined,
        startTime: hasFixedWindow ? serviceDraft.startTime || undefined : undefined,
        endTime: hasFixedWindow ? serviceDraft.endTime || undefined : undefined,
        maxSpots: parseMaxSpots(serviceDraft.maxSpots),
        cost: serviceDraft.cost.trim() || undefined,
        locationPrices: (() => {
          const lp = serviceDraft.locationPrices;
          if (!lp) return undefined;
          const out: Partial<Record<"address1" | "address2" | "custom", string>> = {};
          if (lp.address1.trim()) out.address1 = lp.address1.trim();
          if (lp.address2.trim()) out.address2 = lp.address2.trim();
          if (lp.custom.trim()) out.custom = lp.custom.trim();
          return Object.keys(out).length > 0 ? out : undefined;
        })(),
        notes: serviceDraft.notes.trim() || undefined,
        linkedAddress1: linkedAddress1 || undefined,
        linkedAddress2: linkedAddress2 || undefined,
        linkedPhone1: linkedPhone1 || undefined,
        linkedPhone2: linkedPhone2 || undefined,
        customAddress,
        customPhone,
      };

      return {
        ...current,
        provider: nextProvider,
        services: editingServiceId
          ? current.services.map((service) =>
              service.id === editingServiceId ? nextService : service,
            )
          : [...current.services, nextService],
      };
    };
    const nextStore = buildNextStore(activeStore);

    actions.updateStandaloneStore(() => nextStore);
    if (integratedMode) {
      const persisted = await persistAdminStore(nextStore, "Could not save that service.");
      if (!persisted) return;
    }
    setSetupError(null);
    resetServiceEditor();
  }

  async function removeService(serviceId: string) {
    if (services.length <= 1) {
      setSetupError(copy.phrases.keepOneServiceError);
      return;
    }

    const activeBookingsForService = bookings.some(
      (booking) => booking.serviceId === serviceId && booking.status !== "cancelled",
    );

    if (activeBookingsForService) {
      setSetupError(copy.phrases.cancelActiveFirstError);
      return;
    }

    const nextStore = {
      ...activeStore,
      services: activeStore.services.filter((service) => service.id !== serviceId),
    };

    actions.updateStandaloneStore(() => nextStore);

    if (integratedMode) {
      const persisted = await persistAdminStore(nextStore, "Could not remove that service.");
      if (!persisted) return;
    }

    if (editingServiceId === serviceId) {
      resetServiceEditor();
    }
  }

  // Mark the booking page live. In standalone mode this only writes
  // localStorage. For signed-in setup it also persists the same store to
  // Supabase and swaps the UI to the returned database-backed IDs.
  async function publishSetup() {
    if (integratedMode) {
      return true;
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

    if (!persistSetup) {
      actions.persistStandaloneStore(nextStore);
      actions.updateStandaloneStore(() => nextStore);
      return true;
    }

    setIsPersistingSetup(true);

    try {
      const response = await fetch("/api/provider/store", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ store: nextStore }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        store?: ModuleStore;
        userMessage?: string;
      };

      if (!response.ok || !payload.store) {
        setSetupError(payload.userMessage ?? "Could not save your booking page.");
        return false;
      }

      const persistedStore = normalizeStore(payload.store);
      actions.persistStandaloneStore(persistedStore);
      actions.updateStandaloneStore(() => persistedStore);
      onSetupPersisted?.(persistedStore);
      return true;
    } catch {
      setSetupError("Could not save your booking page. Please try again.");
      return false;
    } finally {
      setIsPersistingSetup(false);
    }
  }

  async function resumeGuestDraftPublication() {
    setSetupStep(4);
    setSetupPublished(true);
    setSetupError(null);

    if (!isGuestDraftMeaningful(activeStore)) {
      setSetupError(t.setup.missingGuestDraft);
      return;
    }

    await publishSetup();
  }

  useEffect(() => {
    if (
      !resumeGuestPublish ||
      !persistSetup ||
      integratedMode ||
      !hydrated ||
      resumeGuestPublishAttemptedRef.current
    ) {
      return;
    }

    resumeGuestPublishAttemptedRef.current = true;
    void resumeGuestDraftPublication();
    // One authenticated resume attempt per mount. Retry stays user-controlled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, integratedMode, persistSetup, resumeGuestPublish]);

  // Leave the Done step for the chosen surface. Setup is already published by
  // the time this runs, so these handlers only steer navigation.
  function leaveSetupToSurface(nextSurface: Surface) {
    setSetupPublished(false);
    setSurface(nextSurface);
    startFreshBooking();
  }

  function updateProvider<K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) {
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

    // Only the owner's own workspace language travels upward. `language` is
    // the clients' language and stays inside the store.
    if (key === "dashboardLanguage") {
      onDashboardLanguageChange?.(value as Lang);
    }
  }

  function updateAvailabilityDay(
    day: WeekdayKey,
    patch: Partial<DayAvailability>,
  ) {
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

    const empty = seedSetupLanguage(createEmptyStore(), lang);
    setSetupStep(1);
    setSetupError(null);
    resetServiceEditor();
    startFreshBooking();
    actions.updateStandaloneStore(() => empty);
    onVerticalChange?.(undefined);
  }

  function applyVertical(id: VerticalId) {
    if (integratedMode) {
      return;
    }

    const preset = getVerticalPreset(id, lang);
    if (!preset) {
      return;
    }

    setSetupError(null);
    setSetupStep(1);
    actions.updateStandaloneStore((current) =>
      setServiceBookingLength(
        applyVerticalToStore(current, preset),
        DEFAULT_APPOINTMENT_DURATION_MINUTES,
      ),
    );
    onVerticalChange?.(id);
  }

  // One-shot: apply the landing-selected vertical preset once on mount. This is
  // a deliberate sync from an external selection (made on the landing page before
  // this component existed), guarded so it runs a single time.
  const appliedInitialVerticalRef = useRef(false);
  useEffect(() => {
    if (appliedInitialVerticalRef.current) return;
    if (integratedMode || !hydrated) return;
    if (!initialVerticalId) return;
    appliedInitialVerticalRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyVertical(initialVerticalId);
    // The name chosen on the landing page also seeds the public slug, so the
    // link previewed there is the link setup starts with.
    if (initialBusinessName?.trim()) {
      updateProvider("businessName", initialBusinessName.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, initialBusinessName, initialVerticalId, integratedMode]);

  // A provider who never touches the field would otherwise be published on the
  // column's UTC default, which silently shifts every slot on their page. The
  // browser's zone is the best guess available and stays editable in Settings.
  const appliedDetectedTimeZoneRef = useRef(false);
  useEffect(() => {
    if (appliedDetectedTimeZoneRef.current) return;
    if (integratedMode || !hydrated) return;
    if (activeStore.setupComplete || storedProvider.timezone) return;

    const detected = detectTimeZone();
    if (!detected) return;

    appliedDetectedTimeZoneRef.current = true;
    updateProvider("timezone", detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore.setupComplete, hydrated, integratedMode, storedProvider.timezone]);

  function updateSetupBookingLength(value: string) {
    if (integratedMode) {
      return;
    }

    const bookingLength = value === "full-day" ? "full-day" : Number(value);

    setSetupError(null);
    actions.updateStandaloneStore((current) =>
      setServiceBookingLength(current, bookingLength),
    );
  }

  function validateSetup(step: SetupStep) {
    if (step === 1) {
      if (!provider.fullName.trim() || !provider.businessName.trim() || !provider.email.trim()) {
        return profileRole?.requiredFieldsError ?? t.setup.providerRequiredFieldsError;
      }
    }

    if (step === 2 && services.length === 0) {
      return copy.phrases.addServiceFirstError;
    }

    if (step === 3) {
      const hasEnabledDay = WEEKDAY_KEYS.some((day) => availability[day].enabled);

      if (!hasEnabledDay) {
        return copy.phrases.enableWeekdayError;
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

  async function goToNextSetupStep() {
    if (isPersistingSetup) {
      return;
    }

    const error = validateSetup(setupStep);

    if (error) {
      setSetupError(error);
      return;
    }

    // Guests receive a real browser-local preview. Authenticated providers
    // persist to Supabase before the final step.
    if (setupStep === 3) {
      if (isGuestDraft) {
        const previewStore = prepareGuestPreviewStore(activeStore);
        actions.persistStandaloneStore(previewStore);
        actions.updateStandaloneStore(() => previewStore);
      } else {
        const published = await publishSetup();
        if (!published) {
          return;
        }
      }
      setSetupPublished(true);
    }

    setSetupError(null);
    setSetupStep((current) => (current < 4 ? ((current + 1) as SetupStep) : current));
  }

  function goToPreviousSetupStep() {
    if (isPersistingSetup) {
      return;
    }

    setSetupError(null);

    if (setupStep > 1) {
      setSetupStep((current) => (current > 1 ? ((current - 1) as SetupStep) : current));
      return;
    }

    actions.updateStandaloneStore((current) => ({
      ...current,
      vertical: undefined,
    }));
    onVerticalChange?.(undefined);
  }

  // Every public-flow step change goes through the machine in
  // lib/booking-flow-machine.ts, so the rules about what survives a transition
  // (the service, the date) live in one tested place instead of at each call site.
  function dispatchBookingFlow(event: BookingFlowEvent) {
    setBookingFlow((current) => {
      const next = bookingFlowReducer(createBookingFlowState(current), event);
      setFlowNotice(next.notice);
      return next.flow;
    });
  }

  // Expired hold or a slot lost to someone else: release locally, then hand the
  // visitor back to time selection with the reason on screen.
  function returnToTimeSelection(reason: "HOLD_EXPIRED" | "SELECTION_CONFLICT") {
    const holdIdToRelease = bookingHold?.released ? undefined : bookingHold?.id;
    actions.releaseBookingHold(holdIdToRelease);
    releaseSupabaseBookingHold(holdIdToRelease);
    setBookingHold(null);
    setBookingHoldClockOffsetMs(0);
    setBookingHoldNow(currentTimestamp());
    setHoldExtensionMessage(null);
    setBookingError(null);
    setPendingHoldTime(null);
    dispatchBookingFlow({ type: reason });
  }

  function updateBookingFlow<K extends keyof BookingFlow>(key: K, value: BookingFlow[K]) {
    setBookingFlow((current) => {
      const next = { ...current, [key]: value };
      if (
        bookingError === copy.phrases.clientFieldsRequiredError &&
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

  /**
   * Creates the server hold for the current selection and opens the details
   * step. The three outcomes are worth telling apart: `unavailable` means the
   * slot is genuinely gone (send the visitor back to the calendar), `failed`
   * means the request did not land (leave them where they are so they can
   * retry).
   */
  async function beginClientDetailsStep(
    dateKey = bookingFlow.dateKey,
    time = bookingFlow.time,
  ): Promise<"held" | "unavailable" | "failed"> {
    if (!selectedService || !dateKey) {
      return "failed";
    }

    if (selectedService.bookingType === "appointment" && !time) {
      return "failed";
    }

    const now = currentTimestamp();
    const latestStandaloneStore = actions.readStandaloneStoreSnapshot();
    const baseStore = latestStandaloneStore ?? activeStore;
    const latestService =
      baseStore.services.find((service) => service.id === selectedService.id) ?? selectedService;
    const currentHoldId = bookingHold?.released ? undefined : bookingHold?.id;
    const previousHoldId = currentHoldId;
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
        flowIgnoredBookingId,
        currentHolds,
      ).includes(time)
    ) {
      setBookingError(t.errors.selectionUnavailable);
      return "unavailable";
    }

    if (
      latestService.bookingType === "full-day" &&
      !isDateAvailable(
        dateKey,
        latestService,
        baseStore.availability,
        baseStore.bookings,
        flowIgnoredBookingId,
        currentHolds,
      )
    ) {
      setBookingError(t.errors.selectionUnavailable);
      return "unavailable";
    }

    const startedAt = now;
    const expiresAt = startedAt + BOOKING_HOLD_DURATION_MS;
    let holdRecord: BookingHoldRecord = {
      id: createId("hold"),
      serviceId: latestService.id,
      bookingType: latestService.bookingType,
      dateKey,
      startTime: resolveBookingStartTime(latestService, time),
      endTime: resolveBookingEndTime(latestService, time),
      createdAt: new Date(startedAt).toISOString(),
      expiresAt,
      extensionCount: 0,
    };
    let holdServerNow = startedAt;

    if (integratedMode && isDedicatedPublicPage && vertical) {
      if (!isNetworkOnline) {
        setBookingError(t.public.offlineBody);
        return "failed";
      }
      setIsCreatingHold(true);
      setBookingError(null);

      try {
        const response = await fetch(
          `/api/public/${getPublicVerticalSegment(vertical)}/${encodeURIComponent(businessSlug)}/holds`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceId: latestService.id,
              dateKey,
              time: time || undefined,
            }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          hold?: BookingHoldRecord;
          serverNow?: number;
          userMessage?: string;
        };

        if (!response.ok || !payload.hold) {
          setBookingError(
            response.status === 409 ? t.errors.selectionUnavailable : t.errors.holdFailed,
          );
          return response.status === 409 ? "unavailable" : "failed";
        }

        holdRecord = payload.hold;
        holdServerNow = payload.serverNow ?? currentTimestamp();
        setBookingHoldClockOffsetMs(holdServerNow - currentTimestamp());
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setIsNetworkOnline(false);
        }
        setBookingError(t.errors.holdFailed);
        return "failed";
      } finally {
        setIsCreatingHold(false);
      }
    }

    if (!integratedMode && latestStandaloneStore) {
      actions.setStandaloneStore(latestStandaloneStore);
    }

    setBookingError(null);
    actions.commitBookingHolds([...currentHolds, holdRecord], baseStore);
    if (previousHoldId && previousHoldId !== holdRecord.id) {
      releaseSupabaseBookingHold(previousHoldId);
    }
    setBookingHold({
      id: holdRecord.id,
      selectionKey: getBookingHoldSelectionKey(latestService, dateKey, time),
      startedAt: new Date(holdRecord.createdAt).getTime(),
      expiresAt: holdRecord.expiresAt,
      extensionCount: holdRecord.extensionCount ?? 0,
      released: false,
    });
    setBookingHoldNow(holdServerNow);
    setHoldExtensionMessage(null);
    dispatchBookingFlow({
      type: "HOLD_CREATED",
      serviceId: latestService.id,
      dateKey,
      time,
    });
    return "held";
  }

  // Tapping a slot is the commitment: the hold is created on the server right
  // then, and the visitor lands on the details form with the countdown running.
  // One tap instead of tap-then-continue, and no slot sits "selected" unheld.
  function selectTimeSlot(slot: string) {
    if (isCreatingHold || isMutatingBooking) {
      return;
    }

    // Moving an existing booking needs no hold: the slot is written straight
    // away, so one tap on a time is the whole reschedule.
    if (isManageRescheduling && successfulBooking) {
      dispatchBookingFlow({ type: "SELECT_TIME", time: slot });
      void confirmReschedule({
        bookingId: successfulBooking.id,
        dateKey: bookingFlow.dateKey,
        time: slot,
      });
      return;
    }

    setPendingHoldTime(slot);
    dispatchBookingFlow({ type: "SELECT_TIME", time: slot });
    void beginClientDetailsStep(bookingFlow.dateKey, slot).finally(() => {
      setPendingHoldTime(null);
    });
  }

  async function confirmBooking() {
    if (isConfirmingBooking) {
      return;
    }

    setIsCalendarQrModalOpen(false);
    const now = currentTimestamp() + bookingHoldClockOffsetMs;
    const latestStandaloneStore = actions.readStandaloneStoreSnapshot();
    const validationStore = latestStandaloneStore ?? activeStore;
    const validationService =
      validationStore.services.find(
        (service) => service.id === resolvedBookingFlow.serviceId,
      ) ?? selectedService;
    const ignoredHoldId = bookingHold?.released ? undefined : bookingHold?.id;
    const validationHolds = pruneBookingHolds(validationStore.bookingHolds, now);

    if (isBookingHoldExpired || bookingHold?.released) {
      returnToTimeSelection("HOLD_EXPIRED");
      return;
    }

    if (integratedMode && !isNetworkOnline) {
      setBookingError(t.public.offlineBody);
      return;
    }

    if (!integratedMode && latestStandaloneStore) {
      actions.setStandaloneStore(latestStandaloneStore);
    }

    if (!validationService) {
      setBookingError(copy.phrases.chooseServiceFirstError);
      return;
    }

    if (!bookingFlow.dateKey) {
      setBookingError(copy.phrases.pickDateFirstError);
      return;
    }

    if (validationService.bookingType === "appointment" && !bookingFlow.time) {
      setBookingError(t.errors.selectTimeFirst);
      return;
    }

    if (
      !bookingFlow.clientName.trim() ||
      !bookingFlow.clientEmail.trim() ||
      !bookingFlow.clientPhone.trim()
    ) {
      setBookingError(copy.phrases.clientFieldsRequiredError);
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
      returnToTimeSelection("SELECTION_CONFLICT");
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
      returnToTimeSelection("SELECTION_CONFLICT");
      return;
    }

    const createdAt = new Date().toISOString();
    // Resolve the chosen location's address from the validated snapshot. Derive
    // by key directly (consistent with getEffectiveCost) so it never falls out
    // of sync with the selected price; fall back to the sole location if any.
    const addressForLocationKey = (key?: LocationKey): string | undefined => {
      if (key === "address1") return validationStore.provider.address1?.trim() || undefined;
      if (key === "address2") return validationStore.provider.address2?.trim() || undefined;
      if (key === "custom") return validationService.customAddress?.trim() || undefined;
      return undefined;
    };
    const validationLocations = getServiceLocations(
      validationService,
      validationStore.provider,
    );
    const bookingLocationAddress =
      addressForLocationKey(bookingFlow.locationKey) ??
      (validationLocations.length === 1 ? validationLocations[0].address : undefined);
    const nextBooking: BookingRecord = {
      id: createId("booking"),
      serviceId: validationService.id,
      serviceName: validationService.name,
      bookingType: validationService.bookingType,
      dateKey: bookingFlow.dateKey,
      startTime: resolveBookingStartTime(validationService, bookingFlow.time),
      endTime: resolveBookingEndTime(validationService, bookingFlow.time),
      clientName: bookingFlow.clientName.trim(),
      clientEmail: bookingFlow.clientEmail.trim(),
      clientPhone: bookingFlow.clientPhone.trim(),
      notes: bookingFlow.notes.trim(),
      capacitySnapshot:
        typeof validationService.maxSpots === "number"
          ? formatCapacityLabel(validationService)
          : validationService.capacity,
      cost: getEffectiveCost(validationService, bookingFlow.locationKey),
      location: bookingLocationAddress,
      status: "confirmed",
      createdAt,
      updatedAt: createdAt,
      manageToken: generateManageToken(),
    };

    const nextHolds = validationHolds.filter((hold) => hold.id !== ignoredHoldId);
    let bookingToCommit = nextBooking;

    if (integratedMode && isDedicatedPublicPage && vertical) {
      setIsConfirmingBooking(true);
      setBookingError(null);

      try {
        const response = await fetch(
          `/api/public/${getPublicVerticalSegment(vertical)}/${encodeURIComponent(businessSlug)}/bookings`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceId: validationService.id,
              dateKey: bookingFlow.dateKey,
              time: bookingFlow.time || undefined,
              clientName: bookingFlow.clientName.trim(),
              clientEmail: bookingFlow.clientEmail.trim(),
              clientPhone: bookingFlow.clientPhone.trim(),
              notes: bookingFlow.notes.trim(),
              location: bookingLocationAddress,
              locationKey: bookingFlow.locationKey,
              details: {
                locationKey: bookingFlow.locationKey ?? null,
              },
              detailsSchemaKey: "base",
              detailsSchemaVersion: 1,
              idempotencyKey:
                typeof crypto.randomUUID === "function" ? crypto.randomUUID() : createId("idem"),
              holdId: ignoredHoldId,
            }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          booking?: BookingRecord;
          userMessage?: string;
        };

        if (!response.ok || !payload.booking) {
          // The server re-checks bookings and holds before it writes. A 409 means
          // the selection is gone, so keep nobody on a details form for a slot
          // that no longer exists — return to the slots with the reason shown.
          if (response.status === 409) {
            const holdRanOut =
              bookingHold &&
              currentTimestamp() + bookingHoldClockOffsetMs >= bookingHold.expiresAt;
            returnToTimeSelection(holdRanOut ? "HOLD_EXPIRED" : "SELECTION_CONFLICT");
            return;
          }
          setBookingError(t.errors.confirmFailed);
          return;
        }

        bookingToCommit = payload.booking;
      } catch {
        setBookingError(t.errors.confirmFailed);
        return;
      } finally {
        setIsConfirmingBooking(false);
      }
    }

    console.log("Haab Calendar booking confirmed:", bookingToCommit);

    actions.commitBookings([...validationStore.bookings, bookingToCommit], validationStore, nextHolds);
    setBookingError(null);
    setHoldExtensionMessage(null);
    setBookingHold(null);
    setBookingHoldClockOffsetMs(0);
    setBookingHoldNow(now);
    setBookingFlow((current) => ({
      ...current,
      step: 4,
      successBookingId: bookingToCommit.id,
    }));
  }

  function commitBookingMutation(baseStore: ModuleStore, updatedBooking: BookingRecord) {
    const bookingExists = baseStore.bookings.some((booking) => booking.id === updatedBooking.id);
    const nextBookings = bookingExists
      ? baseStore.bookings.map((booking) =>
          booking.id === updatedBooking.id ? updatedBooking : booking,
        )
      : [...baseStore.bookings, updatedBooking];

    actions.commitBookings(nextBookings, baseStore);
  }

  function getManageTokenForBooking(booking: BookingRecord) {
    return manageBookingToken || booking.manageToken || undefined;
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

  function openCancellation(bookingId: string) {
    setCancellationError(null);
    setCancellationId(bookingId);
  }

  // Rescheduling from the private link drops the visitor into the same
  // date-and-time step the original booking came from, with the service already
  // chosen. The existing booking is untouched until a new slot is saved.
  function startManageReschedule() {
    if (!successfulBooking || successfulBooking.status === "cancelled") {
      return;
    }

    setBookingError(null);
    setFlowNotice(null);
    setPublicMonthAnchor(parseDateKey(successfulBooking.dateKey));
    setBookingFlow((current) => ({
      ...current,
      step: 2,
      serviceId: successfulBooking.serviceId,
      dateKey: successfulBooking.dateKey,
      time: "",
    }));
    setIsManageRescheduling(true);
  }

  function cancelManageReschedule() {
    setIsManageRescheduling(false);
    setBookingError(null);
    setFlowNotice(null);
    setBookingFlow((current) => ({ ...current, step: 4 }));
  }

  async function saveClientNote() {
    if (!successfulBooking || isSavingClientNote) {
      return;
    }

    const note = clientNoteDraft.trim().slice(0, 500);
    setIsSavingClientNote(true);
    setClientNoteStatus("idle");

    try {
      let bookingToCommit: BookingRecord = {
        ...successfulBooking,
        clientNote: note,
        updatedAt: new Date().toISOString(),
      };
      const manageToken = getManageTokenForBooking(successfulBooking);

      if (integratedMode && isDedicatedPublicPage && vertical && manageToken) {
        const response = await fetch(
          `/api/public/${getPublicVerticalSegment(vertical)}/${encodeURIComponent(businessSlug)}/manage/${encodeURIComponent(manageToken)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "note", note }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          booking?: BookingRecord;
        };

        if (!response.ok || !payload.booking) {
          setClientNoteStatus("failed");
          return;
        }

        bookingToCommit = {
          ...payload.booking,
          manageToken: payload.booking.manageToken || manageToken,
        };
      }

      commitBookingMutation(activeStore, bookingToCommit);
      setClientNoteDraft(bookingToCommit.clientNote ?? note);
      setClientNoteStatus("saved");
    } catch {
      setClientNoteStatus("failed");
    } finally {
      setIsSavingClientNote(false);
    }
  }

  /**
   * Saves a new date/time for an existing booking. `target` is passed when the
   * move came from the private link's availability flow, which has no modal to
   * put an error message in — those go to the flow's own error banner.
   */
  async function confirmReschedule(target?: {
    bookingId: string;
    dateKey: string;
    time: string;
  }) {
    const request = target ?? rescheduleState;

    if (!request || isMutatingBooking) {
      return;
    }

    const reportRescheduleError = (message: string) => {
      if (target) {
        setBookingError(message);
        return;
      }
      setRescheduleState((current) => (current ? { ...current, error: message } : current));
    };

    const latestStandaloneStore = actions.readStandaloneStoreSnapshot();
    const validationStore = latestStandaloneStore ?? activeStore;
    const booking = validationStore.bookings.find(
      (candidate) => candidate.id === request.bookingId,
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

    if (!request.dateKey) {
      return;
    }

    if (service.bookingType === "appointment") {
      const validationHolds = pruneBookingHolds(validationStore.bookingHolds);
      const nextSlots = getAvailableSlots(
        request.dateKey,
        service,
        validationStore.availability,
        validationStore.bookings,
        booking.id,
        validationHolds,
      );

      if (!nextSlots.includes(request.time)) {
        reportRescheduleError(t.errors.rescheduleSlotUnavailable);
        return;
      }
    } else if (
      !isDateAvailable(
        request.dateKey,
        service,
        validationStore.availability,
        validationStore.bookings,
        booking.id,
        pruneBookingHolds(validationStore.bookingHolds),
      )
    ) {
      reportRescheduleError(t.errors.rescheduleDateUnavailable);
      return;
    }

    let bookingToCommit: BookingRecord = {
      ...booking,
      dateKey: request.dateKey,
      startTime: resolveBookingStartTime(service, request.time),
      endTime: resolveBookingEndTime(service, request.time),
      status: "rescheduled",
      updatedAt: new Date().toISOString(),
    };

    if (integratedMode) {
      const manageToken = getManageTokenForBooking(booking);
      const endpoint =
        isDedicatedPublicPage && vertical && manageToken
          ? `/api/public/${getPublicVerticalSegment(vertical)}/${encodeURIComponent(businessSlug)}/manage/${encodeURIComponent(manageToken)}`
          : `/api/provider/bookings/${encodeURIComponent(booking.id)}`;

      setIsMutatingBooking(true);
      if (target) {
        setBookingError(null);
      } else {
        setRescheduleState((current) => (current ? { ...current, error: undefined } : current));
      }

      try {
        const response = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reschedule",
            dateKey: request.dateKey,
            time: request.time || undefined,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          booking?: BookingRecord;
          userMessage?: string;
        };

        if (!response.ok || !payload.booking) {
          reportRescheduleError(
            response.status === 409
              ? service.bookingType === "appointment"
                ? t.errors.rescheduleSlotUnavailable
                : t.errors.rescheduleDateUnavailable
              : t.errors.rescheduleFailed,
          );
          return;
        }

        bookingToCommit = {
          ...payload.booking,
          manageToken: payload.booking.manageToken || booking.manageToken || manageToken || "",
        };
      } catch {
        reportRescheduleError(t.errors.rescheduleFailed);
        return;
      } finally {
        setIsMutatingBooking(false);
      }
    }

    commitBookingMutation(validationStore, bookingToCommit);

    if (target) {
      // Straight back to the management page, now showing the new time.
      setIsManageRescheduling(false);
      setBookingError(null);
      setFlowNotice(null);
      setBookingFlow((current) => ({
        ...current,
        step: 4,
        successBookingId: bookingToCommit.id,
        dateKey: bookingToCommit.dateKey,
        time: bookingToCommit.startTime ?? "",
      }));
      return;
    }

    setRescheduleState(null);
  }

  async function confirmCancellation() {
    if (!cancellationId || isMutatingBooking) {
      return;
    }

    const latestStandaloneStore = actions.readStandaloneStoreSnapshot();
    const validationStore = latestStandaloneStore ?? activeStore;
    const booking = validationStore.bookings.find((candidate) => candidate.id === cancellationId);

    if (!integratedMode && latestStandaloneStore) {
      actions.setStandaloneStore(latestStandaloneStore);
    }

    if (!booking) {
      return;
    }

    let bookingToCommit: BookingRecord = {
      ...booking,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    };

    if (integratedMode) {
      const manageToken = getManageTokenForBooking(booking);
      const endpoint =
        isDedicatedPublicPage && vertical && manageToken
          ? `/api/public/${getPublicVerticalSegment(vertical)}/${encodeURIComponent(businessSlug)}/manage/${encodeURIComponent(manageToken)}`
          : `/api/provider/bookings/${encodeURIComponent(booking.id)}`;

      setIsMutatingBooking(true);
      setCancellationError(null);

      try {
        const response = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          booking?: BookingRecord;
          userMessage?: string;
        };

        if (!response.ok || !payload.booking) {
          setCancellationError(t.errors.cancelFailed);
          return;
        }

        bookingToCommit = {
          ...payload.booking,
          manageToken: payload.booking.manageToken || booking.manageToken || manageToken || "",
        };
      } catch {
        setCancellationError(t.errors.cancelFailed);
        return;
      } finally {
        setIsMutatingBooking(false);
      }
    }

    commitBookingMutation(validationStore, bookingToCommit);
    setCancellationId(null);
    setCancellationError(null);
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
    if (!successfulBooking?.manageToken || !vertical) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildManageUrl(businessSlug, successfulBooking.manageToken, vertical, lang),
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
          flowIgnoredBookingId,
          activeBookingHolds,
          bookingHold?.released ? undefined : bookingHold?.id,
        )
      : [];

  function renderWelcome() {
    return (
      <div className="relative isolate -mx-4 -my-6 flex min-h-[calc(100vh-1px)] flex-col overflow-hidden sm:-mx-6 lg:-mx-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_15%_0%,rgba(26,115,232,0.18),transparent_55%),radial-gradient(90%_70%_at_100%_20%,rgba(0,191,165,0.18),transparent_60%),radial-gradient(120%_90%_at_50%_100%,rgba(31,101,143,0.14),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.55)_0%,rgba(248,249,250,0.85)_100%)]" />
          <div
            className="absolute -left-32 top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(104,250,221,0.35),transparent_65%)] blur-3xl"
          />
          <div
            className="absolute -right-24 bottom-0 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(26,115,232,0.28),transparent_65%)] blur-3xl"
          />
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16 sm:px-10 sm:py-20">
          <div className="flex flex-col items-start gap-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)] shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-[14px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--action-teal)]" />
              {t.welcome.badge}
            </span>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--ink)] sm:text-5xl lg:text-6xl">
              {t.welcome.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              {t.welcome.body}
            </p>
          </div>

          <div className="mt-12 sm:mt-16">
            <VerticalPicker
              verticals={getVerticals(lang)}
              onSelect={applyVertical}
              actionLabel={t.welcome.getStarted}
            />
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-[var(--muted)]">
            {[t.welcome.featureCustomizable, t.welcome.featureNoCard, t.welcome.featureReady].map((feature) => (
              <span key={feature} className="inline-flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                    <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </span>
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderSetupWizard() {
    const hasServices = services.length > 0;
    const setupBookingLength = getSetupBookingLengthValue(services);

    return (
      <>
        <div className={cn(adminPanelClass, "p-6 sm:p-8")}>
          <SectionTitle
            eyebrow={t.setup.eyebrow}
            title={copy.phrases.setupTitle}
            body={t.setup.wizardBody}
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {([
              ["1", t.setup.stepProvider],
              ["2", t.setup.stepServices],
              ["3", t.setup.stepAvailability],
              ["4", t.setup.stepPreview],
            ] as [string, string][]).map(([index, label]) => {
              const stepNumber = Number(index) as SetupStep;
              const isCurrent = setupStep === stepNumber;

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
                    {t.setup.stepLabel} {index}
                  </p>
                  <p className="mt-2 text-base font-semibold text-[var(--ink)]">{label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {setupStep === 1 ? (
          <div className="mt-8">
            <div className={cn(adminPanelClass, "p-6")}>
              <SectionTitle
                title={healthcareRole?.dataTitle ?? t.setup.step1Title}
                body={copy.phrases.providerInfoBody}
              />
              <div className="mt-6">
                <ProviderInfoForm provider={provider} onChange={updateProvider} lang={lang} />
              </div>
            </div>
          </div>
        ) : null}

        {setupStep === 2 ? (
          <div className="mt-8">
            <div className={cn(adminPanelClass, "p-6 sm:p-8")}>
              <SectionTitle
                title={t.setup.stepServicesTitle}
                body={t.setup.stepServicesBody}
              />
              <div className="mt-6">{renderServices()}</div>
            </div>
          </div>
        ) : null}

        {setupStep === 3 ? (
          <div className={cn("mt-8", adminPanelClass, "p-6")}>
            <SectionTitle
              title={t.setup.step2Title}
              body={copy.phrases.availabilityBody}
            />
            <div className={cn("mt-6", adminInsetClass, "grid gap-4 p-4 sm:grid-cols-[1fr_220px] sm:items-end")}>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">{t.setup.bookingLength}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  {t.setup.bookingLengthHint}
                </p>
              </div>
              <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
                {t.setup.lengthLabel}
                <select
                  disabled={!hasServices}
                  value={setupBookingLength}
                  onChange={(event) => updateSetupBookingLength(event.target.value)}
                  className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
                >
                  {DURATION_OPTIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {formatSlotSizeOption(duration, lang)}
                    </option>
                  ))}
                  <option value="full-day">{t.setup.fullDayOption}</option>
                </select>
              </label>
            </div>
            <div className="mt-6">
              <AvailabilityEditor
                availability={availability}
                onChange={updateAvailabilityDay}
                lang={lang}
              />
            </div>
          </div>
        ) : null}

        {setupStep === 4 ? (
          <div className="mt-8">
            <div className={cn(adminPanelClass, "p-6")}>
              <SectionTitle
                eyebrow={t.setup.doneEyebrow}
                title={copy.phrases.setupDoneTitle}
                body={t.setup.doneBody}
              />
              <div className={cn("mt-6", adminInsetClass, "p-4")}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  {t.setup.publicBookingPage}
                </p>
                <p className="mt-2 break-all text-sm font-medium text-[var(--ink)]">{publicUrl}</p>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    {t.setup.yourServices}
                  </p>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] px-2 text-xs font-semibold text-[var(--accent-strong)]">
                    {services.length}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {services.map((service, index) => (
                    <div
                      key={service.id}
                      className={cn(
                        adminInsetClass,
                        "flex items-center gap-2.5 px-3 py-2",
                      )}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[0.6875rem] font-semibold leading-none text-white tabular-nums">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        {service.name}
                      </span>
                      <span
                        aria-hidden
                        className="h-3 w-px bg-[rgba(193,198,214,0.45)]"
                      />
                      <ToneBadge tone={bookingTypeTone(service.bookingType)}>
                        {getBookingTypeLabel(service.bookingType, lang)}
                      </ToneBadge>
                      <span className="text-xs font-medium text-[var(--muted)] tabular-nums">
                        {formatDuration(service, lang)}
                      </span>
                      {service.medicalSpecialty ? (
                        <span className="text-xs font-medium text-[var(--muted)]">
                          {service.medicalSpecialty}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {t.setup.editServicesPrefix} {copy.Services} {t.setup.editServicesSuffix}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {resumeGuestPublish && isPersistingSetup ? (
                  <p
                    role="status"
                    className="rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--primary)]"
                  >
                    {t.setup.savingAndPublishing}
                  </p>
                ) : resumeGuestPublish && setupError ? (
                  <ActionButton
                    tone="primary"
                    onClick={() => void resumeGuestDraftPublication()}
                  >
                    {t.setup.retryPublishing}
                  </ActionButton>
                ) : isGuestDraft ? (
                  <>
                    <ActionButton
                      tone="primary"
                      onClick={() => leaveSetupToSurface("public")}
                    >
                      {t.setup.previewPage}
                    </ActionButton>
                    <ActionButton
                      tone="secondary"
                      onClick={() => onRequestPublish?.(activeStore)}
                    >
                      {t.setup.createAccountToPublish}
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <ActionButton
                      tone="primary"
                      onClick={() => leaveSetupToSurface("management")}
                    >
                      {t.setup.goToDashboard}
                    </ActionButton>
                    <ActionLink
                      href={publicUrl}
                      tone="secondary"
                      onClick={() => leaveSetupToSurface("public")}
                    >
                      {t.setup.openPublicPage}
                    </ActionLink>
                  </>
                )}
              </div>
              {isGuestDraft ? (
                <p className="mt-4 rounded-2xl bg-[var(--teal-soft)] px-4 py-3 text-sm font-semibold text-[var(--teal)]">
                  {t.setup.previewNotPublished}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {setupError ? (
          <div className="mt-8 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]">
            {setupError}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          {setupStep === 4 && setupPublished ? <span /> : (
            <ActionButton
              tone="ghost"
              onClick={goToPreviousSetupStep}
              disabled={isPersistingSetup}
            >
              {t.common.back}
            </ActionButton>
          )}
          {setupStep < 4 ? (
            <ActionButton
              tone="primary"
              onClick={goToNextSetupStep}
              disabled={isPersistingSetup}
            >
              {isPersistingSetup ? t.common.saving : t.setup.continueButton}
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
              label: t.admin.upcoming7Days,
              value: String(upcomingBookings.length),
              detail: copy.phrases.bookingsSoonDetail,
            },
            {
              label: copy.Services,
              value: String(services.length),
              detail: copy.phrases.servicesStatDetail,
            },
            {
              label: t.admin.confirmed,
              value: String(bookings.filter((booking) => booking.status === "confirmed").length),
              detail: copy.phrases.activeBookingsDetail,
            },
            {
              label: copy.phrases.totalBookingsLabel,
              value: String(bookings.length),
              detail: t.admin.allTimeEveryStatus,
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
          <SectionTitle title={copy.phrases.upcomingTitle} />
          <div className="mt-6 space-y-3">
              {upcomingBookings.length === 0 ? (
                <EmptyState
                  title={copy.phrases.upcomingEmptyTitle}
                  body={copy.phrases.upcomingEmptyBody}
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
                            {getBookingTypeLabel(booking.bookingType, lang)}
                          </ToneBadge>
                          <ToneBadge tone={statusTone(booking.status)}>
                            {getBookingStatusLabel(booking.status, lang)}
                          </ToneBadge>
                        </div>
                        <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                          {booking.serviceName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {formatDateLabel(booking.dateKey, lang)} ·{" "}
                          {formatTimeRange(booking.startTime, booking.endTime, lang)}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {booking.capacitySnapshot
                            ? `${t.publicFlow.capacity}: ${booking.capacitySnapshot}`
                            : t.admin.capacityNotSet}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {booking.cost ? `${t.publicFlow.total}: ${booking.cost}` : t.admin.totalNotSet}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isServiceSingleOccurrence(booking.serviceId) ? null : (
                          <ActionButton tone="ghost" onClick={() => openReschedule(booking.id)}>
                            {t.publicFlow.reschedule}
                          </ActionButton>
                        )}
                        <ActionButton tone="danger" onClick={() => openCancellation(booking.id)}>
                          {t.common.cancel}
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
        <SectionTitle title={copy.phrases.allBookingsTitle} />
        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={copy.phrases.searchPlaceholder}
            className={cn("min-h-12", adminFieldClass)}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | BookingStatus)}
            className={cn("min-h-12", adminFieldClass)}
          >
            <option value="all">{t.admin.allStatuses}</option>
            <option value="confirmed">{t.admin.confirmed}</option>
            <option value="rescheduled">{t.admin.rescheduled}</option>
            <option value="cancelled">{t.admin.cancelled}</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | BookingType)}
            className={cn("min-h-12", adminFieldClass)}
          >
            <option value="all">{t.admin.allTypes}</option>
            <option value="appointment">{t.admin.appointments}</option>
            <option value="full-day">{getBookingTypeLabel("full-day", lang)}</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {filteredBookings.length === 0 ? (
            <EmptyState
              title={copy.phrases.noBookingsMatchTitle}
              body={t.admin.tryBroaderSearch}
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
                        {getBookingTypeLabel(booking.bookingType, lang)}
                      </ToneBadge>
                      <ToneBadge tone={statusTone(booking.status)}>
                        {getBookingStatusLabel(booking.status, lang)}
                      </ToneBadge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                      {booking.serviceName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {formatDateLabel(booking.dateKey, lang)} ·{" "}
                      {formatTimeRange(booking.startTime, booking.endTime, lang)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                      <span>
                        {booking.clientEmail} · {booking.clientPhone}
                      </span>
                      {booking.capacitySnapshot ? (
                        <span>{t.publicFlow.capacity}: {booking.capacitySnapshot}</span>
                      ) : null}
                      {booking.cost ? <span>{t.publicFlow.total}: {booking.cost}</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {isServiceSingleOccurrence(booking.serviceId) ? null : (
                      <ActionButton
                        tone="ghost"
                        disabled={booking.status === "cancelled"}
                        onClick={() => openReschedule(booking.id)}
                      >
                        {t.publicFlow.reschedule}
                      </ActionButton>
                    )}
                    <ActionButton
                      tone="danger"
                      disabled={booking.status === "cancelled"}
                      onClick={() => openCancellation(booking.id)}
                    >
                      {t.common.cancel}
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
          title={t.admin.monthlyCalendar}
          body={copy.phrases.addBookingHint}
          action={
            services.length > 0 ? (
              <select
                value={activeCalendarService?.id ?? ""}
                onChange={(event) => setCalendarServicePreference(event.target.value)}
                className={cn("min-h-11 text-sm", adminFieldClass)}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {t.admin.newBookingPrefix}: {service.name}
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
              {t.publicFlow.previous}
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              onClick={() => setCalendarMonthAnchor(new Date())}
            >
              {t.publicFlow.today}
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              onClick={() => setCalendarMonthAnchor((current) => shiftMonth(current, 1))}
            >
              {t.publicFlow.next}
            </ActionButton>
          </div>
          <p className="text-base font-semibold text-[var(--ink)]">
            {formatMonthLabel(calendarMonthAnchor, lang)}
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
              {getBookingTypeLabel("appointment", lang)}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--full-day)]" />
              {getBookingTypeLabel("full-day", lang)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          {WEEKDAY_KEYS.map((day) => (
            <p key={day}>{getWeekdayShortFormatter(lang).format(parseDateKey(`2024-03-${pad(WEEKDAY_KEYS.indexOf(day) + 3)}`))}</p>
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
                        <ToneBadge tone="primary">{t.publicFlow.open}</ToneBadge>
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
                              ? getBookingTypeLabel("full-day", lang)
                              : formatTimeLabel(booking.startTime, lang)}
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
        disabled={isSavingAdmin}
        hints={getVerticalPreset(vertical, lang)?.hints}
        copy={copy}
        provider={provider}
        vertical={vertical}
        lang={lang}
      />
    );
  }

  function renderSettings() {
    return (
      <div className="grid items-start gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className={cn(adminPanelClass, "p-6")}>
          <SectionTitle
            title={profileRole?.informationTitle ?? t.admin.providerInformation}
            action={
              integratedMode && persistAdminChanges ? (
                <ActionButton
                  tone="primary"
                  disabled={isSavingAdmin}
                  onClick={() => persistAdminStore(activeStore, t.admin.couldNotSaveSettings)}
                >
                  {isSavingAdmin ? t.common.saving : t.admin.saveChanges}
                </ActionButton>
              ) : undefined
            }
          />
          {adminSaveError ? (
            <div className="mt-4 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]">
              {adminSaveError}
            </div>
          ) : null}
          {adminSaveMessage ? (
            <div className="mt-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#15803d]">
              {adminSaveMessage}
            </div>
          ) : null}
          <div className="mt-6">
            <ProviderInfoForm
              provider={provider}
              onChange={updateProvider}
              disabled={isSavingAdmin}
              lang={lang}
            />
          </div>
          <div className="mt-6 border-t border-[var(--line)] pt-6">
            <LogoImageUploader
              value={provider.logoImageUrl}
              onChange={(url) => updateProvider("logoImageUrl", url)}
              disabled={isSavingAdmin}
              lang={lang}
            />
          </div>
          <LanguageSettingsSection
            lang={lang}
            clientLanguage={provider.language ?? "en"}
            onClientLanguageChange={(next) => updateProvider("language", next)}
            onDashboardLanguageChange={(next) =>
              updateProvider("dashboardLanguage", next)
            }
            disabled={isSavingAdmin}
          />
          <p className="mt-4 text-sm text-[var(--muted)]">
            {fillTemplate(t.admin.publicBookingLinkFor, { booking: copy.booking })}{" "}
            <span className="break-all font-medium text-[var(--ink)]">{publicUrl}</span>
          </p>
          {!integratedMode ? (
            <div className="mt-6">
              <ActionButton tone="danger" onClick={resetStandaloneSetup}>
                {t.admin.resetStandaloneSetup}
              </ActionButton>
            </div>
          ) : null}
        </div>

        <AvailabilitySettingsSection
          vertical={vertical}
          availability={availability}
          onChange={updateAvailabilityDay}
          onManageEvents={() => setAdminTab("services")}
          disabled={isSavingAdmin}
          lang={lang}
        />
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
            {formatMonthLabel(publicMonthAnchor, lang)}
          </p>
          <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2">
            <ActionButton
              tone="ghost"
              className={cn(
                calendarNavPillClass,
                "min-w-0 !px-2 !text-xs sm:flex-none sm:!px-4 sm:!text-sm",
              )}
              disabled={!canGoToPreviousPublicMonth}
              onClick={() => setPublicMonthAnchor((current) => shiftMonth(current, -1))}
            >
              {t.publicFlow.previous}
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={cn(
                calendarNavPillClass,
                "min-w-0 !px-2 !text-xs sm:flex-none sm:!px-4 sm:!text-sm",
              )}
              onClick={() => setPublicMonthAnchor(new Date())}
            >
              {t.publicFlow.today}
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={cn(
                calendarNavPillClass,
                "min-w-0 !px-2 !text-xs sm:flex-none sm:!px-4 sm:!text-sm",
              )}
              onClick={() => setPublicMonthAnchor((current) => shiftMonth(current, 1))}
            >
              {t.publicFlow.next}
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
            {t.publicFlow.onlyRealFreeDatesActive}
          </p>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {bookingFlow.dateKey
              ? formatDateLabel(bookingFlow.dateKey, lang)
              : t.publicFlow.noDateSelectedYet}
          </p>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:gap-2 sm:text-xs sm:tracking-[0.18em]">
          {WEEKDAY_KEYS.map((day) => (
            <p key={day}>{getWeekdayShortFormatter(lang).format(parseDateKey(`2024-03-${pad(WEEKDAY_KEYS.indexOf(day) + 3)}`))}</p>
          ))}
        </div>
        <div className="grid gap-1.5 sm:gap-2">
          {weeks.map((week) => (
            <div key={week[0].toISOString()} className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {week.map((date) => {
                const dateKey = getDateKey(date);
                const inMonth = date.getMonth() === publicMonthAnchor.getMonth();
                const dayAvailability = selectedService
                  ? getDayAvailability(
                      dateKey,
                      selectedService,
                      availability,
                      bookings,
                      flowIgnoredBookingId,
                      activeBookingHolds,
                      bookingHold?.released ? undefined : bookingHold?.id,
                    )
                  : null;
                const level: DayAvailabilityLevel = dayAvailability?.level ?? "closed";
                const available = level === "open" || level === "tight";
                const chosen = bookingFlow.dateKey === dateKey;
                const isToday = dateKey === todayKey();
                const availabilityLabel =
                  level === "open"
                    ? t.publicFlow.availabilityOpen
                    : level === "tight"
                      ? t.publicFlow.availabilityTight
                      : level === "full"
                        ? t.publicFlow.availabilityFull
                        : t.publicFlow.availabilityClosed;
                // A tinted day owns its surface; an untinted one keeps the
                // default. Each utility is emitted exactly once across the two
                // slots, so nothing depends on stylesheet ordering.
                const daySurfaceClass = available
                  ? cn(
                      DAY_AVAILABILITY_BG[level],
                      isDedicatedPublicPage
                        ? "shadow-[0_12px_30px_rgba(25,28,29,0.04)]"
                        : "border border-[var(--line)]",
                    )
                  : inMonth
                    ? publicQuietChoiceClass
                    : publicSoftChoiceClass;
                // Only a bookable day can be chosen, so the accent ring never
                // has to compete with the default surface's own ring.
                const dayEdgeClass = chosen
                  ? "ring-2 ring-[var(--accent)]"
                  : DAY_AVAILABILITY_EDGE[level];

                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={!selectedService || !available}
                    onClick={() => {
                      setBookingError(null);
                      const previousDateKey = bookingFlow.dateKey;
                      dispatchBookingFlow({ type: "SELECT_DATE", dateKey });
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
                    aria-label={`${formatDateLabel(dateKey, lang)}, ${availabilityLabel}`}
                    className={cn(
                      "flex aspect-square min-h-0 flex-col items-center justify-center gap-1 rounded-2xl p-1.5 text-center transition sm:aspect-auto sm:min-h-[88px] sm:items-stretch sm:justify-start sm:rounded-[24px] sm:p-3 sm:text-left md:min-h-[104px]",
                      daySurfaceClass,
                      dayEdgeClass,
                      available &&
                        !chosen &&
                        (isDedicatedPublicPage
                          ? "hover:ring-2"
                          : "hover:border-[var(--accent)]"),
                      !available && "cursor-default",
                      level === "full" && "opacity-70",
                      level === "closed" && "opacity-50",
                    )}
                  >
                    <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <span
                        className={cn(
                          "relative text-base font-semibold sm:text-sm",
                          level === "full" || level === "closed"
                            ? "text-[var(--muted)]"
                            : "text-[var(--ink)]",
                        )}
                      >
                        {date.getDate()}
                        {level === "full" ? <DayNumberStrike /> : null}
                      </span>
                      {isToday ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)] sm:hidden" />
                          <span
                            className={cn(
                              "hidden shrink-0 rounded-full bg-[var(--surface-soft)] px-1.5 py-0.5 text-[var(--muted)] sm:inline",
                              compactBadgeTextClass,
                            )}
                          >
                            {t.publicFlow.today}
                          </span>
                        </>
                      ) : null}
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

    // Public-page branding shown above the selection. The logo stays beside
    // the page title, while the optional hero text overlays the banner image.
    const heroText = (provider.heroText?.trim() || provider.businessName || "").trim();
    // The dedicated page carries the band at the shell's top edge; the embedded
    // surface has no such edge, so it gets the same band above the banner.
    const publicPageTitle = isDedicatedPublicPage ? null : (
      <PublicBookingHeader
        businessName={provider.businessName}
        serviceName={selectedService?.name}
        logoImageUrl={provider.logoImageUrl}
        logoAltFallback={eventOrganizerRole?.logoAlt}
        copy={copy}
        providerTimeZone={providerTimeZone}
        isAdvancing={isPublicFlowFadingOut || isCreatingHold}
        errorMessage={bookingError}
        languageChooser={renderPublicLanguageChooser("", "inset")}
        lang={lang}
      />
    );
    const headerBanner = publicPageTitle || provider.headerImageUrl ? (
      <div className="space-y-4">
        {publicPageTitle}
        {provider.headerImageUrl ? (
          <div className="relative overflow-hidden rounded-[28px] ring-1 ring-[rgba(255,255,255,0.7)] shadow-[0_22px_56px_rgba(15,23,42,0.10)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote Blob URL */}
            <img
              src={provider.headerImageUrl}
              alt={
                provider.businessName
                  ? `${provider.businessName} — ${t.publicFlow.headerBannerAlt}`
                  : t.publicFlow.headerBannerAlt
              }
              className="aspect-[3/1] w-full object-cover"
            />
            {heroText ? (
              <>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.62),rgba(0,0,0,0.12)_46%,transparent_72%)]"
                />
                <h2 className="absolute inset-x-0 bottom-0 p-5 text-2xl font-semibold tracking-[-0.02em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] sm:p-7 sm:text-3xl">
                  {heroText}
                </h2>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    ) : null;
    // Collapse the progress indicator either when the selection step is stuck
    // (scroll-driven) or whenever we enter the confirmation screen — the
    // steps are no longer actionable there, so they just take up space.
    const collapseProgressIndicator = isStickyHeaderActive;

    const selectionIsSingle = Boolean(
      selectedService && isSingleOccurrence(selectedService),
    );
    // Changing the time from the details step keeps the form; saying so is what
    // makes people willing to do it.
    const hasPartialClientDetails = Boolean(
      bookingFlow.clientName.trim() ||
        bookingFlow.clientEmail.trim() ||
        bookingFlow.clientPhone.trim() ||
        bookingFlow.notes.trim(),
    );
    const selectionIsEvent = vertical === "events";
    // Per-location pricing: the service's locations + the effective price/address
    // for the current selection.
    const selectionLocations = selectedService
      ? getServiceLocations(selectedService, provider)
      : [];
    const selectedLocation =
      selectionLocations.find((loc) => loc.key === bookingFlow.locationKey) ??
      selectionLocations[0];
    const effectiveCost = selectedService
      ? getEffectiveCost(selectedService, bookingFlow.locationKey)
      : "";
    // Single + weekly events have a fixed start/end window to show under "When".
    const selectionWindowLabel =
      selectedService?.startTime && selectedService?.endTime &&
      (isSingleOccurrence(selectedService) || isWeeklyOccurrence(selectedService))
        ? `${formatTimeLabel(selectedService.startTime, lang)}–${formatTimeLabel(selectedService.endTime, lang)}`
        : "";
    const singleSpotsLeft =
      selectionIsSingle && selectedService
        ? getSpotsLeft(
            selectedService,
            selectedService.occurrenceDate ?? "",
            bookings,
            undefined,
            activeBookingHolds,
            bookingHold?.released ? undefined : bookingHold?.id,
          )
        : Infinity;
    const singleIsFull = selectionIsSingle && singleSpotsLeft <= 0;
    const singleWindowLabel =
      selectedService?.startTime
        ? `${formatTimeLabel(selectedService.startTime, lang)}${
            selectedService.endTime ? `–${formatTimeLabel(selectedService.endTime, lang)}` : ""
          }`
        : "";
    const singleDateLabel = selectedService?.occurrenceDate
      ? `${formatDateLabel(selectedService.occurrenceDate, lang)}${
          singleWindowLabel ? ` · ${singleWindowLabel}` : ""
        }`
      : t.publicFlow.dateNotSet;
    const spotsLeftLabel = Number.isFinite(singleSpotsLeft)
      ? `${Math.max(0, singleSpotsLeft)} ${copy.phrases.spotsLeftSuffix}`
      : "";

    // Remaining spots for the chosen date on weekly/periodic (calendar) events.
    const selectionDateSpotsLeft =
      selectedService && bookingFlow.dateKey && !selectionIsSingle
        ? getSpotsLeft(
            selectedService,
            bookingFlow.dateKey,
            bookings,
            flowIgnoredBookingId,
            activeBookingHolds,
            bookingHold?.released ? undefined : bookingHold?.id,
          )
        : Infinity;
    const selectionDateSpotsLabel = Number.isFinite(selectionDateSpotsLeft)
      ? `${Math.max(0, selectionDateSpotsLeft)} ${copy.phrases.spotsLeftSuffix}`
      : "";

    const step2IsAppointment =
      !selectionIsSingle && selectedService?.bookingType === "appointment";
    const step2DateChosen = Boolean(bookingFlow.dateKey);
    const step2TimeChosen = Boolean(bookingFlow.time);
    const step2DateAvailableForFullDay =
      !step2IsAppointment &&
      !selectionIsSingle &&
      step2DateChosen &&
      Boolean(selectedService) &&
      isDateAvailable(
        bookingFlow.dateKey,
        selectedService!,
        availability,
        bookings,
        flowIgnoredBookingId,
        activeBookingHolds,
        bookingHold?.released ? undefined : bookingHold?.id,
      );
    const step2CanContinue = selectionIsSingle
      ? step2DateChosen && !singleIsFull
      : step2IsAppointment
        ? step2DateChosen && step2TimeChosen
        : step2DateChosen && step2DateAvailableForFullDay;
    const step2Summary = selectionIsSingle
      ? singleDateLabel
      : step2IsAppointment
        ? step2DateChosen && step2TimeChosen
          ? `${formatDateLabel(bookingFlow.dateKey, lang)} · ${formatTimeLabel(bookingFlow.time, lang)}`
          : step2DateChosen
            ? formatDateLabel(bookingFlow.dateKey, lang)
            : t.publicFlow.selectADay
        : step2DateChosen
          ? `${formatDateLabel(bookingFlow.dateKey, lang)} · ${t.publicFlow.fullDay}`
          : t.publicFlow.selectADay;
    const step2Helper = selectionIsSingle
      ? singleIsFull
        ? copy.phrases.fullyBookedLabel
        : copy.phrases.singleOccurrenceHelper
      : step2IsAppointment
        ? !step2DateChosen
          ? t.publicFlow.pickDateAndTimeHelper
          : !step2TimeChosen
            ? t.publicFlow.pickTimeHelper
            : t.publicFlow.clickToEnterDetails
        : !step2DateChosen
          ? t.publicFlow.pickDateFullDayHelper
          : step2DateAvailableForFullDay
            ? t.publicFlow.dayFreeHelper
            : t.publicFlow.dayUnavailablePickAnother;
    const step2ButtonLabel = isManageRescheduling
      ? isMutatingBooking
        ? t.common.loading
        : t.manage.saveNewTime
      : selectionIsSingle
        ? singleIsFull
          ? copy.phrases.fullyBookedLabel
          : copy.bookVerb === "register"
            ? t.publicFlow.reserveMySpot
            : t.publicFlow.continueToMyDetails
        : step2IsAppointment
          ? !step2DateChosen
            ? t.publicFlow.selectADate
            : !step2TimeChosen
              ? t.publicFlow.selectATime
              : t.publicFlow.continueToMyDetails
          : copy.bookFullDay;

    const advanceToDetailsStep = () => {
      if (!step2CanContinue || isCreatingHold) {
        return;
      }

      // Full-day / single-occurrence reschedules commit on this button, the way
      // appointment reschedules commit on the slot tap.
      if (isManageRescheduling && successfulBooking) {
        void confirmReschedule({
          bookingId: successfulBooking.id,
          dateKey: bookingFlow.dateKey,
          time: bookingFlow.time,
        });
        return;
      }

      const fadeAndAdvance = () => {
        setIsPublicFlowFadingOut(true);
        window.setTimeout(() => {
          void beginClientDetailsStep().finally(() => {
            window.requestAnimationFrame(() => {
              setIsPublicFlowFadingOut(false);
            });
          });
        }, 220);
      };
      if (typeof window === "undefined" || window.scrollY <= 0) {
        if (typeof window === "undefined") {
          void beginClientDetailsStep();
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

    // Both back paths release the hold first; the machine decides what survives
    // (BACK from details keeps the service and the date, BACK from the calendar
    // is the only place the service is dropped).
    const releaseHoldForNavigation = () => {
      const holdIdToRelease = bookingHold?.released ? undefined : bookingHold?.id;
      actions.releaseBookingHold(holdIdToRelease);
      releaseSupabaseBookingHold(holdIdToRelease);
      setBookingHold(null);
      setBookingHoldClockOffsetMs(0);
      setBookingHoldNow(currentTimestamp());
      setHoldExtensionMessage(null);
      setBookingError(null);
      setPendingHoldTime(null);
    };

    const goBackToSelectionStep = () => {
      releaseHoldForNavigation();
      dispatchBookingFlow({ type: "BACK" });
    };

    const goBackToServiceChoice = () => {
      releaseHoldForNavigation();
      dispatchBookingFlow({ type: "RESTART" });
    };

    return (
      <div
        className={cn(
          "transition-opacity duration-300 ease-out",
          isPublicFlowFadingOut ? "opacity-0" : "opacity-100",
        )}
      >
        {(isPublicSelectionStep || isPublicDetailsStep) && selectedService ? (
          <>
            <div ref={attachStickyHeaderSentinel} aria-hidden="true" className="h-px" />
            <div
              ref={stickyHeaderRef}
              className={cn(
                "relative px-4 pt-4 sm:px-8 sm:pt-8 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[32px] sm:before:rounded-[56px] xl:before:rounded-[60px] before:bg-[linear-gradient(135deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08))] before:opacity-0 before:[backdrop-filter:blur(24px)_saturate(160%)] before:[-webkit-backdrop-filter:blur(24px)_saturate(160%)] before:ring-1 before:ring-inset before:ring-white/40 before:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(15,23,42,0.08),0_14px_34px_rgba(15,23,42,0.12)] before:transition-opacity before:duration-300 before:ease-out",
                isPublicSelectionStep && "sticky top-0 z-30",
                isDedicatedPublicPage && "xl:px-10 xl:pt-10",
                isStickyHeaderActive &&
                  "pb-6 before:opacity-100 sm:pb-8 xl:pb-10",
              )}
            >
            {/* Progress never leaves the screen: the full indicator collapses into
                a slim bar once the header sticks, instead of disappearing. */}
            <div className={cn("relative z-10", stickyBarPanelClass)}>
              <div
                aria-hidden={collapseProgressIndicator ? true : undefined}
                style={{ willChange: "grid-template-rows, opacity" }}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                  collapseProgressIndicator ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-5 py-5 sm:px-7 sm:py-6">
                    <PublicProgressIndicator
                      currentStep={resolvedBookingFlow.step as 2 | 3 | 4}
                      isDedicatedPublicPage={isDedicatedPublicPage}
                      lang={lang}
                    />
                  </div>
                </div>
              </div>
              {collapseProgressIndicator ? (
                <div className="px-5 py-3 sm:px-7">
                  <PublicProgressIndicator
                    compact
                    currentStep={resolvedBookingFlow.step as 2 | 3 | 4}
                    isDedicatedPublicPage={isDedicatedPublicPage}
                    lang={lang}
                  />
                </div>
              ) : null}
              {isPublicDetailsStep ? (
                <div className="px-5 pb-5 sm:px-7 sm:pb-6">
                  <BookingHoldCountdownBar
                    isExpired={isBookingHoldExpired}
                    remainingMs={bookingHoldRemainingMs}
                    remainingRatio={bookingHoldRemainingRatio}
                    helperDesktopHidden
                    isOnline={!integratedMode || isNetworkOnline}
                    canExtend={shouldOfferHoldExtension}
                    isExtending={isExtendingHold}
                    extensionUsed={
                      isBookingHoldWarning(bookingHoldRemainingMs) &&
                      (bookingHold?.extensionCount ?? 0) > 0
                    }
                    extensionMessage={holdExtensionMessage}
                    onExtend={() => void extendCurrentBookingHold()}
                    copy={copy}
                    lang={lang}
                  />
                </div>
              ) : null}
              {isPublicSelectionStep ? (
                <>
                  <div className="h-px bg-[rgba(15,23,42,0.06)]" aria-hidden="true" />
                  {/* Rescheduling keeps the service fixed, so the step explains
                      what is being moved and what happens if they change their
                      mind — the current booking is never touched until save. */}
                  {isManageRescheduling && successfulBooking ? (
                    <div className="px-5 pt-4 sm:px-7 sm:pt-5">
                      <div className="rounded-[22px] border border-[rgba(26,115,232,0.18)] bg-[rgba(26,115,232,0.06)] px-4 py-3.5">
                        <p className="text-[0.9375rem] font-semibold text-[var(--ink)]">
                          {t.manage.reschedulingTitle}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                          {t.manage.reschedulingBody}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[var(--accent-strong)]">
                          {t.manage.currentlyBooked}:{" "}
                          {formatDateLabel(successfulBooking.dateKey, lang)} ·{" "}
                          {formatTimeRange(
                            successfulBooking.startTime,
                            successfulBooking.endTime,
                            lang,
                          )}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-6 sm:pt-5">
                    <div
                      className={cn(
                        "flex flex-col gap-4",
                        hasMultipleServices || isManageRescheduling
                          ? "lg:flex-row lg:items-center lg:gap-4"
                          : "lg:flex-row lg:items-center lg:justify-between",
                      )}
                    >
                      {isManageRescheduling ? (
                        <div className="lg:flex lg:flex-1 lg:justify-start">
                          <button
                            type="button"
                            onClick={cancelManageReschedule}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[rgba(248,249,250,0.78)] px-3.5 text-[0.8125rem] font-semibold text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.42)] transition hover:bg-white hover:ring-[var(--accent)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                              <path
                                d="M15 6l-6 6 6 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                              />
                            </svg>
                            {t.manage.keepCurrentTime}
                          </button>
                        </div>
                      ) : hasMultipleServices ? (
                        <div className="lg:flex lg:flex-1 lg:justify-start">
                          <button
                            type="button"
                            onClick={goBackToServiceChoice}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[rgba(248,249,250,0.78)] px-3.5 text-[0.8125rem] font-semibold text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.42)] transition hover:bg-white hover:ring-[var(--accent)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                              <path
                                d="M15 6l-6 6 6 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                              />
                            </svg>
                            {copy.phrases.chooseAnotherService}
                          </button>
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "min-w-0",
                          hasMultipleServices && "text-center lg:flex-1",
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            {t.publicFlow.selectedDate}
                          </p>
                          <p className="text-[0.9375rem] font-semibold text-[var(--ink)]">
                            {step2Summary}
                          </p>
                        </div>
                        <p className="mt-1 text-[0.9375rem] leading-6 text-[var(--muted)]">
                          {step2Helper}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "hidden w-full flex-wrap items-center gap-3 lg:flex lg:w-auto",
                          hasMultipleServices ? "lg:flex-1 lg:justify-end" : "justify-end",
                        )}
                      >
                        <ActionButton
                          tone="primary"
                          className={cn("min-w-[150px] px-6 !text-[0.9375rem]", publicPrimaryActionClass)}
                          disabled={!step2CanContinue || isCreatingHold}
                          onClick={advanceToDetailsStep}
                        >
                          {isCreatingHold ? t.common.loading : step2ButtonLabel}
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
                      {/* Expiry is already explained in the panel above; the row
                          only needs to carry the two ways out. */}
                      <p className="min-w-0 flex-1 text-[0.9375rem] leading-6 text-[var(--muted)]">
                        {isBookingHoldExpired ? "" : t.publicFlow.finishBeforeHoldExpires}
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
                          {isBookingHoldExpired ? t.public.chooseAnotherTime : t.public.holdChangeTime}
                        </ActionButton>
                        <ActionButton
                          tone="primary"
                          className={cn("min-w-[150px] px-6 !text-[0.9375rem]", publicPrimaryActionClass)}
                          disabled={
                            isConfirmingBooking ||
                            isCreatingHold ||
                            (integratedMode && !isNetworkOnline)
                          }
                          onClick={
                            isBookingHoldExpired
                              ? () => void retryExpiredBookingHold()
                              : confirmBooking
                          }
                        >
                          {integratedMode && !isNetworkOnline
                            ? t.public.onlineRequired
                            : isBookingHoldExpired
                              ? isCreatingHold
                                ? t.public.holdingAgain
                                : t.public.holdAgain
                              : t.publicFlow.confirm}
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
            {headerBanner}
            <div className="relative isolate overflow-hidden rounded-[28px] bg-[rgba(255,255,255,0.62)] px-6 py-6 ring-1 ring-[rgba(255,255,255,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_22px_56px_rgba(15,23,42,0.10)] backdrop-blur-[22px] sm:px-8 sm:py-7">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_center,rgba(26,115,232,0.28),transparent_65%)] blur-2xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -left-20 bottom-[-3rem] h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(104,250,221,0.32),transparent_65%)] blur-2xl"
              />
              <div className="relative min-w-0">
                <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-[1.75rem]">
                  {copy.phrases.chooseServiceTitle}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-[0.9375rem]">
                  {services.length === 1
                    ? copy.phrases.onlyOneServiceBody
                    : copy.phrases.chooseServiceBody}
                </p>
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setBookingFlow((current) => ({
                      ...current,
                      serviceId: service.id,
                      dateKey: "",
                      time: "",
                      step: 2,
                    }));
                  }}
                  className={cn(
                    // flex-col + h-full keeps content top-aligned and fills the
                    // stretched grid cell, so titles line up across cards
                    // regardless of how much info each one has (buttons
                    // vertically center their content by default).
                    "flex h-full flex-col rounded-[30px] p-6 text-left transition",
                    isDedicatedPublicPage
                      ? "bg-[rgba(248,249,250,0.94)] ring-1 ring-[rgba(255,255,255,0.68)] shadow-[0_18px_42px_rgba(25,28,29,0.06)] hover:translate-y-[-2px] hover:bg-[rgba(255,255,255,0.9)]"
                      : "border border-[var(--line)] bg-white hover:border-[var(--accent)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-semibold text-[var(--ink)]">{service.name}</h4>
                    <ToneBadge tone={vertical === "events" ? "secondary" : bookingTypeTone(service.bookingType)}>
                      {vertical === "events"
                        ? getOccurrenceModeLabel(service.occurrenceMode, lang)
                        : getBookingTypeLabel(service.bookingType, lang)}
                    </ToneBadge>
                    <ToneBadge tone="neutral">{formatDuration(service, lang)}</ToneBadge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {service.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                    {vertical === "events" &&
                    service.occurrenceMode === "single" &&
                    service.occurrenceDate ? (
                      <span>
                        {t.publicFlow.when}: {formatDateLabel(service.occurrenceDate, lang)} ·{" "}
                        {formatTimeRange(service.startTime, service.endTime, lang)}
                      </span>
                    ) : null}
                    {vertical === "events" ? (
                      <span>{t.publicFlow.capacity}: {formatCapacityLabel(service, lang)}</span>
                    ) : service.capacity ? (
                      <span>{t.publicFlow.capacity}: {service.capacity}</span>
                    ) : null}
                    {service.medicalSpecialty ? (
                      <span>{t.publicFlow.specialty}: {service.medicalSpecialty}</span>
                    ) : null}
                    {service.cost ? <span>{t.publicFlow.total}: {service.cost}</span> : null}
                    {service.notes ? <span>{t.publicFlow.notes}: {service.notes}</span> : null}
                  </div>
                  {(() => {
                    const cardAddresses = [
                      service.linkedAddress1 ? provider.address1 : "",
                      service.linkedAddress2 ? provider.address2 : "",
                      service.customAddress ?? "",
                    ].filter((entry) => entry && entry.trim().length > 0);
                    const cardPhones = [
                      service.linkedPhone1 ? provider.phoneNumber1 : "",
                      service.linkedPhone2 ? provider.phoneNumber2 : "",
                      service.customPhone ?? "",
                    ].filter((entry) => entry && entry.trim().length > 0);
                    if (cardAddresses.length === 0 && cardPhones.length === 0) {
                      return null;
                    }
                    return (
                      <div className="mt-4 flex flex-col gap-1.5 border-t border-[rgba(193,198,214,0.32)] pt-3 text-sm text-[var(--muted)]">
                        {cardAddresses.map((entry) => (
                          <span key={`addr-${entry}`} className="inline-flex items-start gap-2">
                            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-strong)]" aria-hidden>
                              <path
                                d="M12 22s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
                                fill="currentColor"
                              />
                            </svg>
                            <span>{entry}</span>
                          </span>
                        ))}
                        {cardPhones.map((entry) => (
                          <span key={`phone-${entry}`} className="inline-flex items-center gap-2 font-medium text-[var(--ink)]">
                            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[var(--accent-strong)]" aria-hidden>
                              <path
                                d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.5 11.5 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A18 18 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.5 11.5 0 0 0 .57 3.6 1 1 0 0 1-.25 1z"
                                fill="currentColor"
                              />
                            </svg>
                            <span>{entry}</span>
                          </span>
                        ))}
                      </div>
                    );
                  })()}
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
                : isPublicDetailsStep
                  ? "lg:grid-cols-3"
                  : undefined,
            )}
          >
            {isPublicSelectionStep && !hasMultipleServices && headerBanner ? (
              <div className="lg:col-span-2">{headerBanner}</div>
            ) : null}
            {isPublicSelectionStep && selectionLocations.length >= 2 ? (
              <div className={cn("lg:col-span-2", publicElevatedPanelClass)}>
                <SectionTitle title={t.publicFlow.chooseLocation} />
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {selectionLocations.map((loc) => {
                    const active = loc.key === bookingFlow.locationKey;
                    return (
                      <button
                        key={loc.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setBookingFlow((current) => ({ ...current, locationKey: loc.key }))
                        }
                        className={cn(
                          "flex flex-col gap-1 rounded-2xl px-4 py-3 text-left transition",
                          active
                            ? "bg-[var(--accent-soft)] text-[var(--ink)] ring-2 ring-[var(--accent)]"
                            : "bg-white text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.45)] hover:ring-[var(--accent)]/50",
                        )}
                      >
                        <span className="text-sm font-medium">{loc.address}</span>
                        {loc.price ? (
                          <span className="text-sm font-semibold text-[var(--accent-strong)]">
                            {loc.price}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {!isPublicSuccessStep ? (
            <div
              ref={publicPrimaryPanelRef}
              className={cn(
                "order-1 lg:order-none",
                publicPrimaryPanelClass,
              )}
              style={
                isDesktopColumns && isPublicDetailsStep && publicPrimaryPanelHeight
                  ? { minHeight: `${publicPrimaryPanelHeight}px` }
                  : undefined
              }
            >
              {isPublicSelectionStep && selectionIsSingle ? (
                <>
                  <SectionTitle title={copy.phrases.eventDateLabel} />
                  <div className={cn("mt-6", publicInsetCardClass)}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {copy.phrases.eventDateLabel}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                      {singleDateLabel}
                    </p>
                    {spotsLeftLabel ? (
                      <p
                        className={cn(
                          "mt-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
                          singleIsFull
                            ? "bg-[#fff1f2] text-[#be123c]"
                            : "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
                        )}
                      >
                        {singleIsFull ? copy.phrases.fullyBookedLabel : spotsLeftLabel}
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {copy.phrases.singleOccurrenceHelper}
                    </p>
                  </div>
                </>
              ) : isPublicSelectionStep ? (
                <>
                  <SectionTitle
                    title={t.publicFlow.pickDateAndTime}
                  />
                  <div className="mt-6">{renderPublicCalendar()}</div>
                </>
              ) : isPublicDetailsStep ? (
                <>
                  <SectionTitle
                    title={t.publicFlow.myDetails}
                  />
                  <div className="mt-6">
                    <div className="grid gap-4">
                      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                        <span className={cn("text-[var(--muted)]", compactMetaTextClass)}>
                          {t.publicFlow.fullName}
                        </span>
                        <input
                          value={bookingFlow.clientName}
                          onChange={(event) => updateBookingFlow("clientName", event.target.value)}
                          placeholder={t.publicFlow.namePlaceholder}
                          className={publicFieldClass}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                        <span className={cn("text-[var(--muted)]", compactMetaTextClass)}>
                          {t.publicFlow.email}
                        </span>
                        <input
                          value={bookingFlow.clientEmail}
                          onChange={(event) => updateBookingFlow("clientEmail", event.target.value)}
                          placeholder={t.publicFlow.emailPlaceholder}
                          type="email"
                          className={publicFieldClass}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                        <span className={cn("text-[var(--muted)]", compactMetaTextClass)}>
                          {t.publicFlow.phoneNumber}
                        </span>
                        <input
                          value={bookingFlow.clientPhone}
                          onChange={(event) => updateBookingFlow("clientPhone", event.target.value)}
                          placeholder={t.publicFlow.phonePlaceholder}
                          className={publicFieldClass}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                        <span className={cn("text-[var(--muted)]", compactMetaTextClass)}>
                          {t.publicFlow.notes}
                        </span>
                        <textarea
                          value={bookingFlow.notes}
                          onChange={(event) => updateBookingFlow("notes", event.target.value)}
                          placeholder={copy.phrases.notesPlaceholder}
                          rows={4}
                          className={publicTextareaClass}
                        />
                      </label>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            ) : null}

            {isPublicDetailsStep ? (
              <div
                ref={publicAboutPanelRef}
                className={cn(
                  "order-3 lg:order-none self-start flex flex-col",
                  publicSoftPanelClass,
                )}
                style={
                  isDesktopColumns && publicPrimaryPanelHeight
                    ? { minHeight: `${publicPrimaryPanelHeight}px` }
                    : undefined
                }
              >
                <SectionTitle title={selectionIsEvent ? copy.phrases.aboutServiceTitle : t.publicFlow.aboutTheAppointment} />
                <div className={cn("mt-6 min-h-0 flex-1", publicInsetCardClass)}>
                  {(() => {
                      // When the service has multiple priced locations, show only
                      // the one the booker chose; otherwise list all linked ones.
                      const aboutAddresses =
                        selectionLocations.length >= 2 && selectedLocation
                          ? [selectedLocation.address]
                          : [
                              selectedService.linkedAddress1 ? provider.address1 : "",
                              selectedService.linkedAddress2 ? provider.address2 : "",
                              selectedService.customAddress ?? "",
                            ].filter((entry) => entry && entry.trim().length > 0);
                      const aboutPhones = [
                        selectedService.linkedPhone1 ? provider.phoneNumber1 : "",
                        selectedService.linkedPhone2 ? provider.phoneNumber2 : "",
                        selectedService.customPhone ?? "",
                      ].filter((entry) => entry && entry.trim().length > 0);
                      return (
                        <dl className="grid gap-4">
                          <SummaryField label={copy.phrases.typeOfServiceLabel} value={selectedService.name} />
                          {selectedService.description ? (
                            <SummaryField label={t.publicFlow.description} value={selectedService.description} />
                          ) : null}
                          {selectionIsSingle ? (
                            <SummaryField label={t.publicFlow.when} value={singleDateLabel} />
                          ) : selectionIsEvent ? null : (
                            <SummaryField
                              label={t.publicFlow.type}
                              value={getBookingTypeLabel(selectedService.bookingType, lang)}
                            />
                          )}
                          {selectedService.medicalSpecialty ? (
                            <SummaryField
                              label={t.publicFlow.specialty}
                              value={selectedService.medicalSpecialty}
                            />
                          ) : null}
                          <SummaryField label={t.publicFlow.capacity} value={formatCapacityLabel(selectedService, lang)} />
                          {!selectionIsSingle ? (
                            <SummaryField label={t.publicFlow.length} value={formatDuration(selectedService, lang)} />
                          ) : null}
                          <SummaryField label={t.publicFlow.total} value={effectiveCost || t.publicFlow.notSet} />
                          {selectedService.notes ? (
                            <SummaryField label={t.publicFlow.notes} value={selectedService.notes} />
                          ) : null}
                          {aboutAddresses.length > 0 ? (
                            <SummaryField
                              label={aboutAddresses.length > 1 ? t.publicFlow.locations : t.publicFlow.location}
                              value={
                                <div className="flex flex-col gap-1.5">
                                  {aboutAddresses.map((entry) => (
                                    <span key={`about-addr-${entry}`} className="inline-flex items-start gap-2">
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-strong)]"
                                        aria-hidden
                                      >
                                        <path
                                          d="M12 22s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
                                          fill="currentColor"
                                        />
                                      </svg>
                                      <span className="min-w-0 break-words">{entry}</span>
                                    </span>
                                  ))}
                                </div>
                              }
                            />
                          ) : null}
                          {aboutPhones.length > 0 ? (
                            <SummaryField
                              label={aboutPhones.length > 1 ? t.publicFlow.phones : t.publicFlow.phone}
                              value={
                                <div className="flex flex-col gap-1.5">
                                  {aboutPhones.map((entry) => (
                                    <span key={`about-phone-${entry}`} className="inline-flex items-center gap-2">
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4 shrink-0 text-[var(--accent-strong)]"
                                        aria-hidden
                                      >
                                        <path
                                          d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.5 11.5 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A18 18 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.5 11.5 0 0 0 .57 3.6 1 1 0 0 1-.25 1z"
                                          fill="currentColor"
                                        />
                                      </svg>
                                      <span className="min-w-0 break-words">{entry}</span>
                                    </span>
                                  ))}
                                </div>
                              }
                            />
                          ) : null}
                        </dl>
                      );
                  })()}
                </div>
              </div>
            ) : null}

            {!isPublicSuccessStep ? (
            <div
              ref={publicSummaryPanelRef}
              className={cn(
                "order-2 lg:order-none self-start",
                publicElevatedPanelClass,
                isPublicSelectionStep &&
                  step2IsAppointment &&
                  bookingFlow.dateKey &&
                  "flex flex-col overflow-hidden",
                isPublicDetailsStep && "flex flex-col",
              )}
              style={
                isDesktopColumns &&
                isPublicSelectionStep &&
                step2IsAppointment &&
                bookingFlow.dateKey &&
                publicPrimaryPanelHeight
                  ? {
                      height: `${publicPrimaryPanelHeight}px`,
                      maxHeight: `${publicPrimaryPanelHeight}px`,
                    }
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
                      selectionIsSingle
                        ? copy.bookingSummary
                        : step2IsAppointment
                          ? t.publicFlow.availableTimeSlots
                          : t.publicFlow.fullDayReservation
                    }
                    body={
                      selectionIsSingle
                        ? singleDateLabel
                        : bookingFlow.dateKey
                          ? `${formatDateLabel(bookingFlow.dateKey, lang)}${
                              selectionDateSpotsLabel ? ` · ${selectionDateSpotsLabel}` : ""
                            }`
                          : t.publicFlow.selectHighlightedDateFirst
                    }
                  />
                  {selectedService.description ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {selectedService.description}
                    </p>
                  ) : null}
                  {/* Why the visitor is back on this step: an expired hold, or a
                      slot someone else confirmed first. */}
                  {flowNotice ? (
                    <div
                      ref={flowNoticeRef}
                      role="status"
                      aria-live="polite"
                      className="mt-5 rounded-[22px] border border-[#fcd34d] bg-[#fffbeb] px-4 py-3.5 text-[#92400e]"
                    >
                      <p className="text-[0.9375rem] font-semibold">
                        {flowNotice === "hold-expired"
                          ? t.publicFlow.holdExpiredNoticeTitle
                          : t.publicFlow.conflictNoticeTitle}
                      </p>
                      <p className="mt-1 text-sm leading-5">
                        {flowNotice === "hold-expired"
                          ? t.publicFlow.holdExpiredNoticeBody
                          : t.publicFlow.conflictNoticeBody}
                      </p>
                    </div>
                  ) : null}
                  {hasPartialClientDetails && !isManageRescheduling ? (
                    <div
                      role="status"
                      className="mt-5 rounded-[22px] border border-[rgba(0,191,165,0.28)] bg-[rgba(104,250,221,0.14)] px-4 py-3.5 text-[var(--ink)]"
                    >
                      <p className="text-[0.9375rem] font-semibold">
                        {t.publicFlow.detailsKeptNoticeTitle}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                        {t.publicFlow.detailsKeptNoticeBody}
                      </p>
                    </div>
                  ) : null}
                  {selectionIsSingle ? (
                    <div className="mt-6 space-y-4">
                      <div className={publicInsetCardClass}>
                        <p className="text-sm font-medium text-[var(--muted)]">
                          {singleIsFull
                            ? copy.phrases.fullyBookedLabel
                            : copy.phrases.singleOccurrenceHelper}
                        </p>
                        {spotsLeftLabel && !singleIsFull ? (
                          <p className="mt-2 text-sm font-semibold text-[var(--accent-strong)]">
                            {spotsLeftLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : !bookingFlow.dateKey ? (
                    <div className="mt-6">
                      <EmptyState
                        title={t.publicFlow.chooseADate}
                        body={t.publicFlow.chooseDateBody}
                      />
                    </div>
                  ) : step2IsAppointment ? (
                    <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4">
                      {publicSlots.length === 0 ? (
                        <div className="min-h-0 flex-1">
                          <EmptyState
                            title={t.publicFlow.noSlotsLeft}
                            body={t.publicFlow.noSlotsLeftBody}
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
                              const isHolding = pendingHoldTime === slot;

                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  disabled={isCreatingHold && !isHolding}
                                  aria-busy={isHolding || undefined}
                                  onClick={() => selectTimeSlot(slot)}
                                  className={cn(
                                    // Column on phones so the time never wraps
                                    // mid-label in a two-up grid.
                                    "relative flex min-h-16 w-full flex-col items-start gap-1 rounded-[24px] px-4 py-4 text-left transition disabled:opacity-60 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5",
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
                                  <div className="pl-3 sm:pl-4">
                                    <p className="whitespace-nowrap text-lg font-semibold text-[var(--ink)] sm:text-base">
                                      {formatTimeLabel(slot, lang)}
                                    </p>
                                    <p
                                      className={cn(
                                        "mt-1 whitespace-nowrap text-[var(--muted)]",
                                        compactMetaTextClass,
                                      )}
                                    >
                                      {t.publicFlow.ends} {formatTimeLabel(slotEnd, lang)}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      "pl-3 text-[var(--action-teal-deep)] sm:pl-0 sm:pt-1",
                                      compactMetaTextClass,
                                    )}
                                  >
                                    {isHolding
                                      ? t.publicFlow.holdingSlot
                                      : isSelected
                                        ? t.publicFlow.selected
                                        : t.publicFlow.open}
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
                            flowIgnoredBookingId,
                            activeBookingHolds,
                            bookingHold?.released ? undefined : bookingHold?.id,
                          )
                            ? t.publicFlow.dayFreeFullDay
                            : t.publicFlow.dayUnavailableChooseAnother}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <SectionTitle
                    title={copy.bookingSummary}
                    body={copy.phrases.bookingSummaryBodyReview}
                  />
                  <div className={cn("mt-6 flex-1", publicInsetCardClass)}>
                    <dl className="grid gap-4">
                      <SummaryField
                        label={t.publicFlow.when}
                        value={
                          bookingFlow.dateKey
                            ? `${formatDateLabel(bookingFlow.dateKey, lang)} · ${
                                selectionWindowLabel
                                  ? selectionWindowLabel
                                  : selectedService.bookingType === "appointment"
                                    ? formatTimeLabel(bookingFlow.time, lang)
                                    : t.publicFlow.fullDay
                              }`
                            : t.publicFlow.notSelected
                        }
                      />
                      {selectedService.medicalSpecialty ? (
                        <SummaryField
                          label={t.publicFlow.specialty}
                          value={selectedService.medicalSpecialty}
                        />
                      ) : null}
                      <SummaryField
                        label={copy.phrases.clientLabel}
                        value={bookingFlow.clientName.trim() || t.publicFlow.notEnteredYet}
                      />
                      <SummaryField
                        label={t.publicFlow.email}
                        value={bookingFlow.clientEmail.trim() || t.publicFlow.notEnteredYet}
                      />
                      <SummaryField
                        label={t.publicFlow.phone}
                        value={bookingFlow.clientPhone.trim() || t.publicFlow.notEnteredYet}
                      />
                      <SummaryField
                        label={t.publicFlow.notes}
                        value={bookingFlow.notes.trim() || t.publicFlow.none}
                      />
                    </dl>
                    {isPublicDetailsStep && !selectionIsSingle ? (
                      <div className="mt-4 border-t border-[var(--line)] pt-4">
                        <button
                          type="button"
                          onClick={goBackToSelectionStep}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
                        >
                          {t.publicFlow.changeDateTime}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
            ) : null}

            {isPublicSuccessStep && successfulBooking ? (
              <div className="[animation:haab-rise-in_0.55s_cubic-bezier(0.22,1,0.36,1)_0.5s_both] space-y-5">
                {(() => {
                  // The booked location, else the service's linked addresses.
                  const successAddresses = successfulBooking.location
                    ? [successfulBooking.location]
                    : [
                        selectedService.linkedAddress1 ? provider.address1 : "",
                        selectedService.linkedAddress2 ? provider.address2 : "",
                        selectedService.customAddress ?? "",
                      ].filter((entry): entry is string => Boolean(entry && entry.trim()));
                  const successPhones = [
                    selectedService.linkedPhone1 ? provider.phoneNumber1 : "",
                    selectedService.linkedPhone2 ? provider.phoneNumber2 : "",
                    selectedService.customPhone ?? "",
                  ].filter((entry): entry is string => Boolean(entry && entry.trim()));
                  const qrForBooking =
                    calendarQrCode?.bookingId === successfulBooking.id
                      ? calendarQrCode
                      : undefined;
                  const isFullDayBooking =
                    !successfulBooking.startTime || !successfulBooking.endTime;

                  // The remaining fields, as pass cells. There are no section
                  // headings on a ticket, so each label has to say whose value it
                  // is on its own — hence "Patient phone" beside "Contact".
                  // One contact cell per party, so both sides get the same shape
                  // and the atomic cells fill the row evenly.
                  const providerContact = [...successPhones, provider.email?.trim() ?? ""]
                    .filter((entry) => entry.trim().length > 0)
                    .join("\n");
                  const clientContact = [
                    successfulBooking.clientEmail,
                    successfulBooking.clientPhone,
                  ]
                    .filter((entry) => entry.trim().length > 0)
                    .join("\n");
                  // Ordered so the grid reads as two bands: everything about the
                  // person, then the place and the provider. The name is
                  // rendered by the pass itself and leads the first band.
                  const passDetails = [
                    clientContact
                      ? {
                          label: fillTemplate(t.publicFlow.passClientContact, {
                            client: copy.phrases.clientLabel.toLowerCase(),
                            Client: copy.phrases.clientLabel,
                          }),
                          value: clientContact,
                        }
                      : null,
                    successfulBooking.notes.trim()
                      ? {
                          label: fillTemplate(t.publicFlow.passClientNotes, {
                            client: copy.phrases.clientLabel.toLowerCase(),
                            Client: copy.phrases.clientLabel,
                          }),
                          value: successfulBooking.notes,
                          prose: true,
                        }
                      : null,
                    selectedService.medicalSpecialty
                      ? { label: t.publicFlow.specialty, value: selectedService.medicalSpecialty }
                      : null,
                    providerContact
                      ? { label: t.publicFlow.passContact, value: providerContact }
                      : null,
                  ].filter((field): field is PassField => field !== null);
                  // Sentences, not data: they band off together under the table.
                  const passNotes: PassField | undefined = selectedService.notes
                    ? {
                        label: fillTemplate(t.publicFlow.passBookingNotes, {
                          booking: copy.booking,
                          Booking: copy.Booking,
                        }),
                        value: selectedService.notes,
                        prose: true,
                      }
                    : undefined;
                  // Where sits with when, at the head of the pass.
                  const passLocation: PassField | undefined =
                    successAddresses.length > 0
                      ? {
                          label:
                            successAddresses.length > 1
                              ? t.publicFlow.locations
                              : t.publicFlow.location,
                          value: successAddresses.join("\n"),
                        }
                      : undefined;

                  return (
                    <>
                      <BookingPass
                        confirmationLabel={
                          isSuccessfulBookingCancelled
                            ? t.publicFlow.bookingCancelled
                            : successfulBooking.status === "rescheduled"
                              ? t.publicFlow.bookingUpdated
                              : t.publicFlow.bookingConfirmed
                        }
                        booking={successfulBooking}
                        providerName={
                          provider.businessName || provider.fullName || copy.bookingPage
                        }
                        serviceName={selectedService.name}
                        dateLabel={formatDateLabel(successfulBooking.dateKey, lang)}
                        timeLabel={formatTimeLabel(successfulBooking.startTime, lang)}
                        isFullDay={isFullDayBooking}
                        durationLabel={formatDuration(selectedService, lang)}
                        clientFieldLabel={copy.phrases.clientLabel}
                        costLabel={successfulBooking.cost || effectiveCost}
                        admitLabel={
                          successfulBooking.capacitySnapshot ||
                          formatCapacityLabel(selectedService, lang)
                        }
                        reference={successfulBooking.id.slice(-10)}
                        issuedLabel={formatCompactDate(
                          getDateKey(new Date(successfulBooking.createdAt)),
                          lang,
                        )}
                        qrDataUrl={qrForBooking?.url || undefined}
                        qrError={qrForBooking?.error || undefined}
                        onOpenQr={() => setIsCalendarQrModalOpen(true)}
                        onDownloadIcs={() => downloadBookingCalendarFile(successfulBooking)}
                        location={passLocation}
                        notes={passNotes}
                        description={
                          selectedService.description
                            ? {
                                label: t.publicFlow.description,
                                value: selectedService.description,
                              }
                            : undefined
                        }
                        details={passDetails}
                        copy={copy}
                        lang={lang}
                      />

                      {successfulBooking.manageToken && successfulManageUrl ? (
                        <PrivateLinkCard
                          url={successfulManageUrl}
                          lang={lang}
                          copied={copiedManageLink}
                          onCopy={() => void copyManageLink()}
                        />
                      ) : null}

                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {isServiceSingleOccurrence(successfulBooking.serviceId) ? null : (
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
                            {t.publicFlow.reschedule}
                          </ActionButton>
                        )}
                        <ActionButton
                          tone="danger"
                          className={cn(
                            "min-w-[150px]",
                            isDedicatedPublicPage && publicPillButtonClass,
                          )}
                          disabled={isSuccessfulBookingCancelled}
                          onClick={() => openCancellation(successfulBooking.id)}
                        >
                          {copy.phrases.cancelBookingButton}
                        </ActionButton>
                        {manageBookingToken ? (
                          <Link
                            href={publicUrl}
                            className={cn(
                              "inline-flex min-w-[150px] items-center justify-center rounded-2xl border border-[var(--line)] px-5 py-2 text-sm font-semibold transition",
                              isSuccessfulBookingCancelled
                                ? "border-transparent bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-white shadow-[0_14px_32px_rgba(26,115,232,0.24)] hover:saturate-125"
                                : "bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-white",
                              isDedicatedPublicPage && publicPillButtonClass,
                            )}
                          >
                            {t.publicFlow.bookAnother}
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
                            {t.publicFlow.bookAnother}
                          </ActionButton>
                        )}
                      </div>
                    </>
                  );
                })()}
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
                // With slots, the tap on a time *is* the action — a second
                // "continue" button could never enable, so it becomes a hint and
                // gives the slots back their space on a phone.
                step2IsAppointment && !selectionIsSingle ? (
                  <p className="flex-1 px-2 py-2 text-center text-[0.9375rem] font-medium leading-5 text-[var(--muted)]">
                    {isCreatingHold ? t.publicFlow.holdingSlot : t.publicFlow.tapTimeHint}
                  </p>
                ) : (
                  <ActionButton
                    tone="primary"
                    className={cn("min-h-12 flex-1", publicPrimaryActionClass)}
                    disabled={!step2CanContinue || isCreatingHold}
                    onClick={advanceToDetailsStep}
                  >
                    {isCreatingHold ? t.common.loading : step2ButtonLabel}
                  </ActionButton>
                )
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
                    {isBookingHoldExpired ? t.public.chooseAnotherTime : t.public.holdChangeTime}
                  </ActionButton>
                  <ActionButton
                    tone="primary"
                    className={cn("min-h-12 flex-1", publicPrimaryActionClass)}
                    disabled={
                      isConfirmingBooking ||
                      isCreatingHold ||
                      (integratedMode && !isNetworkOnline)
                    }
                    onClick={
                      isBookingHoldExpired
                        ? () => void retryExpiredBookingHold()
                        : confirmBooking
                    }
                  >
                    {integratedMode && !isNetworkOnline
                      ? t.public.onlineRequired
                      : isBookingHoldExpired
                        ? isCreatingHold
                          ? t.public.holdingAgain
                          : t.public.holdAgain
                        : t.publicFlow.confirm}
                  </ActionButton>
                </>
              )}
            </div>
          </div>
        ) : null}

      </div>
    );
  }

  /**
   * The private management link's own screen. Deliberately not the confirmation
   * receipt: someone opening this weeks later wants status and controls, not the
   * celebration they already saw.
   */
  function renderManageBooking() {
    if (!successfulBooking) {
      return null;
    }

    const service = services.find(
      (candidate) => candidate.id === successfulBooking.serviceId,
    );
    const addresses = successfulBooking.location
      ? [successfulBooking.location]
      : [
          service?.linkedAddress1 ? provider.address1 : "",
          service?.linkedAddress2 ? provider.address2 : "",
          service?.customAddress ?? "",
        ].filter((entry): entry is string => Boolean(entry && entry.trim()));
    const phones = [
      service?.linkedPhone1 ? provider.phoneNumber1 : "",
      service?.linkedPhone2 ? provider.phoneNumber2 : "",
      service?.customPhone ?? "",
    ].filter((entry): entry is string => Boolean(entry && entry.trim()));
    const qrForBooking =
      calendarQrCode?.bookingId === successfulBooking.id ? calendarQrCode : undefined;

    return (
      <ManageBookingPanel
        booking={{
          ...successfulBooking,
          serviceName: service?.name ?? successfulBooking.serviceName,
        }}
        providerName={provider.businessName || provider.fullName}
        addresses={addresses}
        phones={phones}
        costLabel={successfulBooking.cost}
        manageUrl={successfulManageUrl}
        copiedManageLink={copiedManageLink}
        onCopyManageLink={() => void copyManageLink()}
        canReschedule={!isServiceSingleOccurrence(successfulBooking.serviceId)}
        onReschedule={startManageReschedule}
        onCancel={() => openCancellation(successfulBooking.id)}
        onAddToCalendar={() => downloadBookingCalendarFile(successfulBooking)}
        onShowQr={() => setIsCalendarQrModalOpen(true)}
        qrDataUrl={qrForBooking?.url || undefined}
        qrError={qrForBooking?.error || undefined}
        noteDraft={clientNoteDraft}
        onNoteDraftChange={(value) => {
          setClientNoteDraft(value);
          setClientNoteStatus("idle");
        }}
        onSaveNote={() => void saveClientNote()}
        isSavingNote={isSavingClientNote}
        noteStatus={clientNoteStatus}
        savedNote={successfulBooking.clientNote ?? ""}
        bookAnotherAction={
          <Link
            href={publicUrl}
            className={cn(
              "inline-flex min-h-11 min-w-[150px] items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white",
              isDedicatedPublicPage && publicPillButtonClass,
            )}
          >
            {t.publicFlow.bookAnother}
          </Link>
        }
        copy={copy}
        lang={lang}
        panelClass={publicElevatedPanelClass}
        insetClass={publicInsetCardClass}
        buttonClass={isDedicatedPublicPage ? publicPillButtonClass : undefined}
        ghostButtonClass={
          isDedicatedPublicPage
            ? cn(publicPillButtonClass, publicGhostButtonClass)
            : undefined
        }
      />
    );
  }

  function renderCalendarQrModal() {
    if (
      !isCalendarQrModalOpen ||
      resolvedBookingFlow.step !== 4 ||
      !successfulBooking ||
      isSuccessfulBookingCancelled
    ) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
        <div
          className={cn(
            "w-full max-w-sm p-6",
            isDedicatedPublicPage
              ? "rounded-[32px] bg-[rgba(248,249,250,0.98)] ring-1 ring-[rgba(255,255,255,0.72)] shadow-[0_30px_72px_rgba(25,28,29,0.14)]"
              : "rounded-[32px] border border-[var(--line)] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.2)]",
          )}
        >
          <SectionTitle
            eyebrow={t.publicFlow.addToCalendar}
            title={t.manage.downloadEvent}
            body={copy.phrases.scanQrBody}
          />
          <div
            className={cn(
              "mt-6 flex aspect-square w-full items-center justify-center",
              publicInsetCardClass,
            )}
          >
            {calendarQrCode?.bookingId === successfulBooking.id && calendarQrCode.url ? (
              <div
                aria-label={copy.phrases.calendarQrLabel}
                className="h-full w-full bg-contain bg-center bg-no-repeat"
                role="img"
                style={{ backgroundImage: `url(${calendarQrCode.url})` }}
              />
            ) : (
              <p className="px-5 text-center text-sm leading-6 text-[var(--muted)]">
                {calendarQrCode?.bookingId === successfulBooking.id && calendarQrCode.error
                  ? calendarQrCode.error
                  : t.manage.preparingQr}
              </p>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <ActionButton
              tone="ghost"
              className={cn(
                isDedicatedPublicPage && cn(publicPillButtonClass, publicGhostButtonClass),
              )}
              onClick={() => setIsCalendarQrModalOpen(false)}
            >
              {t.manage.close}
            </ActionButton>
          </div>
        </div>
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
            eyebrow={copy.cancelBooking}
            title={
              services.find((service) => service.id === booking.serviceId)?.name ??
              booking.serviceName
            }
            body={`${booking.clientName} · ${formatDateLabel(booking.dateKey, lang)} · ${formatTimeRange(
              booking.startTime,
              booking.endTime,
              lang,
            )}`}
          />
          <p className="mt-6 text-sm leading-6 text-[var(--muted)]">
            {copy.phrases.cancelExplain}
          </p>
          {cancellationError ? (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]"
            >
              {cancellationError}
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <ActionButton
              tone="ghost"
              className={cn(isDedicatedPublicPage && cn(publicPillButtonClass, publicGhostButtonClass))}
              disabled={isMutatingBooking}
              onClick={() => {
                setCancellationId(null);
                setCancellationError(null);
              }}
            >
              {copy.phrases.keepBookingButton}
            </ActionButton>
            <ActionButton
              tone="danger"
              className={cn(isDedicatedPublicPage && publicPillButtonClass)}
              disabled={isMutatingBooking}
              onClick={confirmCancellation}
            >
              {isMutatingBooking ? t.common.loading : t.manage.confirmCancellation}
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
    const rescheduleWindowLabel = `${formatCompactDate(rescheduleWindow.startKey, lang)} - ${formatCompactDate(
      rescheduleWindow.endKey,
      lang,
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
            eyebrow={copy.rescheduleBooking}
            title={service.name}
            body={`${booking.clientName} · ${
              service.bookingType === "appointment" ? t.manage.chooseNewSlot : t.manage.chooseNewDay
            }`}
            action={
              <ActionButton
                tone="ghost"
                className={cn(isDedicatedPublicPage && cn(publicPillButtonClass, publicGhostButtonClass))}
                disabled={isMutatingBooking}
                onClick={() => setRescheduleState(null)}
              >
                {t.manage.close}
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
                    {t.publicFlow.previous}
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
                    {t.publicFlow.today}
                  </ActionButton>
                  <ActionButton
                    tone="ghost"
                    className={calendarNavPillClass}
                    disabled
                    onClick={() => undefined}
                  >
                    {t.publicFlow.next}
                  </ActionButton>
                </div>
                <p className="text-base font-semibold text-[var(--ink)]">
                  {rescheduleWindowLabel}
                </p>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {WEEKDAY_KEYS.map((day) => (
                  <p key={day}>
                    {getWeekdayShortFormatter(lang).format(
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
                eyebrow={formatCompactDate(rescheduleState.dateKey, lang)}
                title={
                  service.bookingType === "appointment"
                    ? t.manage.selectReplacementSlot
                    : t.manage.confirmFullDayReschedule
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
                        {formatTimeLabel(slot, lang)}
                      </button>
                    ))}
                  </div>
                  {slots.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      {t.manage.noSlotsOnDateHelper}
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
                  {t.manage.newDayFreeReplaceHelper}
                </div>
              )}
              <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
                <ActionButton
                  tone="danger"
                  className={cn("w-full px-4 sm:px-6", isDedicatedPublicPage && publicPillButtonClass)}
                  disabled={isMutatingBooking}
                  onClick={() => setRescheduleState(null)}
                >
                  {t.common.cancel}
                </ActionButton>
                <ActionButton
                  tone="primary"
                  className={cn("w-full px-4 sm:px-6", isDedicatedPublicPage && publicPillButtonClass)}
                  disabled={
                    isMutatingBooking ||
                    !rescheduleState.dateKey ||
                    (service.bookingType === "appointment" && !rescheduleState.time)
                  }
                  onClick={() => void confirmReschedule()}
                >
                  {isMutatingBooking ? t.common.loading : t.manage.saveNewTime}
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
        <div className="mb-6 flex justify-end">{renderPublicLanguageChooser()}</div>
        <SectionTitle eyebrow={copy.manageBooking} title={copy.phrases.loadingBookingTitle} />
      </section>
    );
  }

  if (manageBookingToken && manageLookupState === "not-found") {
    const contactEmail = provider.email?.trim();
    return (
      <section className={cn(publicShellClass, "p-6 sm:p-8")} role="alert">
        <div className="mb-6 flex justify-end">{renderPublicLanguageChooser()}</div>
        <SectionTitle
          eyebrow={copy.manageBooking}
          title={copy.phrases.bookingNotFoundTitle}
          body={copy.phrases.bookingNotFoundBody}
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={publicUrl}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--ink)] px-5 text-sm font-semibold text-white transition hover:opacity-90",
              isDedicatedPublicPage && publicPillButtonClass,
            )}
          >
            {copy.phrases.bookNewButton}
          </Link>
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-soft)]",
                isDedicatedPublicPage && cn(publicPillButtonClass, publicGhostButtonClass),
              )}
            >
              {profileRole?.contactLabel ?? t.manage.contactProvider}
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
    (!activeStore.setupComplete ||
      !publicRouteReady ||
      !requestedServiceReady ||
      services.length === 0)
  ) {
    return (
      <section className={cn(publicShellClass, "p-6 sm:p-8")}>
        <div className="flex justify-end">{renderPublicLanguageChooser()}</div>
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {t.notFound.eyebrow}
          </p>
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {t.notFound.title}
          </h3>
          <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
            {eventOrganizerRole?.bookingPageUnavailableBody ?? t.notFound.body}
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {t.notFound.goHome}
          </Link>
        </div>
      </section>
    );
  }

  // `setupPublished` keeps the Done step visible after publishing flips
  // `setupComplete` true (which would otherwise close the wizard).
  if (isSetupOpen || setupPublished) {
    if (!vertical) {
      return renderWelcome();
    }
    return (
      <section className={cn(publicShellClass, "p-5 sm:p-8")}>
        {renderSetupWizard()}
      </section>
    );
  }

  return (
    <>
      <section className={publicShellClass}>
        {isDedicatedPublicPage && surface === "public" ? (
          <PublicBookingHeader
            businessName={provider.businessName}
            serviceName={selectedService?.name}
            logoImageUrl={provider.logoImageUrl}
            logoAltFallback={eventOrganizerRole?.logoAlt}
            copy={copy}
            providerTimeZone={providerTimeZone}
            // The two flags that already gate the transition, read for the
            // first time from outside the region they fade out.
            isAdvancing={isPublicFlowFadingOut || isCreatingHold}
            errorMessage={bookingError}
            languageChooser={renderPublicLanguageChooser("", "inset")}
            lang={lang}
            // Matches the gutter the flow's own panels use, so the band's edges
            // line up with the banner and the cards below it.
            className="mx-4 mt-4 sm:mx-8 sm:mt-8 xl:mx-10"
          />
        ) : null}
        {!isDedicatedPublicPage ? (
          <div className="border-b border-[var(--line)] p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
                  {provider.businessName || provider.fullName || copy.bookingWorkspace}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="break-all text-sm text-[var(--muted)]">{publicUrl}</span>
                  <button
                    type="button"
                    onClick={copyPublicLink}
                    className="text-sm font-semibold text-[var(--accent)] transition hover:opacity-80"
                  >
                    {copiedLink ? t.publicFlow.copied : t.publicFlow.copyLink}
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[var(--accent)] transition hover:opacity-80"
                  >
                    {t.admin.viewPublicPage}
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
                        {t.admin.signOut}
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
                    ["dashboard", t.admin.tabDashboard],
                    ["bookings", copy.Bookings],
                    ["calendar", t.admin.tabCalendar],
                    ["services", copy.Services],
                    ["settings", t.admin.tabSettings],
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
                  {t.admin.backToWorkspace}
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
        ) : isManageView && !isManageRescheduling ? (
          renderManageBooking()
        ) : (
          renderPublicFlow()
        )}
      </section>

      {renderCalendarQrModal()}
      {renderCancellationModal()}
      {renderRescheduleModal()}
    </>
  );
}
