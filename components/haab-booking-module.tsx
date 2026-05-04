"use client";

import { parse as parseNaturalLanguage, type ParsedResult } from "chrono-node";
import Link from "next/link";
import QRCode from "qrcode";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

type BookingType = "appointment" | "full-day";
type BookingStatus = "confirmed" | "cancelled" | "rescheduled";
type Surface = "management" | "public";
type SurfaceMode = "adaptive" | "public-only";
type AdminTab = "dashboard" | "bookings" | "calendar" | "services" | "settings";
type WeekdayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";
type SetupStep = 1 | 2 | 3 | 4;
type BookingStep = 1 | 2 | 3 | 4;

type ProviderInfo = {
  fullName: string;
  businessName: string;
  email: string;
  publicSlug: string;
};

type Service = {
  id: string;
  name: string;
  bookingType: BookingType;
  durationMinutes?: number;
  description: string;
  capacity?: string;
  cost?: string;
  notes?: string;
};

type DayAvailability = {
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type WeeklyAvailability = Record<WeekdayKey, DayAvailability>;

type BookingRecord = {
  id: string;
  serviceId: string;
  serviceName: string;
  bookingType: BookingType;
  dateKey: string;
  startTime?: string;
  endTime?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
  capacitySnapshot?: string;
  cost: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
};

type BookingHoldRecord = {
  id: string;
  serviceId: string;
  bookingType: BookingType;
  dateKey: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  expiresAt: number;
};

type ModuleStore = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings: BookingRecord[];
  bookingHolds: BookingHoldRecord[];
  setupComplete: boolean;
};

type InjectedConfig = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings?: BookingRecord[];
};

type ServiceDraft = {
  name: string;
  bookingType: BookingType;
  durationMinutes: number;
  description: string;
  capacity: string;
  cost: string;
  notes: string;
};

type BookingFlow = {
  step: BookingStep;
  serviceId: string;
  dateKey: string;
  time: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
  successBookingId?: string;
};

type BookingHold = {
  id: string;
  selectionKey: string;
  startedAt: number;
  expiresAt: number;
  released: boolean;
};

type RescheduleState = {
  bookingId: string;
  dateKey: string;
  time: string;
  monthAnchor: Date;
};

type HaabBookingModuleProps = {
  injectedConfig?: Partial<InjectedConfig>;
  storageKey?: string;
  initialSurface?: Surface;
  surfaceMode?: SurfaceMode;
  requestedPublicSlug?: string;
  onBookingsChange?: (bookings: BookingRecord[]) => void;
  onStoreChange?: (store: ModuleStore) => void;
};

const WEEKDAY_KEYS: WeekdayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 240];

const QUICK_START_TEMPLATES: Array<{
  label: string;
  service: ServiceDraft;
}> = [
  {
    label: "Doctor",
    service: {
      name: "New Patient Consultation",
      bookingType: "appointment",
      durationMinutes: 30,
      description: "A focused first consultation for history, goals, and next steps.",
      capacity: "1 client",
      cost: "$120 consult",
      notes: "",
    },
  },
  {
    label: "Padel",
    service: {
      name: "Court Rental",
      bookingType: "appointment",
      durationMinutes: 60,
      description: "Reserve a court for training, matches, or private play.",
      capacity: "Max 4 players",
      cost: "$40 per hour",
      notes: "",
    },
  },
  {
    label: "Advisor",
    service: {
      name: "Strategy Session",
      bookingType: "appointment",
      durationMinutes: 60,
      description: "Structured planning session covering goals, priorities, and action items.",
      capacity: "1 household",
      cost: "Premium advisory session",
      notes: "",
    },
  },
  {
    label: "Banquet Hall",
    service: {
      name: "Banquet Hall Exclusive",
      bookingType: "full-day",
      durationMinutes: 60,
      description: "Full-day venue reservation for events, receptions, and private functions.",
      capacity: "Fits up to 100 guests",
      cost: "Full-day venue package",
      notes: "",
    },
  },
  {
    label: "Coworking",
    service: {
      name: "Private Office",
      bookingType: "full-day",
      durationMinutes: 60,
      description: "Quiet dedicated office booking for an entire workday.",
      capacity: "Seats up to 3 people",
      cost: "Day pass bundle",
      notes: "",
    },
  },
];

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const weekdayShortFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

const compactBadgeTextClass = "text-xs font-semibold uppercase tracking-[0.08em]";
const compactMetaTextClass = "text-xs font-semibold uppercase tracking-[0.18em]";
const BOOKING_HOLD_DURATION_MS = 10 * 60 * 1000;
const DEFAULT_STORAGE_KEY = "haab-calendar-dev-clean";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function currentTimestamp() {
  return new Date().getTime();
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function createDefaultAvailability(): WeeklyAvailability {
  return {
    sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  };
}

function createEmptyStore(): ModuleStore {
  return {
    provider: {
      fullName: "",
      businessName: "",
      email: "",
      publicSlug: "",
    },
    services: [],
    availability: createDefaultAvailability(),
    bookings: [],
    bookingHolds: [],
    setupComplete: false,
  };
}

function createBlankServiceDraft(): ServiceDraft {
  return {
    name: "",
    bookingType: "appointment",
    durationMinutes: 30,
    description: "",
    capacity: "",
    cost: "",
    notes: "",
  };
}

function createInitialBookingFlow(services: Service[]): BookingFlow {
  const firstService = services.length === 1 ? services[0]?.id ?? "" : "";

  return {
    step: firstService ? 2 : 1,
    serviceId: firstService,
    dateKey: "",
    time: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    notes: "",
    successBookingId: undefined,
  };
}

function normalizeAvailability(
  source?: Partial<WeeklyAvailability> | null,
): WeeklyAvailability {
  const base = createDefaultAvailability();

  for (const key of WEEKDAY_KEYS) {
    const next = source?.[key];
    if (!next) {
      continue;
    }

    base[key] = {
      enabled: Boolean(next.enabled),
      startTime: next.startTime ?? base[key].startTime,
      endTime: next.endTime ?? base[key].endTime,
    };
  }

  return base;
}

function normalizeProvider(source?: Partial<ProviderInfo> | null): ProviderInfo {
  return {
    fullName: source?.fullName ?? "",
    businessName: source?.businessName ?? "",
    email: source?.email ?? "",
    publicSlug:
      source?.publicSlug ??
      slugify(source?.businessName || source?.fullName || "haab-calendar"),
  };
}

function normalizeServices(source?: Service[] | null): Service[] {
  return (source ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    bookingType: service.bookingType,
    durationMinutes:
      service.bookingType === "full-day"
        ? undefined
        : service.durationMinutes,
    description: service.description,
    capacity: service.capacity,
    cost: service.cost,
    notes: service.notes,
  }));
}

function normalizeBookings(source?: BookingRecord[] | null): BookingRecord[] {
  return sortBookings(
    (source ?? []).map((booking) => ({
      id: booking.id,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      bookingType: booking.bookingType,
      dateKey: booking.dateKey,
      startTime: booking.startTime,
      endTime: booking.endTime,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      notes: booking.notes ?? "",
      capacitySnapshot: booking.capacitySnapshot,
      cost: booking.cost ?? "",
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    })),
  );
}

function pruneBookingHolds(holds: BookingHoldRecord[], now = currentTimestamp()) {
  return holds.filter((hold) => hold.expiresAt > now);
}

function normalizeBookingHolds(source?: BookingHoldRecord[] | null): BookingHoldRecord[] {
  return pruneBookingHolds(
    (source ?? []).filter(
      (hold) =>
        Boolean(hold.id) &&
        Boolean(hold.serviceId) &&
        Boolean(hold.dateKey) &&
        typeof hold.expiresAt === "number",
    ),
  );
}

function normalizeStore(source?: ModuleStore | null): ModuleStore {
  const empty = createEmptyStore();

  return {
    provider: normalizeProvider(source?.provider),
    services: normalizeServices(source?.services),
    availability: normalizeAvailability(source?.availability),
    bookings: normalizeBookings(source?.bookings),
    bookingHolds: normalizeBookingHolds(source?.bookingHolds),
    setupComplete: Boolean(source?.setupComplete ?? empty.setupComplete),
  };
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function addMinutes(time: string, amount: number) {
  const total = toMinutes(time) + amount;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${pad(hours)}:${pad(minutes)}`;
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function compareDateKeys(left: string, right: string) {
  return parseDateKey(left).getTime() - parseDateKey(right).getTime();
}

function sortBookings(bookings: BookingRecord[]) {
  return [...bookings].sort((left, right) => {
    const dateCompare = compareDateKeys(left.dateKey, right.dateKey);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return (left.startTime ?? "00:00").localeCompare(right.startTime ?? "00:00");
  });
}

function formatDateLabel(dateKey: string) {
  return longDateFormatter.format(parseDateKey(dateKey));
}

function formatCompactDate(dateKey: string) {
  return compactDateFormatter.format(parseDateKey(dateKey));
}

function formatMonthLabel(date: Date) {
  return monthFormatter.format(date);
}

function formatTimeLabel(time?: string) {
  if (!time) {
    return "Full Day";
  }

  const [hours, minutes] = time.split(":").map(Number);
  const meridiem = hours >= 12 ? "PM" : "AM";
  const safeHours = hours % 12 || 12;
  return `${safeHours}:${pad(minutes)} ${meridiem}`;
}

function formatTimeRange(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) {
    return "Full Day";
  }

  return `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`;
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${pad(seconds)}`;
}

function getTimeKeyFromDate(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function hasExplicitTime(result: ParsedResult) {
  return result.start.isCertain("hour");
}

function getWeekdayKey(dateKey: string): WeekdayKey {
  return WEEKDAY_KEYS[parseDateKey(dateKey).getDay()];
}

function todayKey() {
  return getDateKey(new Date());
}

function isPastDate(dateKey: string) {
  return compareDateKeys(dateKey, todayKey()) < 0;
}

function overlapExists(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
) {
  return toMinutes(leftStart) < toMinutes(rightEnd) &&
    toMinutes(leftEnd) > toMinutes(rightStart);
}

function createMonthMatrix(anchor: Date) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) =>
      addDays(gridStart, weekIndex * 7 + dayIndex),
    ),
  );
}

function getWeekStart(date: Date) {
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -date.getDay());
}

function createWeekWindow(start: Date, weeksToShow: number) {
  return Array.from({ length: weeksToShow }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) =>
      addDays(start, weekIndex * 7 + dayIndex),
    ),
  );
}

function createRollingWeekWindow(reference: Date, pastDays: number, weeksToShow: number) {
  const start = getWeekStart(addDays(reference, -pastDays));
  const end = addDays(start, weeksToShow * 7 - 1);

  return {
    start,
    end,
    startKey: getDateKey(start),
    endKey: getDateKey(end),
    weeks: createWeekWindow(start, weeksToShow),
  };
}

function clampDateKey(dateKey: string, minimumDateKey: string, maximumDateKey: string) {
  if (compareDateKeys(dateKey, minimumDateKey) < 0) {
    return minimumDateKey;
  }

  if (compareDateKeys(dateKey, maximumDateKey) > 0) {
    return maximumDateKey;
  }

  return dateKey;
}

function compareMonthAnchors(left: Date, right: Date) {
  if (left.getFullYear() !== right.getFullYear()) {
    return left.getFullYear() - right.getFullYear();
  }

  return left.getMonth() - right.getMonth();
}

function isActiveBooking(booking: BookingRecord) {
  return booking.status !== "cancelled";
}

function getBookingsForDate(
  bookings: BookingRecord[],
  dateKey: string,
  ignoredBookingId?: string,
) {
  return bookings.filter(
    (booking) =>
      booking.dateKey === dateKey &&
      booking.id !== ignoredBookingId &&
    isActiveBooking(booking),
  );
}

function getBookingHoldsForDate(
  bookingHolds: BookingHoldRecord[],
  dateKey: string,
  ignoredHoldId?: string,
) {
  return bookingHolds.filter(
    (hold) => hold.dateKey === dateKey && hold.id !== ignoredHoldId,
  );
}

function getAvailableSlots(
  dateKey: string,
  service: Service,
  availability: WeeklyAvailability,
  bookings: BookingRecord[],
  ignoredBookingId?: string,
  bookingHolds: BookingHoldRecord[] = [],
  ignoredHoldId?: string,
) {
  if (service.bookingType !== "appointment" || !service.durationMinutes) {
    return [];
  }

  if (isPastDate(dateKey)) {
    return [];
  }

  const weekday = getWeekdayKey(dateKey);
  const daySchedule = availability[weekday];

  if (!daySchedule.enabled || toMinutes(daySchedule.endTime) <= toMinutes(daySchedule.startTime)) {
    return [];
  }

  const dateBookings = getBookingsForDate(bookings, dateKey, ignoredBookingId);
  const dateHolds = getBookingHoldsForDate(bookingHolds, dateKey, ignoredHoldId);

  if (
    dateBookings.some((booking) => booking.bookingType === "full-day") ||
    dateHolds.some((hold) => hold.bookingType === "full-day")
  ) {
    return [];
  }

  const slots: string[] = [];
  let cursor = daySchedule.startTime;

  while (toMinutes(cursor) + service.durationMinutes <= toMinutes(daySchedule.endTime)) {
    const slotEnd = addMinutes(cursor, service.durationMinutes);
    const blockedByBooking = dateBookings.some((booking) => {
      if (!booking.startTime || !booking.endTime) {
        return false;
      }

      return overlapExists(cursor, slotEnd, booking.startTime, booking.endTime);
    });
    const blockedByHold = dateHolds.some((hold) => {
      if (!hold.startTime || !hold.endTime) {
        return false;
      }

      return overlapExists(cursor, slotEnd, hold.startTime, hold.endTime);
    });

    if (!blockedByBooking && !blockedByHold) {
      slots.push(cursor);
    }

    cursor = addMinutes(cursor, service.durationMinutes);
  }

  return slots;
}

function isDateAvailable(
  dateKey: string,
  service: Service,
  availability: WeeklyAvailability,
  bookings: BookingRecord[],
  ignoredBookingId?: string,
  bookingHolds: BookingHoldRecord[] = [],
  ignoredHoldId?: string,
) {
  if (isPastDate(dateKey)) {
    return false;
  }

  const weekday = getWeekdayKey(dateKey);
  const daySchedule = availability[weekday];

  if (!daySchedule.enabled) {
    return false;
  }

  if (service.bookingType === "appointment") {
    return getAvailableSlots(
      dateKey,
      service,
      availability,
      bookings,
      ignoredBookingId,
      bookingHolds,
      ignoredHoldId,
    ).length > 0;
  }

  return (
    getBookingsForDate(bookings, dateKey, ignoredBookingId).length === 0 &&
    getBookingHoldsForDate(bookingHolds, dateKey, ignoredHoldId).length === 0
  );
}

function getBookingHoldSelectionKey(service: Service, dateKey: string, time: string) {
  return [
    service.id,
    dateKey,
    service.bookingType === "appointment" ? time : "full-day",
  ].join(":");
}

function getBookingTypeLabel(type: BookingType) {
  return type === "appointment" ? "Appointment" : "Full Day";
}

function statusTone(status: BookingStatus) {
  if (status === "cancelled") {
    return "danger";
  }

  if (status === "rescheduled") {
    return "secondary";
  }

  return "primary";
}

function bookingTypeTone(type: BookingType) {
  return type === "appointment" ? "primary" : "secondary";
}

function formatDuration(service: Service) {
  if (service.bookingType === "full-day") {
    return "Full Day";
  }

  if (!service.durationMinutes) {
    return "Appointment";
  }

  if (service.durationMinutes >= 60 && service.durationMinutes % 60 === 0) {
    const hours = service.durationMinutes / 60;
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }

  return `${service.durationMinutes} min`;
}

function formatCapacityLabel(service: Service) {
  return service.capacity || (service.bookingType === "appointment" ? "1 client" : "Not set");
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function buildIcsContent(booking: BookingRecord, provider: ProviderInfo) {
  const safeSummary = escapeIcsText(booking.serviceName);
  const safeDescription = escapeIcsText(
    `Client: ${booking.clientName}\nPhone: ${booking.clientPhone}\nNotes: ${booking.notes || "N/A"}`,
  );
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const eventId = `${booking.id}@haab-calendar.local`;

  if (booking.bookingType === "full-day") {
    const start = booking.dateKey.replaceAll("-", "");
    const end = getDateKey(addDays(parseDateKey(booking.dateKey), 1)).replaceAll("-", "");

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Haab Calendar//Booking Module//EN",
      "BEGIN:VEVENT",
      `UID:${eventId}`,
      `DTSTAMP:${stamp}`,
      `SUMMARY:${safeSummary}`,
      `DESCRIPTION:${safeDescription}`,
      `ORGANIZER:MAILTO:${provider.email}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
  }

  const start = `${booking.dateKey.replaceAll("-", "")}T${(booking.startTime ?? "09:00").replace(":", "")}00`;
  const end = `${booking.dateKey.replaceAll("-", "")}T${(booking.endTime ?? "10:00").replace(":", "")}00`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Haab Calendar//Booking Module//EN",
    "BEGIN:VEVENT",
    `UID:${eventId}`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${safeSummary}`,
    `DESCRIPTION:${safeDescription}`,
    `ORGANIZER:MAILTO:${provider.email}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
}

function buttonClasses(
  tone: "primary" | "secondary" | "ghost" | "danger",
  className?: string,
) {
  return cn(
    "inline-flex min-h-11 items-center justify-center rounded-[0.75rem] px-4 text-sm font-semibold transition-[transform,filter,box-shadow,background-color,color] duration-200 disabled:cursor-not-allowed disabled:opacity-45",
    tone === "primary" &&
      "bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-white shadow-[0_30px_48px_rgba(25,28,29,0.08),0_14px_32px_rgba(26,115,232,0.24)] hover:saturate-125 hover:shadow-[0_34px_54px_rgba(25,28,29,0.1),0_18px_36px_rgba(26,115,232,0.3)]",
    tone === "secondary" &&
      "bg-[rgba(243,244,245,0.96)] text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_36px_rgba(25,28,29,0.05)] hover:bg-[rgba(255,255,255,0.92)] hover:text-[var(--primary-container)]",
    tone === "ghost" &&
      "bg-transparent text-[var(--muted)] hover:bg-[rgba(243,244,245,0.72)] hover:text-[var(--ink)]",
    tone === "danger" &&
      "bg-[rgba(255,241,242,0.92)] text-[#be123c] shadow-[0_18px_36px_rgba(25,28,29,0.04)] hover:bg-[rgba(255,228,230,0.96)]",
    className,
  );
}

function ActionButton({
  children,
  className,
  tone = "secondary",
  ...props
}: {
  children: ReactNode;
  className?: string;
  tone?: "primary" | "secondary" | "ghost" | "danger";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={buttonClasses(tone, className)}
    >
      {children}
    </button>
  );
}

function ActionLink({
  href,
  children,
  className,
  onClick,
  tone = "secondary",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <Link href={href} onClick={onClick} className={buttonClasses(tone, className)}>
      {children}
    </Link>
  );
}

function ToneBadge({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "secondary" | "danger" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[0.75rem] px-3 py-1 backdrop-blur-[20px]",
        compactBadgeTextClass,
        tone === "primary" &&
          "bg-[rgba(26,115,232,0.12)] text-[var(--primary-container)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
        tone === "secondary" &&
          "bg-[rgba(243,244,245,0.72)] text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        tone === "danger" && "bg-[rgba(255,241,242,0.86)] text-[#be123c]",
        tone === "neutral" &&
          "bg-[rgba(104,250,221,0.22)] text-[var(--action-teal-deep)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
      )}
    >
      {children}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
          {title}
        </h3>
        {body ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid">
      <dt className={cn("text-[var(--muted)]", compactMetaTextClass)}>{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium leading-6 text-[var(--ink)]">
        {value}
      </dd>
    </div>
  );
}

function SummaryStatusTitle({ status }: { status: "confirmed" | "cancelled" | "updated" }) {
  const isCancelled = status === "cancelled";
  const isUpdated = status === "updated";

  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full",
          isCancelled
            ? "bg-[#fff1f2] text-[#be123c]"
            : isUpdated
              ? "bg-[rgba(26,115,232,0.12)] text-[var(--primary-container)]"
              : "bg-[rgba(0,191,165,0.14)] text-[var(--accent-strong)]",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isCancelled ? (
            <>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </>
          ) : isUpdated ? (
            <>
              <path d="M20 11a8 8 0 0 0-14.8-4.2L4 9" />
              <path d="M4 4v5h5" />
              <path d="M4 13a8 8 0 0 0 14.8 4.2L20 15" />
              <path d="M20 20v-5h-5" />
            </>
          ) : (
            <path d="M20 7 9 18l-5-5" />
          )}
        </svg>
      </span>
      <span>
        Booking summary - {isCancelled ? "Cancelled" : isUpdated ? "Updated" : "Confirmed"}
      </span>
    </span>
  );
}

function PublicProgressIndicator({
  currentStep,
  isDedicatedPublicPage,
}: {
  currentStep: 2 | 3 | 4;
  isDedicatedPublicPage: boolean;
}) {
  const steps = [
    { key: 2 as const, label: "Date & Time" },
    { key: 3 as const, label: "My Details" },
    { key: 4 as const, label: "Confirmed" },
  ];

  return (
    <nav aria-label="Booking progress">
      <ol className="flex items-start" role="list">
        {steps.map((step, index) => {
          const isFinished = currentStep === 4;
          const status = isFinished
            ? "complete"
            : step.key < currentStep
              ? "complete"
              : step.key === currentStep
                ? "current"
                : "upcoming";
          const isLast = index === steps.length - 1;
          const connectorActive = isFinished || step.key < currentStep;

          return (
            <li
              key={step.key}
              className={cn("flex items-start", isLast ? "shrink-0" : "flex-1")}
              aria-current={status === "current" ? "step" : undefined}
            >
              <div className="flex shrink-0 flex-col items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                    status === "complete" &&
                      "bg-[var(--primary)] text-white shadow-[0_10px_22px_rgba(0,91,191,0.32),inset_0_1px_0_rgba(255,255,255,0.4)]",
                    status === "current" &&
                      "bg-white text-[var(--primary)] ring-2 ring-[var(--primary)] shadow-[0_10px_24px_rgba(26,115,232,0.28),inset_0_1px_0_rgba(255,255,255,0.95)]",
                    status === "upcoming" &&
                      (isDedicatedPublicPage
                        ? "bg-[rgba(255,255,255,0.55)] text-[var(--muted)] ring-1 ring-[rgba(193,198,214,0.5)]"
                        : "bg-[var(--surface-soft)] text-[var(--muted)] ring-1 ring-[var(--line)]"),
                  )}
                >
                  {status === "complete" ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 7 9 18l-5-5" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                  {status === "current" ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1 rounded-full ring-4 ring-[rgba(26,115,232,0.18)]"
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "max-w-[7.5rem] text-center text-xs font-semibold uppercase tracking-[0.14em] leading-tight transition-colors",
                    status === "complete" && "text-[var(--ink)]",
                    status === "current" && "text-[var(--primary)]",
                    status === "upcoming" && "text-[var(--muted)]",
                  )}
                >
                  <span className="sr-only">
                    {status === "complete"
                      ? "Completed: "
                      : status === "current"
                        ? "Current step: "
                        : "Upcoming: "}
                  </span>
                  {step.label}
                </span>
              </div>
              {!isLast ? (
                <div
                  aria-hidden="true"
                  className="mx-2 mt-[17px] h-[2px] flex-1 sm:mx-3"
                >
                  <div
                    className={cn(
                      "h-full w-full rounded-full transition-colors duration-500",
                      connectorActive
                        ? "bg-[var(--primary)]"
                        : isDedicatedPublicPage
                          ? "bg-[rgba(193,198,214,0.45)]"
                          : "bg-[var(--line)]",
                    )}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-[rgba(243,244,245,0.88)] p-6 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <h4 className="text-lg font-semibold text-[var(--ink)]">{title}</h4>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function HaabBookingModule({
  injectedConfig,
  storageKey = DEFAULT_STORAGE_KEY,
  initialSurface = "management",
  surfaceMode = "adaptive",
  requestedPublicSlug,
  onBookingsChange,
  onStoreChange,
}: HaabBookingModuleProps) {
  const integratedMode = Boolean(
    injectedConfig?.provider &&
      injectedConfig?.services?.length &&
      injectedConfig?.availability,
  );

  const [hydrated, setHydrated] = useState(integratedMode);
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
  const [standaloneStore, setStandaloneStore] = useState<ModuleStore>(() =>
    createEmptyStore(),
  );
  const [shadowBookings, setShadowBookings] = useState<BookingRecord[]>(() =>
    normalizeBookings(injectedConfig?.bookings),
  );
  const [shadowBookingHolds, setShadowBookingHolds] = useState<BookingHoldRecord[]>([]);
  const [surface, setSurface] = useState<Surface>(
    surfaceMode === "public-only" ? "public" : initialSurface,
  );
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [setupStep, setSetupStep] = useState<SetupStep>(1);
  const [setupError, setSetupError] = useState<string | null>(null);
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
  const publicPrimaryPanelRef = useRef<HTMLDivElement | null>(null);
  const publicAboutPanelRef = useRef<HTMLDivElement | null>(null);
  const publicSummaryPanelRef = useRef<HTMLDivElement | null>(null);
  const stickyHeaderSentinelRef = useRef<HTMLDivElement | null>(null);
  const [isStickyHeaderStuck, setIsStickyHeaderStuck] = useState(false);
  const [publicPrimaryPanelHeight, setPublicPrimaryPanelHeight] = useState<number | null>(
    null,
  );
  const [calendarQrCode, setCalendarQrCode] = useState<{
    bookingId: string;
    error: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (integratedMode) {
      return;
    }

    const hydrationHandle = window.setTimeout(() => {
      const raw = window.localStorage.getItem(storageKey);

      if (raw) {
        try {
          setStandaloneStore(normalizeStore(JSON.parse(raw) as ModuleStore));
        } catch {
          setStandaloneStore(createEmptyStore());
        }
      }

      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationHandle);
  }, [integratedMode, storageKey]);

  useEffect(() => {
    if (!integratedMode && hydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(standaloneStore));
    }
  }, [hydrated, integratedMode, standaloneStore, storageKey]);

  useEffect(() => {
    if (integratedMode) {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== storageKey) {
        return;
      }

      if (!event.newValue) {
        return;
      }

      try {
        setStandaloneStore(normalizeStore(JSON.parse(event.newValue) as ModuleStore));
        setHydrated(true);
      } catch {
        // Ignore malformed external storage writes and keep the current in-memory store.
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, [integratedMode, storageKey]);

  const activeStore: ModuleStore = integratedMode
    ? {
        provider: normalizeProvider(injectedConfig?.provider),
        services: normalizeServices(injectedConfig?.services),
        availability: normalizeAvailability(injectedConfig?.availability),
        bookings: shadowBookings,
        bookingHolds: shadowBookingHolds,
        setupComplete: true,
      }
    : standaloneStore;

  const provider = activeStore.provider;
  const services = activeStore.services;
  const bookings = activeStore.bookings;
  const bookingHolds = activeStore.bookingHolds;
  const activeBookingHolds = pruneBookingHolds(bookingHolds, bookingHoldNow);
  const availability = activeStore.availability;
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
  const bookingHoldRemainingMs =
    bookingHold && bookingHold.selectionKey === bookingHoldSelectionKey
      ? Math.max(0, BOOKING_HOLD_DURATION_MS - (bookingHoldNow - bookingHold.startedAt))
      : BOOKING_HOLD_DURATION_MS;
  const isBookingHoldExpired =
    Boolean(bookingHoldSelectionKey && bookingHold) && bookingHoldRemainingMs <= 0;
  const shouldDimManualBookingPanels =
    isNaturalLanguageBookingFocused && naturalLanguageBookingInput.trim().length > 0;
  const isSetupOpen = !integratedMode && !activeStore.setupComplete;
  const publicRouteReady =
    !requestedPublicSlug || requestedPublicSlug === businessSlug;
  const isPublicView = surfaceMode === "public-only" || surface === "public";
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
    const sentinel = stickyHeaderSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStickyHeaderStuck(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-16px 0px 0px 0px" },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [resolvedBookingFlow.step]);

  useEffect(() => {
    if (!successfulBooking || successfulBooking.status === "cancelled") {
      return;
    }

    let cancelled = false;
    const bookingId = successfulBooking.id;

    QRCode.toDataURL(buildIcsContent(successfulBooking, provider), {
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
          error: "Unable to generate the calendar QR code.",
          url: "",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [provider, successfulBooking]);

  function emitStoreChange(next: ModuleStore) {
    onStoreChange?.(next);
  }

  function updateStandaloneStore(updater: (current: ModuleStore) => ModuleStore) {
    setStandaloneStore((current) => {
      const next = updater(current);
      emitStoreChange(next);
      return next;
    });
  }

  function readStandaloneStoreSnapshot() {
    if (integratedMode || typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return null;
    }

    try {
      return normalizeStore(JSON.parse(raw) as ModuleStore);
    } catch {
      return null;
    }
  }

  function persistStandaloneStore(nextStore: ModuleStore) {
    if (integratedMode || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(nextStore));
  }

  function commitBookingHolds(nextHolds: BookingHoldRecord[], standaloneBase?: ModuleStore) {
    const normalized = pruneBookingHolds(nextHolds);

    if (integratedMode) {
      setShadowBookingHolds(normalized);
      emitStoreChange({
        provider: normalizeProvider(injectedConfig?.provider),
        services: normalizeServices(injectedConfig?.services),
        availability: normalizeAvailability(injectedConfig?.availability),
        bookings: shadowBookings,
        bookingHolds: normalized,
        setupComplete: true,
      });
      return;
    }

    const nextStore = {
      ...(standaloneBase ?? standaloneStore),
      bookingHolds: normalized,
    };

    setStandaloneStore(nextStore);
    persistStandaloneStore(nextStore);
    emitStoreChange(nextStore);
  }

  function releaseBookingHold(holdId?: string) {
    if (!holdId) {
      return;
    }

    const latestStandaloneStore = readStandaloneStoreSnapshot();
    const baseStore = latestStandaloneStore ?? activeStore;
    const nextHolds = baseStore.bookingHolds.filter((hold) => hold.id !== holdId);

    if (!integratedMode && latestStandaloneStore) {
      setStandaloneStore(latestStandaloneStore);
    }

    commitBookingHolds(nextHolds, baseStore);
  }

  const releaseExpiredBookingHold = useEffectEvent((holdId: string) => {
    releaseBookingHold(holdId);
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

  function commitBookings(
    nextBookings: BookingRecord[],
    standaloneBase?: ModuleStore,
    nextBookingHolds?: BookingHoldRecord[],
  ) {
    const normalized = sortBookings(nextBookings);
    const normalizedHolds = pruneBookingHolds(
      nextBookingHolds ?? standaloneBase?.bookingHolds ?? activeStore.bookingHolds,
    );

    if (integratedMode) {
      setShadowBookings(normalized);
      setShadowBookingHolds(normalizedHolds);
      onBookingsChange?.(normalized);
      emitStoreChange({
        provider: normalizeProvider(injectedConfig?.provider),
        services: normalizeServices(injectedConfig?.services),
        availability: normalizeAvailability(injectedConfig?.availability),
        bookings: normalized,
        bookingHolds: normalizedHolds,
        setupComplete: true,
      });
      return;
    }

    const nextStore = {
      ...(standaloneBase ?? standaloneStore),
      bookings: normalized,
      bookingHolds: normalizedHolds,
    };

    setStandaloneStore(nextStore);
    persistStandaloneStore(nextStore);
    emitStoreChange(nextStore);
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
    setNaturalLanguageBookingInput("");
    setNaturalLanguageBookingError(null);
    setIsNaturalLanguageBookingFocused(false);
    setIsNLBookingOpen(false);
    setWasBookingUpdatedWithNaturalLanguage(false);
    releaseBookingHold(bookingHold?.released ? undefined : bookingHold?.id);
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

    const blob = new Blob([buildIcsContent(booking, provider)], {
      type: "text/calendar;charset=utf-8",
    });
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

  function appendQuickTemplate(template: ServiceDraft) {
    setEditingServiceId(null);
    setServiceDraft(template);
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

    updateStandaloneStore((current) => ({
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

    const activeBookingsForService = bookings.some(
      (booking) => booking.serviceId === serviceId && booking.status !== "cancelled",
    );

    if (activeBookingsForService) {
      setSetupError("Cancel active bookings for this service before removing it.");
      return;
    }

    updateStandaloneStore((current) => ({
      ...current,
      services: current.services.filter((service) => service.id !== serviceId),
    }));

    if (editingServiceId === serviceId) {
      resetServiceEditor();
    }
  }

  function completeSetup(nextSurface: Surface) {
    if (integratedMode) {
      return;
    }

    const nextStore: ModuleStore = {
      ...standaloneStore,
      provider: {
        ...standaloneStore.provider,
        publicSlug:
          standaloneStore.provider.publicSlug ||
          slugify(
            standaloneStore.provider.businessName ||
              standaloneStore.provider.fullName ||
              "haab-calendar",
          ),
      },
      setupComplete: true,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(nextStore));
    setStandaloneStore(nextStore);
    emitStoreChange(nextStore);
    setSetupStep(4);
    setSurface(nextSurface);
    startFreshBooking();
  }

  function updateProvider<K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) {
    if (integratedMode) {
      return;
    }

    updateStandaloneStore((current) => ({
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

    updateStandaloneStore((current) => ({
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
    setStandaloneStore(empty);
    emitStoreChange(empty);
  }

  function validateSetup(step: SetupStep) {
    if (step === 1) {
      if (!provider.fullName.trim() || !provider.businessName.trim() || !provider.email.trim()) {
        return "Provider name, business name, and email are all required.";
      }
    }

    if (step === 2 && services.length === 0) {
      return "Add at least one service before moving on.";
    }

    if (step === 3) {
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
    }

    return null;
  }

  function goToNextSetupStep() {
    const error = validateSetup(setupStep);

    if (error) {
      setSetupError(error);
      return;
    }

    setSetupError(null);
    setSetupStep((current) => (current < 4 ? ((current + 1) as SetupStep) : current));
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
    const latestStandaloneStore = readStandaloneStoreSnapshot();
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
      setStandaloneStore(latestStandaloneStore);
    }

    setBookingError(null);
    commitBookingHolds([...currentHolds, holdRecord], baseStore);
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
    const latestStandaloneStore = readStandaloneStoreSnapshot();
    const validationStore = latestStandaloneStore ?? activeStore;
    const validationService =
      validationStore.services.find(
        (service) => service.id === resolvedBookingFlow.serviceId,
      ) ?? selectedService;
    const ignoredHoldId = bookingHold?.released ? undefined : bookingHold?.id;
    const validationHolds = pruneBookingHolds(validationStore.bookingHolds, now);

    if (!integratedMode && latestStandaloneStore) {
      setStandaloneStore(latestStandaloneStore);
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
    };

    const nextHolds = validationHolds.filter((hold) => hold.id !== ignoredHoldId);

    console.log("Haab Calendar booking confirmed:", nextBooking);

    commitBookings([...validationStore.bookings, nextBooking], validationStore, nextHolds);
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

    const latestStandaloneStore = readStandaloneStoreSnapshot();
    const validationStore = latestStandaloneStore ?? activeStore;
    const booking = validationStore.bookings.find(
      (candidate) => candidate.id === rescheduleState.bookingId,
    );
    const service = validationStore.services.find(
      (candidate) => candidate.id === booking?.serviceId,
    );

    if (!integratedMode && latestStandaloneStore) {
      setStandaloneStore(latestStandaloneStore);
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
      return;
    }

    commitBookings(
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

    const latestStandaloneStore = readStandaloneStoreSnapshot();
    const validationStore = latestStandaloneStore ?? activeStore;

    if (!integratedMode && latestStandaloneStore) {
      setStandaloneStore(latestStandaloneStore);
    }

    commitBookings(
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

  function renderSetupWizard() {
    return (
      <>
        <div className="rounded-[30px] border border-[var(--line)] bg-[linear-gradient(140deg,rgba(234,241,255,0.85),rgba(255,255,255,0.96))] p-6 sm:p-8">
          <SectionTitle
            eyebrow="Standalone Setup"
            title="Configure the module in four focused steps"
            body="Collect provider details, create services for appointments and full-day bookings, set weekly availability, then publish a clean public booking page."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              ["1", "Provider"],
              ["2", "Services"],
              ["3", "Availability"],
              ["4", "Done"],
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
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-[var(--line)] bg-white p-6">
              <SectionTitle
                title="Tell us about the provider"
                body="These details feed confirmations, branding, and the public booking URL."
              />
              <div className="mt-6 grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  Full name
                  <input
                    value={provider.fullName}
                    onChange={(event) => updateProvider("fullName", event.target.value)}
                    placeholder="Dr. Maya Alvarez"
                    className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  Business or brand name
                  <input
                    value={provider.businessName}
                    onChange={(event) => updateProvider("businessName", event.target.value)}
                    placeholder="Haab Health Studio"
                    className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  Confirmation email
                  <input
                    value={provider.email}
                    onChange={(event) => updateProvider("email", event.target.value)}
                    placeholder="bookings@haabcalendar.com"
                    type="email"
                    className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-6">
              <SectionTitle
                eyebrow="Examples"
                title="Designed for multiple booking models"
                body="Timed appointments and full-day bookings sit in the same module so doctors, advisors, courts, venues, and shared offices can share one interface."
              />
              <div className="mt-5 space-y-3">
                {QUICK_START_TEMPLATES.map((template) => (
                  <div
                    key={template.label}
                    className="rounded-2xl border border-white bg-white/90 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {template.service.name}
                      </p>
                      <ToneBadge tone={bookingTypeTone(template.service.bookingType)}>
                        {getBookingTypeLabel(template.service.bookingType)}
                      </ToneBadge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {template.service.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {setupStep === 2 ? (
          <div className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-[var(--line)] bg-white p-6">
              <SectionTitle
                title="Define what clients can book"
                body="Each service can be a timed appointment or a full-day reservation. Capacity and notes stay visible throughout the booking flow."
                action={
                  <div className="flex flex-wrap gap-2">
                    {QUICK_START_TEMPLATES.map((template) => (
                      <ActionButton
                        key={template.label}
                        tone="ghost"
                        onClick={() => appendQuickTemplate(template.service)}
                      >
                        Add {template.label}
                      </ActionButton>
                    ))}
                  </div>
                }
              />
              <div className="mt-6 space-y-3">
                {services.length === 0 ? (
                  <EmptyState
                    title="No services added yet"
                    body="Use the template shortcuts or fill in the service form to add your first offering."
                  />
                ) : (
                  services.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-3xl border border-[var(--line)] bg-[var(--surface-soft)] p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-[var(--ink)]">
                              {service.name}
                            </h4>
                            <ToneBadge tone={bookingTypeTone(service.bookingType)}>
                              {getBookingTypeLabel(service.bookingType)}
                            </ToneBadge>
                            <ToneBadge tone="neutral">{formatDuration(service)}</ToneBadge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                            {service.description}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
                            {service.capacity ? <span>Capacity: {service.capacity}</span> : null}
                            {service.cost ? <span>Total: {service.cost}</span> : null}
                            {service.notes ? <span>Notes: {service.notes}</span> : null}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <ActionButton tone="ghost" onClick={() => beginEditingService(service)}>
                            Edit
                          </ActionButton>
                          <ActionButton tone="danger" onClick={() => removeService(service.id)}>
                            Delete
                          </ActionButton>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-white p-6">
              <SectionTitle
                eyebrow={editingServiceId ? "Editing Service" : "New Service"}
                title={editingServiceId ? "Update service details" : "Add a new service"}
                body="Keep the description concise and use capacity or pricing notes only when they help clients choose."
              />
              <div className="mt-6 grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  Service name
                  <input
                    value={serviceDraft.name}
                    onChange={(event) =>
                      setServiceDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Court Rental"
                    className="min-h-12 rounded-2xl border border-[var(--line)] px-4 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  Booking type
                  <select
                    value={serviceDraft.bookingType}
                    onChange={(event) =>
                      setServiceDraft((current) => ({
                        ...current,
                        bookingType: event.target.value as BookingType,
                      }))
                    }
                    className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 outline-none transition focus:border-[var(--accent)]"
                  >
                    <option value="appointment">Appointment</option>
                    <option value="full-day">Full Day</option>
                  </select>
                </label>
                {serviceDraft.bookingType === "appointment" ? (
                  <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                    Duration
                    <select
                      value={serviceDraft.durationMinutes}
                      onChange={(event) =>
                        setServiceDraft((current) => ({
                          ...current,
                          durationMinutes: Number(event.target.value),
                        }))
                      }
                      className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 outline-none transition focus:border-[var(--accent)]"
                    >
                      {DURATION_OPTIONS.map((duration) => (
                        <option key={duration} value={duration}>
                          {duration >= 60 && duration % 60 === 0
                            ? `${duration / 60} hour${duration === 60 ? "" : "s"}`
                            : `${duration} minutes`}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  Description
                  <textarea
                    value={serviceDraft.description}
                    onChange={(event) =>
                      setServiceDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Explain what the booking covers in one or two lines."
                    rows={4}
                    className="rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  Capacity
                  <input
                    value={serviceDraft.capacity}
                    onChange={(event) =>
                      setServiceDraft((current) => ({ ...current, capacity: event.target.value }))
                    }
                    placeholder="Max 12 people"
                    className="min-h-12 rounded-2xl border border-[var(--line)] px-4 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  Total
                  <input
                    value={serviceDraft.cost}
                    onChange={(event) =>
                      setServiceDraft((current) => ({
                        ...current,
                        cost: event.target.value,
                      }))
                    }
                    placeholder="$80 / session"
                    className="min-h-12 rounded-2xl border border-[var(--line)] px-4 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  Notes
                  <input
                    value={serviceDraft.notes}
                    onChange={(event) =>
                      setServiceDraft((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Bring prior records or arrive 10 minutes early."
                    className="min-h-12 rounded-2xl border border-[var(--line)] px-4 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton tone="primary" onClick={upsertService}>
                  {editingServiceId ? "Save service" : "Add service"}
                </ActionButton>
                <ActionButton tone="ghost" onClick={resetServiceEditor}>
                  Clear form
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}

        {setupStep === 3 ? (
          <div className="mt-8 rounded-[28px] border border-[var(--line)] bg-white p-6">
            <SectionTitle
              title="Set the weekly availability schedule"
              body="Appointment services generate real slots from these windows. Full-day services simply need the weekday enabled and free of conflicts."
            />
            <div className="mt-6 grid gap-3">
              {WEEKDAY_KEYS.map((day) => (
                <div
                  key={day}
                  className="grid gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 sm:grid-cols-[1.1fr_0.8fr_0.8fr]"
                >
                  <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
                    <input
                      checked={availability[day].enabled}
                      onChange={(event) =>
                        updateAvailabilityDay(day, { enabled: event.target.checked })
                      }
                      type="checkbox"
                      className="h-5 w-5 rounded border-[var(--line)] text-[var(--accent)]"
                    />
                    {WEEKDAY_LABELS[day]}
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
                    Start
                    <input
                      disabled={!availability[day].enabled}
                      value={availability[day].startTime}
                      onChange={(event) =>
                        updateAvailabilityDay(day, { startTime: event.target.value })
                      }
                      type="time"
                      className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 disabled:opacity-45"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
                    End
                    <input
                      disabled={!availability[day].enabled}
                      value={availability[day].endTime}
                      onChange={(event) =>
                        updateAvailabilityDay(day, { endTime: event.target.value })
                      }
                      type="time"
                      className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 disabled:opacity-45"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {setupStep === 4 ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[28px] border border-[var(--line)] bg-white p-6">
              <SectionTitle
                eyebrow="Ready To Launch"
                title="Your booking page is prepared"
                body="Publish the standalone setup now, then manage bookings from the provider workspace or test the client journey immediately."
              />
              <div className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Public booking URL
                </p>
                <p className="mt-2 break-all text-sm font-medium text-[var(--ink)]">{publicUrl}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton tone="primary" onClick={() => completeSetup("management")}>
                  Go to dashboard
                </ActionButton>
                <ActionLink
                  href={`/public/${businessSlug}`}
                  tone="secondary"
                  onClick={() => completeSetup("public")}
                >
                  Open public booking page
                </ActionLink>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-6">
              <SectionTitle
                title="What is ready right away"
                body="Management dashboard, searchable booking list, calendar, editable services, settings, public booking wizard, rescheduling, cancellation, and iCal export are all wired to the same store."
              />
              <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--muted)]">
                <p>Timed appointments generate slots from your weekly schedule.</p>
                <p>Full-day reservations book the entire day with no time selection.</p>
                <p>Integrated mode can later inject provider, services, availability, and existing bookings to skip setup entirely.</p>
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
            disabled={setupStep === 1}
            onClick={() => setSetupStep((current) => (current > 1 ? ((current - 1) as SetupStep) : current))}
          >
            Back
          </ActionButton>
          {setupStep < 4 ? (
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
              label: "Public URL",
              value: businessSlug ? `/${businessSlug}` : "/public",
              detail: "Shareable booking path",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[28px] border border-[var(--line)] bg-white p-5"
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

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-[var(--line)] bg-white p-6">
            <SectionTitle
              title="Upcoming bookings"
              body="Provider-side actions let you cancel or reschedule any booking without leaving the dashboard."
            />
            <div className="mt-6 space-y-3">
              {upcomingBookings.length === 0 ? (
                <EmptyState
                  title="No bookings in the next 7 days"
                  body="The standalone dashboard will update instantly once you create a booking from the public flow or the calendar testing shortcut."
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
                    className="rounded-3xl border border-[var(--line)] bg-[var(--surface-soft)] p-4"
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

          <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-6">
            <SectionTitle
              eyebrow="Share"
              title="Public booking page"
              body="Give clients a direct link to the step-by-step booking wizard. The same public page is used by the standalone demo and any future host application."
            />
            <div className="mt-6 rounded-3xl border border-white bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Booking link
              </p>
              <p className="mt-2 break-all text-sm font-medium text-[var(--ink)]">{publicUrl}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionButton tone="primary" onClick={copyPublicLink}>
                {copiedLink ? "Copied" : "Copy link"}
              </ActionButton>
            </div>
            <div className="mt-8 rounded-3xl border border-white bg-white/90 p-4">
              <p className="text-sm font-semibold text-[var(--ink)]">Quick testing</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Use the monthly calendar tab to click a free day and jump straight into the booking flow with a service preselected.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderBookingsList() {
    return (
      <div className="space-y-6">
        <SectionTitle
          title="All bookings"
          body="Search clients, scan booking types, and filter by status without leaving the provider workspace."
        />
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search client, service, email, or phone"
            className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 outline-none transition focus:border-[var(--accent)]"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | BookingStatus)}
            className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 outline-none transition focus:border-[var(--accent)]"
          >
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | BookingType)}
            className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 outline-none transition focus:border-[var(--accent)]"
          >
            <option value="all">All types</option>
            <option value="appointment">Appointments</option>
            <option value="full-day">Full Day</option>
          </select>
        </div>
        <div className="space-y-3">
          {filteredBookings.length === 0 ? (
            <EmptyState
              title="No bookings match the current filters"
              body="Try a broader search or create the first booking from the public flow."
            />
          ) : (
            filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-[28px] border border-[var(--line)] bg-white p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
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
                    <div className="mt-2 grid gap-1 text-sm text-[var(--muted)]">
                      <p>
                        {formatDateLabel(booking.dateKey)} ·{" "}
                        {formatTimeRange(booking.startTime, booking.endTime)}
                      </p>
                      <p>
                        {booking.clientEmail} · {booking.clientPhone}
                      </p>
                      <p>
                        {booking.capacitySnapshot
                          ? `Capacity: ${booking.capacitySnapshot}`
                          : "Capacity not set"}
                      </p>
                      <p>{booking.cost ? `Total: ${booking.cost}` : "Total not set"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
      <div className="space-y-6">
        <SectionTitle
          title="Monthly calendar"
          body="Timed bookings appear inside the day cell, while full-day reservations are emphasized as solid bars. Clicking a free day launches the booking flow for testing."
          action={
            services.length > 0 ? (
              <select
                value={activeCalendarService?.id ?? ""}
                onChange={(event) => setCalendarServicePreference(event.target.value)}
                className="min-h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--accent)]"
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    Test with {service.name}
                  </option>
                ))}
              </select>
            ) : null
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--line)] bg-white px-4 py-3">
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
                      "min-h-[148px] rounded-[26px] border p-3 text-left transition",
                      inMonth
                        ? "border-[var(--line)] bg-white"
                        : "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]",
                      canTest && "hover:border-[var(--accent)] hover:shadow-[0_18px_48px_rgba(15,23,42,0.08)]",
                      !canTest && "cursor-default",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        {date.getDate()}
                      </span>
                      {canTest ? (
                        <ToneBadge tone="primary">Free to test</ToneBadge>
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
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <SectionTitle
            title="Services"
            body="Create, edit, and review every offering from one place. Integrated mode keeps this list visible while preventing internal edits."
          />
          {integratedMode ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-medium text-[var(--muted)]">
              Configured by parent app. Service editing is intentionally read-only in this mode.
            </div>
          ) : null}
          <div className="space-y-3">
            {services.length === 0 ? (
              <EmptyState
                title="No services available"
                body="Add at least one service so the public booking flow can open."
              />
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-[28px] border border-[var(--line)] bg-white p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-[var(--ink)]">
                          {service.name}
                        </h4>
                        <ToneBadge tone={bookingTypeTone(service.bookingType)}>
                          {getBookingTypeLabel(service.bookingType)}
                        </ToneBadge>
                        <ToneBadge tone="neutral">{formatDuration(service)}</ToneBadge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {service.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                        {service.capacity ? <span>Capacity: {service.capacity}</span> : null}
                        {service.cost ? <span>Total: {service.cost}</span> : null}
                        {service.notes ? <span>Notes: {service.notes}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        tone="ghost"
                        disabled={integratedMode}
                        onClick={() => beginEditingService(service)}
                      >
                        Edit
                      </ActionButton>
                      <ActionButton
                        tone="danger"
                        disabled={integratedMode}
                        onClick={() => removeService(service.id)}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--line)] bg-white p-6">
          <SectionTitle
            eyebrow={editingServiceId ? "Edit Service" : "Add New Service"}
            title={editingServiceId ? "Update this service" : "Create another service"}
            body="Keep the module reusable by describing what is booked rather than the current business only."
          />
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Service name
              <input
                disabled={integratedMode}
                value={serviceDraft.name}
                onChange={(event) =>
                  setServiceDraft((current) => ({ ...current, name: event.target.value }))
                }
                className="min-h-12 rounded-2xl border border-[var(--line)] px-4 disabled:opacity-45"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Booking type
              <select
                disabled={integratedMode}
                value={serviceDraft.bookingType}
                onChange={(event) =>
                  setServiceDraft((current) => ({
                    ...current,
                    bookingType: event.target.value as BookingType,
                  }))
                }
                className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 disabled:opacity-45"
              >
                <option value="appointment">Appointment</option>
                <option value="full-day">Full Day</option>
              </select>
            </label>
            {serviceDraft.bookingType === "appointment" ? (
              <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                Duration
                <select
                  disabled={integratedMode}
                  value={serviceDraft.durationMinutes}
                  onChange={(event) =>
                    setServiceDraft((current) => ({
                      ...current,
                      durationMinutes: Number(event.target.value),
                    }))
                  }
                  className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 disabled:opacity-45"
                >
                  {DURATION_OPTIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} min
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Description
              <textarea
                disabled={integratedMode}
                value={serviceDraft.description}
                onChange={(event) =>
                  setServiceDraft((current) => ({ ...current, description: event.target.value }))
                }
                rows={4}
                className="rounded-2xl border border-[var(--line)] px-4 py-3 disabled:opacity-45"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Capacity
              <input
                disabled={integratedMode}
                value={serviceDraft.capacity}
                onChange={(event) =>
                  setServiceDraft((current) => ({ ...current, capacity: event.target.value }))
                }
                className="min-h-12 rounded-2xl border border-[var(--line)] px-4 disabled:opacity-45"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Total
              <input
                disabled={integratedMode}
                value={serviceDraft.cost}
                onChange={(event) =>
                  setServiceDraft((current) => ({
                    ...current,
                    cost: event.target.value,
                  }))
                }
                className="min-h-12 rounded-2xl border border-[var(--line)] px-4 disabled:opacity-45"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Notes
              <input
                disabled={integratedMode}
                value={serviceDraft.notes}
                onChange={(event) =>
                  setServiceDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="min-h-12 rounded-2xl border border-[var(--line)] px-4 disabled:opacity-45"
              />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton tone="primary" disabled={integratedMode} onClick={upsertService}>
              {editingServiceId ? "Save changes" : "Add new service"}
            </ActionButton>
            <ActionButton tone="ghost" onClick={resetServiceEditor}>
              Clear
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] border border-[var(--line)] bg-white p-6">
          <SectionTitle
            title="Provider information"
            body="These fields drive the management shell, public page branding, and confirmation details."
          />
          {integratedMode ? (
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
              Configured by parent app. These settings are visible but not editable.
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Changes save instantly in standalone mode.
            </p>
          )}
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Full name
              <input
                disabled={integratedMode}
                value={provider.fullName}
                onChange={(event) => updateProvider("fullName", event.target.value)}
                className="min-h-12 rounded-2xl border border-[var(--line)] px-4 disabled:opacity-45"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Business name
              <input
                disabled={integratedMode}
                value={provider.businessName}
                onChange={(event) => updateProvider("businessName", event.target.value)}
                className="min-h-12 rounded-2xl border border-[var(--line)] px-4 disabled:opacity-45"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Confirmation email
              <input
                disabled={integratedMode}
                value={provider.email}
                onChange={(event) => updateProvider("email", event.target.value)}
                className="min-h-12 rounded-2xl border border-[var(--line)] px-4 disabled:opacity-45"
              />
            </label>
          </div>

          <div className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Public booking URL
            </p>
            <p className="mt-2 break-all text-sm font-medium text-[var(--ink)]">{publicUrl}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ActionButton tone="primary" onClick={copyPublicLink}>
                {copiedLink ? "Copied" : "Copy link"}
              </ActionButton>
            </div>
          </div>

          {!integratedMode ? (
            <div className="mt-6">
              <ActionButton tone="danger" onClick={resetStandaloneSetup}>
                Reset standalone setup
              </ActionButton>
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-[var(--line)] bg-white p-6">
          <SectionTitle
            title="Weekly availability"
            body="Availability changes are reflected immediately in both the public booking flow and the provider calendar."
          />
          <div className="mt-6 grid gap-3">
            {WEEKDAY_KEYS.map((day) => (
              <div
                key={day}
                className="grid gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 sm:grid-cols-[1.1fr_0.8fr_0.8fr]"
              >
                <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
                  <input
                    disabled={integratedMode}
                    checked={availability[day].enabled}
                    onChange={(event) =>
                      updateAvailabilityDay(day, { enabled: event.target.checked })
                    }
                    type="checkbox"
                    className="h-5 w-5 rounded border-[var(--line)] text-[var(--accent)] disabled:opacity-45"
                  />
                  {WEEKDAY_LABELS[day]}
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
                  Start
                  <input
                    disabled={integratedMode || !availability[day].enabled}
                    value={availability[day].startTime}
                    onChange={(event) =>
                      updateAvailabilityDay(day, { startTime: event.target.value })
                    }
                    type="time"
                    className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 disabled:opacity-45"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
                  End
                  <input
                    disabled={integratedMode || !availability[day].enabled}
                    value={availability[day].endTime}
                    onChange={(event) =>
                      updateAvailabilityDay(day, { endTime: event.target.value })
                    }
                    type="time"
                    className="min-h-12 rounded-2xl border border-[var(--line)] bg-white px-4 disabled:opacity-45"
                  />
                </label>
              </div>
            ))}
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
            "flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-3",
            publicGlassBarClass,
          )}
        >
          <div className="flex items-center gap-2">
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              disabled={!canGoToPreviousPublicMonth}
              onClick={() => setPublicMonthAnchor((current) => shiftMonth(current, -1))}
            >
              Previous
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              onClick={() => setPublicMonthAnchor(new Date())}
            >
              Today
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              onClick={() => setPublicMonthAnchor((current) => shiftMonth(current, 1))}
            >
              Next
            </ActionButton>
          </div>
          <p className="text-base font-semibold text-[var(--ink)]">
            {formatMonthLabel(publicMonthAnchor)}
          </p>
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
                      setBookingFlow((current) => ({
                        ...current,
                        dateKey,
                        time: "",
                      }));
                    }}
                    className={cn(
                      "min-h-[88px] rounded-[24px] p-3 text-left transition md:min-h-[104px]",
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        {date.getDate()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {chosen ? (
                          <span className={cn("shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[var(--accent)]", compactBadgeTextClass)}>
                            Selected
                          </span>
                        ) : null}
                        {!chosen && isToday ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-full bg-[var(--surface-soft)] px-1.5 py-0.5 text-[var(--muted)]",
                              compactBadgeTextClass,
                            )}
                          >
                            Today
                          </span>
                        ) : null}
                        {!chosen && !isToday && available ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
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
          : "Not yet"
      : step2DateChosen
        ? `${formatDateLabel(bookingFlow.dateKey)} · Full day`
        : "Not yet";
    const step2Helper = step2IsAppointment
      ? !step2DateChosen
        ? "Pick a date and time to continue."
        : !step2TimeChosen
          ? "Pick a time slot to continue."
          : "Ready to continue. Click the button to enter your details."
      : !step2DateChosen
        ? "Pick a date to reserve the full day."
        : step2DateAvailableForFullDay
          ? "This day is free. Click the button to enter your details."
          : "This day isn't available. Pick another date.";
    const step2ButtonLabel = step2IsAppointment ? "Continue to My Details" : "Book full day";

    return (
      <>
        {(isPublicSelectionStep || isPublicDetailsStep || isPublicSuccessStep) &&
        selectedService ? (
          <>
            <div ref={stickyHeaderSentinelRef} aria-hidden="true" className="h-0" />
            <div
              className={cn(
                "relative isolate px-5 pt-5 sm:px-8 sm:pt-8 transition-[filter,padding-bottom] duration-500 ease-out before:pointer-events-none before:absolute before:-inset-x-8 before:-top-8 before:-bottom-9 before:z-0 before:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.7)_46%,rgba(255,255,255,0.34)_72%,rgba(255,255,255,0)_100%)] before:opacity-0 before:backdrop-blur-[28px] before:transition-opacity before:duration-500 before:ease-out before:[-webkit-mask-image:radial-gradient(ellipse_at_center,black_64%,transparent_86%)] before:[mask-image:radial-gradient(ellipse_at_center,black_64%,transparent_86%)] sm:before:-inset-x-10 sm:before:-top-10 sm:before:-bottom-11 xl:before:-inset-x-12 xl:before:-top-12 xl:before:-bottom-12",
                isPublicSelectionStep && "sticky top-4 z-30",
                isDedicatedPublicPage && "xl:px-10 xl:pt-10",
                isStickyHeaderActive &&
                  "pb-6 drop-shadow-[0_14px_34px_rgba(15,23,42,0.1)] before:opacity-100 sm:pb-8 xl:pb-10",
              )}
            >
            <div className={cn("relative z-10", stickyBarPanelClass)}>
              <div className="px-5 py-5 sm:px-7 sm:py-6">
                <PublicProgressIndicator
                  currentStep={resolvedBookingFlow.step as 2 | 3 | 4}
                  isDedicatedPublicPage={isDedicatedPublicPage}
                />
              </div>
              {isPublicSelectionStep ? (
                <>
                  <div className="h-px bg-[rgba(15,23,42,0.06)]" aria-hidden="true" />
                  <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-6 sm:pt-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className={cn(compactMetaTextClass, "text-[var(--muted)]")}>
                            Your selection
                          </p>
                          <p className="text-lg font-semibold text-[var(--ink)]">
                            {step2Summary}
                          </p>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                          {step2Helper}
                        </p>
                      </div>
                      <div className="flex w-full flex-wrap items-center justify-end gap-3 lg:w-auto">
                        <ActionButton
                          tone="primary"
                          className={cn("min-w-[150px] px-6", publicPrimaryActionClass)}
                          disabled={!step2CanContinue}
                          onClick={() => beginClientDetailsStep()}
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
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p
                            className={cn(
                              compactMetaTextClass,
                              isBookingHoldExpired
                                ? "text-[#be123c]"
                                : "text-[var(--muted)]",
                            )}
                          >
                            Time remaining
                          </p>
                          <p
                            className={cn(
                              "text-lg font-semibold tabular-nums text-[var(--ink)]",
                              isBookingHoldExpired && "text-[#be123c]",
                            )}
                          >
                            {isBookingHoldExpired
                              ? "Expired"
                              : formatCountdown(bookingHoldRemainingMs)}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "mt-1 text-sm leading-6 text-[var(--muted)]",
                            isBookingHoldExpired && "text-[#be123c]",
                          )}
                        >
                          {isBookingHoldExpired
                            ? "The time slot may not be available, but you can still try to book."
                            : "Finish within 10 minutes to keep this booking selection fresh."}
                        </p>
                      </div>
                      <div className="flex w-full flex-wrap items-center justify-end gap-3 lg:w-auto">
                        <ActionButton
                          tone="ghost"
                          className={cn(
                            "min-w-[150px] px-6",
                            isDedicatedPublicPage &&
                              cn(publicPillButtonClass, publicGhostButtonClass),
                          )}
                          onClick={() => {
                            releaseBookingHold(
                              bookingHold?.released ? undefined : bookingHold?.id,
                            );
                            setBookingHold(null);
                            setBookingHoldNow(currentTimestamp());
                            setBookingError(null);
                            setWasBookingUpdatedWithNaturalLanguage(false);
                            setIsNLBookingOpen(false);
                            setNaturalLanguageBookingInput("");
                            setNaturalLanguageBookingError(null);
                            setBookingFlow((current) => ({ ...current, step: 2 }));
                          }}
                        >
                          Back
                        </ActionButton>
                        <ActionButton
                          tone="primary"
                          className={cn("min-w-[150px] px-6", publicPrimaryActionClass)}
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
              "grid gap-5 p-5 sm:p-8",
              isDedicatedPublicPage && "xl:px-10 xl:py-10",
              isPublicSelectionStep
                ? "lg:grid-cols-1"
                : "lg:grid-cols-3",
            )}
          >
            <div
              ref={publicPrimaryPanelRef}
              className={cn(
                publicPrimaryPanelClass,
                isPublicSelectionStep && "transition-opacity duration-200",
                isPublicSelectionStep && shouldDimManualBookingPanels && "opacity-50",
              )}
              style={
                (isPublicDetailsStep || isPublicSuccessStep) && publicPrimaryPanelHeight
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
                  <div className="relative mt-6">
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
                  "self-start lg:sticky lg:top-8 flex min-h-full flex-col",
                  publicSoftPanelClass,
                )}
                style={
                  publicPrimaryPanelHeight
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
                <div className={cn("mt-6 flex-1", publicInsetCardClass)}>
                  {isPublicSuccessStep && successfulBooking && !isSuccessfulBookingCancelled ? (
                    <div className="flex h-full flex-col items-center justify-center">
                      {calendarQrCode?.bookingId === successfulBooking.id && calendarQrCode.url ? (
                        <div
                          aria-label="QR code to add this booking to a calendar"
                          className="w-full aspect-square bg-contain bg-center bg-no-repeat"
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
                "self-start lg:sticky lg:top-8",
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
                isPublicSelectionStep &&
                selectedService.bookingType === "appointment" &&
                bookingFlow.dateKey &&
                publicPrimaryPanelHeight
                  ? { maxHeight: `${publicPrimaryPanelHeight}px` }
                  : (isPublicDetailsStep || isPublicSuccessStep) && publicPrimaryPanelHeight
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
                          <div className="space-y-2">
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
                  <div className={cn("mt-6 flex-1", publicInsetCardClass)}>
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
                  <ActionButton
                    tone="secondary"
                    className={cn(
                      "min-w-[150px]",
                      isDedicatedPublicPage && publicPillButtonClass,
                    )}
                    onClick={() => startFreshBooking()}
                  >
                    Book another
                  </ActionButton>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

      </>
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
            Cancelling frees the slot immediately across the dashboard, public flow, and calendar.
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
              {service.bookingType === "appointment" ? (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          setRescheduleState((current) =>
                            current ? { ...current, time: slot } : current,
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

  if (surfaceMode === "public-only" && (!activeStore.setupComplete || !publicRouteReady)) {
    return (
      <section className={cn(publicShellClass, "p-6 sm:p-8")}>
        <SectionTitle
          eyebrow="Public booking page"
          title="This booking page is not available yet"
          body="This booking page is not live yet. Please use the shared booking link from the provider once setup is complete."
        />
      </section>
    );
  }

  if (isSetupOpen) {
    return (
      <section className={cn(publicShellClass, "p-5 sm:p-8")}>
        {renderSetupWizard()}
      </section>
    );
  }

  return (
    <>
      <section className={publicShellClass}>
        {!isDedicatedPublicPage ? (
          <div className="border-b border-[var(--line)] p-5 sm:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                {!isPublicView ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone="primary">Haab Calendar</ToneBadge>
                    <ToneBadge tone="secondary">Reusable module</ToneBadge>
                    {integratedMode ? (
                      <ToneBadge tone="neutral">Configured by parent app</ToneBadge>
                    ) : (
                      <ToneBadge tone="secondary">Standalone mode</ToneBadge>
                    )}
                  </div>
                ) : null}
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
                  {provider.businessName || provider.fullName || "Booking workspace"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  One module for timed appointments and full-day bookings, with a provider workspace and a premium client-facing booking wizard powered by the same data.
                </p>
              </div>

              <div className="flex w-full max-w-xl flex-col gap-3 xl:items-end">
                {surfaceMode === "adaptive" && !isPublicView ? (
                  <div className="flex w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-1">
                    {(["management", "public"] as Surface[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSurface(item)}
                        className={cn(
                          "min-h-11 flex-1 rounded-2xl px-4 text-sm font-semibold transition",
                          surface === item
                            ? "bg-white text-[var(--ink)] shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
                            : "text-[var(--muted)]",
                        )}
                      >
                        {item === "management" ? "Provider workspace" : "Public booking flow"}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex w-full flex-col gap-3 rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    Public booking URL
                  </p>
                  <p className="break-all text-sm font-medium text-[var(--ink)]">{publicUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton tone="primary" onClick={copyPublicLink}>
                      {copiedLink ? "Copied" : "Copy link"}
                    </ActionButton>
                  </div>
                </div>
              </div>
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
                        : "bg-[var(--surface-soft)] text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </nav>
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

      {renderCancellationModal()}
      {renderRescheduleModal()}
    </>
  );
}
