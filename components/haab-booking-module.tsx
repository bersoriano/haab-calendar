"use client";

import Link from "next/link";
import {
  startTransition,
  useDeferredValue,
  useEffect,
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
  customQuestionLabel: string;
  publicSlug: string;
};

type Service = {
  id: string;
  name: string;
  bookingType: BookingType;
  durationMinutes?: number;
  description: string;
  capacity?: string;
  notesOrPrice?: string;
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
  customAnswer: string;
  capacitySnapshot?: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
};

type ModuleStore = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings: BookingRecord[];
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
  notesOrPrice: string;
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
  customAnswer: string;
  successBookingId?: string;
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
      notesOrPrice: "Display: $120 consult",
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
      notesOrPrice: "Display: $40 per hour",
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
      notesOrPrice: "Display: Premium advisory session",
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
      notesOrPrice: "Display: Full-day venue package",
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
      notesOrPrice: "Display: Day pass bundle",
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

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
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
      customQuestionLabel: "Anything else we should prepare for?",
      publicSlug: "",
    },
    services: [],
    availability: createDefaultAvailability(),
    bookings: [],
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
    notesOrPrice: "",
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
    customAnswer: "",
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
    customQuestionLabel:
      source?.customQuestionLabel ?? "Anything else we should prepare for?",
    publicSlug:
      source?.publicSlug ??
      slugify(source?.businessName || source?.fullName || "haab-calendar"),
  };
}

function normalizeServices(source?: Service[] | null): Service[] {
  return (source ?? []).map((service) => ({
    ...service,
    durationMinutes:
      service.bookingType === "appointment"
        ? service.durationMinutes ?? 30
        : undefined,
  }));
}

function normalizeBookings(source?: BookingRecord[] | null): BookingRecord[] {
  return sortBookings(source ?? []);
}

function normalizeStore(source?: Partial<ModuleStore> | null): ModuleStore {
  const empty = createEmptyStore();

  return {
    provider: normalizeProvider(source?.provider),
    services: normalizeServices(source?.services),
    availability: normalizeAvailability(source?.availability),
    bookings: normalizeBookings(source?.bookings),
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

function getAvailableSlots(
  dateKey: string,
  service: Service,
  availability: WeeklyAvailability,
  bookings: BookingRecord[],
  ignoredBookingId?: string,
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

  if (dateBookings.some((booking) => booking.bookingType === "full-day")) {
    return [];
  }

  const slots: string[] = [];
  let cursor = daySchedule.startTime;

  while (toMinutes(cursor) + service.durationMinutes <= toMinutes(daySchedule.endTime)) {
    const slotEnd = addMinutes(cursor, service.durationMinutes);
    const blocked = dateBookings.some((booking) => {
      if (!booking.startTime || !booking.endTime) {
        return false;
      }

      return overlapExists(cursor, slotEnd, booking.startTime, booking.endTime);
    });

    if (!blocked) {
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
    return getAvailableSlots(dateKey, service, availability, bookings, ignoredBookingId).length > 0;
  }

  return getBookingsForDate(bookings, dateKey, ignoredBookingId).length === 0;
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

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function buildIcsContent(booking: BookingRecord, provider: ProviderInfo) {
  const safeSummary = escapeIcsText(booking.serviceName);
  const safeDescription = escapeIcsText(
    `Client: ${booking.clientName}\nPhone: ${booking.clientPhone}\nNotes: ${booking.notes || booking.customAnswer || "N/A"}`,
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
        "inline-flex items-center rounded-[0.75rem] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] backdrop-blur-[20px]",
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
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
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
  storageKey = "haab-calendar-standalone",
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
  const [standaloneStore, setStandaloneStore] = useState<ModuleStore>(() =>
    createEmptyStore(),
  );
  const [shadowBookings, setShadowBookings] = useState<BookingRecord[]>(() =>
    normalizeBookings(injectedConfig?.bookings),
  );
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
  const publicCalendarPanelRef = useRef<HTMLDivElement | null>(null);
  const [publicCalendarPanelHeight, setPublicCalendarPanelHeight] = useState<number | null>(
    null,
  );
  const publicDetailsPanelRef = useRef<HTMLDivElement | null>(null);
  const [publicDetailsPanelHeight, setPublicDetailsPanelHeight] = useState<number | null>(
    null,
  );

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

  const activeStore: ModuleStore = integratedMode
    ? {
        provider: normalizeProvider(injectedConfig?.provider),
        services: normalizeServices(injectedConfig?.services),
        availability: normalizeAvailability(injectedConfig?.availability),
        bookings: shadowBookings,
        setupComplete: true,
      }
    : standaloneStore;

  const provider = activeStore.provider;
  const services = activeStore.services;
  const bookings = activeStore.bookings;
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
    ? "rounded-[34px] bg-[rgba(243,244,245,0.86)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_26px_64px_rgba(25,28,29,0.05)] xl:p-8"
    : "rounded-[28px] border border-[var(--line)] bg-white p-6 xl:p-8";
  const publicElevatedPanelClass = isDedicatedPublicPage
    ? "rounded-[32px] bg-[rgba(255,255,255,0.78)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_30px_70px_rgba(25,28,29,0.06)] backdrop-blur-[20px] xl:p-7"
    : "rounded-[28px] border border-[var(--line)] bg-white p-6 xl:p-7";
  const publicSoftPanelClass = isDedicatedPublicPage
    ? "rounded-[32px] bg-[rgba(243,244,245,0.84)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_24px_54px_rgba(25,28,29,0.04)] xl:p-7"
    : "rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-6 xl:p-7";
  const publicInsetCardClass = isDedicatedPublicPage
    ? "rounded-[28px] bg-[rgba(255,255,255,0.72)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] backdrop-blur-[18px]"
    : "rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-5";
  const calendarNavPillClass =
    "rounded-full border border-[rgba(193,198,214,0.5)] bg-[rgba(255,255,255,0.78)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_30px_rgba(25,28,29,0.04)] backdrop-blur-[18px] hover:border-[rgba(26,115,232,0.22)] hover:bg-[rgba(255,255,255,0.92)] hover:text-[var(--ink)]";
  const publicFieldClass = isDedicatedPublicPage
    ? "min-h-14 rounded-[24px] bg-[rgba(243,244,245,0.96)] px-4 pb-3 pt-4 text-[var(--ink)] shadow-[inset_0_-2px_0_rgba(26,115,232,0.05),inset_0_1px_0_rgba(255,255,255,0.72)] outline-none transition placeholder:text-[rgba(25,28,29,0.42)] focus:bg-[rgba(255,255,255,0.96)] focus:ring-2 focus:ring-[rgba(26,115,232,0.2)]"
    : "min-h-12 rounded-2xl border border-[var(--line)] px-4 outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]";
  const publicTextareaClass = isDedicatedPublicPage
    ? "rounded-[24px] bg-[rgba(243,244,245,0.96)] px-4 pb-3 pt-4 text-[var(--ink)] shadow-[inset_0_-2px_0_rgba(26,115,232,0.05),inset_0_1px_0_rgba(255,255,255,0.72)] outline-none transition placeholder:text-[rgba(25,28,29,0.42)] focus:bg-[rgba(255,255,255,0.96)] focus:ring-2 focus:ring-[rgba(26,115,232,0.2)]"
    : "rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]";

  useEffect(() => {
    if (resolvedBookingFlow.step !== 2) {
      return;
    }

    const node = publicCalendarPanelRef.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    let frameId = 0;
    const syncHeight = () => {
      const nextHeight = Math.ceil(node.getBoundingClientRect().height);
      setPublicCalendarPanelHeight((current) =>
        current === nextHeight ? current : nextHeight,
      );
    };

    frameId = window.requestAnimationFrame(syncHeight);

    const observer = new ResizeObserver(() => {
      syncHeight();
    });

    observer.observe(node);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [resolvedBookingFlow.step]);

  useEffect(() => {
    if (resolvedBookingFlow.step !== 3) {
      return;
    }

    const node = publicDetailsPanelRef.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    let frameId = 0;
    const syncHeight = () => {
      const nextHeight = Math.ceil(node.getBoundingClientRect().height);
      setPublicDetailsPanelHeight((current) =>
        current === nextHeight ? current : nextHeight,
      );
    };

    frameId = window.requestAnimationFrame(syncHeight);

    const observer = new ResizeObserver(() => {
      syncHeight();
    });

    observer.observe(node);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [resolvedBookingFlow.step]);

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

  function commitBookings(nextBookings: BookingRecord[]) {
    const normalized = sortBookings(nextBookings);

    if (integratedMode) {
      setShadowBookings(normalized);
      onBookingsChange?.(normalized);
      emitStoreChange({
        provider: normalizeProvider(injectedConfig?.provider),
        services: normalizeServices(injectedConfig?.services),
        availability: normalizeAvailability(injectedConfig?.availability),
        bookings: normalized,
        setupComplete: true,
      });
      return;
    }

    updateStandaloneStore((current) => ({
      ...current,
      bookings: normalized,
    }));
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
    setBookingFlow({
      ...base,
      ...overrides,
      serviceId: nextServiceId,
      step: overrides?.step ?? nextStep,
    });
  }

  function launchPublicFlow(overrides?: Partial<BookingFlow>) {
    startFreshBooking(overrides);
    startTransition(() => {
      setSurface("public");
    });
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
      notesOrPrice: service.notesOrPrice ?? "",
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
      notesOrPrice: serviceDraft.notesOrPrice.trim() || undefined,
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
    setBookingFlow((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function confirmBooking() {
    if (!selectedService) {
      setBookingError("Choose a service before confirming the booking.");
      return;
    }

    if (!bookingFlow.dateKey) {
      setBookingError("Pick a date before confirming the booking.");
      return;
    }

    if (selectedService.bookingType === "appointment" && !bookingFlow.time) {
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
      selectedService.bookingType === "appointment" &&
      !getAvailableSlots(
        bookingFlow.dateKey,
        selectedService,
        availability,
        bookings,
      ).includes(bookingFlow.time)
    ) {
      setBookingError("That slot was no longer free. Pick another time and try again.");
      setBookingFlow((current) => ({ ...current, step: 2 }));
      return;
    }

    if (
      selectedService.bookingType === "full-day" &&
      !isDateAvailable(bookingFlow.dateKey, selectedService, availability, bookings)
    ) {
      setBookingError("That day is no longer available. Choose another date.");
      setBookingFlow((current) => ({ ...current, step: 2 }));
      return;
    }

    const createdAt = new Date().toISOString();
    const nextBooking: BookingRecord = {
      id: createId("booking"),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      bookingType: selectedService.bookingType,
      dateKey: bookingFlow.dateKey,
      startTime:
        selectedService.bookingType === "appointment" ? bookingFlow.time : undefined,
      endTime:
        selectedService.bookingType === "appointment" && selectedService.durationMinutes
          ? addMinutes(bookingFlow.time, selectedService.durationMinutes)
          : undefined,
      clientName: bookingFlow.clientName.trim(),
      clientEmail: bookingFlow.clientEmail.trim(),
      clientPhone: bookingFlow.clientPhone.trim(),
      notes: bookingFlow.notes.trim(),
      customAnswer: bookingFlow.customAnswer.trim(),
      capacitySnapshot: selectedService.capacity,
      status: "confirmed",
      createdAt,
      updatedAt: createdAt,
    };

    commitBookings([...bookings, nextBooking]);
    setBookingError(null);
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

    setRescheduleState({
      bookingId,
      dateKey: booking.dateKey,
      time: booking.startTime ?? "",
      monthAnchor: parseDateKey(booking.dateKey),
    });
  }

  function confirmReschedule() {
    if (!rescheduleState) {
      return;
    }

    const booking = bookings.find((candidate) => candidate.id === rescheduleState.bookingId);
    const service = services.find((candidate) => candidate.id === booking?.serviceId);

    if (!booking || !service) {
      return;
    }

    if (!rescheduleState.dateKey) {
      return;
    }

    if (service.bookingType === "appointment") {
      const nextSlots = getAvailableSlots(
        rescheduleState.dateKey,
        service,
        availability,
        bookings,
        booking.id,
      );

      if (!nextSlots.includes(rescheduleState.time)) {
        return;
      }
    } else if (
      !isDateAvailable(rescheduleState.dateKey, service, availability, bookings, booking.id)
    ) {
      return;
    }

    commitBookings(
      bookings.map((candidate) =>
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
    );
    setRescheduleState(null);
  }

  function confirmCancellation() {
    if (!cancellationId) {
      return;
    }

    commitBookings(
      bookings.map((booking) =>
        booking.id === cancellationId
          ? {
              ...booking,
              status: "cancelled",
              updatedAt: new Date().toISOString(),
            }
          : booking,
      ),
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
      ? getAvailableSlots(bookingFlow.dateKey, selectedService, availability, bookings)
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
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  Custom question label
                  <input
                    value={provider.customQuestionLabel}
                    onChange={(event) =>
                      updateProvider("customQuestionLabel", event.target.value)
                    }
                    placeholder="Anything else we should prepare for?"
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
                            {service.notesOrPrice ? <span>{service.notesOrPrice}</span> : null}
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
                  Notes or price display
                  <input
                    value={serviceDraft.notesOrPrice}
                    onChange={(event) =>
                      setServiceDraft((current) => ({
                        ...current,
                        notesOrPrice: event.target.value,
                      }))
                    }
                    placeholder="Display: $80 / session"
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
                  isDateAvailable(dateKey, activeCalendarService, availability, bookings);
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
                        {service.notesOrPrice ? <span>{service.notesOrPrice}</span> : null}
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
              Notes or price display
              <input
                disabled={integratedMode}
                value={serviceDraft.notesOrPrice}
                onChange={(event) =>
                  setServiceDraft((current) => ({
                    ...current,
                    notesOrPrice: event.target.value,
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
            <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
              Custom question label
              <input
                disabled={integratedMode}
                value={provider.customQuestionLabel}
                onChange={(event) => updateProvider("customQuestionLabel", event.target.value)}
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
    const earliestVisibleDate = addDays(new Date(), -7);
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
            isDedicatedPublicPage
              ? "bg-[rgba(255,255,255,0.72)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_24px_48px_rgba(25,28,29,0.04)] backdrop-blur-[18px]"
              : "border border-[var(--line)] bg-white",
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
            isDedicatedPublicPage
              ? "bg-[rgba(243,244,245,0.82)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
              : "border border-[var(--line)] bg-[var(--surface-soft)]",
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
                  ? isDateAvailable(dateKey, selectedService, availability, bookings)
                  : false;
                const chosen = bookingFlow.dateKey === dateKey;
                const isToday = dateKey === todayKey();

                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={!selectedService || !available}
                    onClick={() => {
                      setBookingError(null);
                      setBookingFlow((current) => ({
                        ...current,
                        dateKey,
                        time: "",
                      }));
                    }}
                    className={cn(
                      "min-h-[88px] rounded-[24px] p-3 text-left transition md:min-h-[104px]",
                      isDedicatedPublicPage &&
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_20px_42px_rgba(25,28,29,0.04)]",
                      inMonth
                        ? isDedicatedPublicPage
                          ? "bg-[rgba(255,255,255,0.78)]"
                          : "border border-[var(--line)] bg-white"
                        : isDedicatedPublicPage
                          ? "bg-[rgba(243,244,245,0.72)]"
                          : "border border-[var(--line)] bg-[var(--surface-soft)]",
                      available &&
                        (isDedicatedPublicPage
                          ? "hover:bg-[rgba(255,255,255,0.88)] hover:ring-2 hover:ring-[rgba(26,115,232,0.12)]"
                          : "hover:border-[var(--accent)]"),
                      chosen &&
                        (isDedicatedPublicPage
                          ? "bg-[rgba(255,255,255,0.92)] ring-2 ring-[rgba(26,115,232,0.18)]"
                          : "border-[var(--accent)] bg-[var(--accent-soft)]"),
                      !available && "cursor-default opacity-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        {date.getDate()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {chosen ? (
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                            Selected
                          </span>
                        ) : null}
                        {!chosen && isToday ? (
                          <span className="rounded-full bg-[var(--surface-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            Today
                          </span>
                        ) : null}
                        {available ? (
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
    return (
      <>
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
                  onClick={() =>
                    setBookingFlow((current) => ({
                      ...current,
                      serviceId: service.id,
                      dateKey: "",
                      time: "",
                      step: 2,
                    }))
                  }
                  className={cn(
                    "rounded-[30px] p-6 text-left transition",
                    isDedicatedPublicPage
                      ? "bg-[rgba(255,255,255,0.78)] shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_26px_54px_rgba(25,28,29,0.05)] backdrop-blur-[20px] hover:translate-y-[-2px] hover:bg-[rgba(255,255,255,0.92)]"
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
                    {service.notesOrPrice ? <span>{service.notesOrPrice}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {resolvedBookingFlow.step === 2 && selectedService ? (
          <div className={cn("grid gap-5 p-5 sm:p-8 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.78fr)]", isDedicatedPublicPage && "xl:px-10 xl:py-10")}>
            <div ref={publicCalendarPanelRef} className={publicPrimaryPanelClass}>
              <SectionTitle
                title="Pick a date and time"
                body={
                  selectedService.bookingType === "appointment"
                    ? "Available slots are generated from your weekly schedule and filtered against existing bookings."
                    : "Select a date and confirm the full-day reservation when the day is free."
                }
              />
              <div className="mt-6">{renderPublicCalendar()}</div>
            </div>

            <div
              className={cn(
                "self-start xl:sticky xl:top-8",
                publicElevatedPanelClass,
                selectedService.bookingType === "appointment" && bookingFlow.dateKey
                  ? "flex flex-col overflow-hidden"
                  : "",
              )}
              style={
                selectedService.bookingType === "appointment" &&
                bookingFlow.dateKey &&
                publicCalendarPanelHeight
                  ? { maxHeight: `${publicCalendarPanelHeight}px` }
                  : undefined
              }
            >
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
                        const slotEnd = addMinutes(slot, selectedService.durationMinutes ?? 30);
                        const isSelected = bookingFlow.time === slot;

                        return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => updateBookingFlow("time", slot)}
                          className={cn(
                            "relative flex w-full items-start justify-between gap-4 rounded-[24px] px-5 py-4 text-left transition",
                            isDedicatedPublicPage &&
                              "bg-[rgba(243,244,245,0.82)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
                            !isDedicatedPublicPage &&
                              "border border-[var(--line)] bg-[var(--surface-soft)]",
                            isSelected &&
                              (isDedicatedPublicPage
                                ? "bg-[rgba(255,255,255,0.9)] shadow-[0_26px_52px_rgba(25,28,29,0.06),inset_0_1px_0_rgba(255,255,255,0.84)]"
                                : "border-[var(--accent)] bg-[var(--accent-soft)]"),
                            !isSelected &&
                              (isDedicatedPublicPage
                                ? "hover:bg-[rgba(255,255,255,0.82)]"
                                : "hover:border-[var(--accent)]"),
                          )}
                        >
                          <span
                            className={cn(
                              "absolute bottom-4 left-0 top-4 w-1 rounded-full transition",
                              isSelected ? "bg-[var(--secondary-fixed)]" : "bg-transparent",
                            )}
                          />
                          <div className="pl-4">
                            <p className="text-base font-semibold text-[var(--ink)]">
                              {formatTimeLabel(slot)}
                            </p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                              Ends {formatTimeLabel(slotEnd)}
                            </p>
                          </div>
                          <span className="pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--action-teal-deep)]">
                            {isSelected ? "Selected" : "Open"}
                          </span>
                        </button>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  <ActionButton
                    tone="primary"
                    className={cn("shrink-0", isDedicatedPublicPage && "w-full justify-center")}
                    disabled={!bookingFlow.time}
                    onClick={() => setBookingFlow((current) => ({ ...current, step: 3 }))}
                  >
                    Continue to client details
                  </ActionButton>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className={publicInsetCardClass}>
                    <p className="text-sm font-medium text-[var(--muted)]">
                      {isDateAvailable(bookingFlow.dateKey, selectedService, availability, bookings)
                        ? "This day is currently free for a full-day reservation."
                        : "This day is unavailable. Choose another date from the calendar."}
                    </p>
                  </div>
                  <ActionButton
                    tone="primary"
                    className={cn(isDedicatedPublicPage && "w-full justify-center")}
                    disabled={
                      !isDateAvailable(bookingFlow.dateKey, selectedService, availability, bookings)
                    }
                    onClick={() => setBookingFlow((current) => ({ ...current, step: 3 }))}
                  >
                    Book full day
                  </ActionButton>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {resolvedBookingFlow.step === 3 && selectedService ? (
          <div className={cn("grid gap-5 p-5 sm:p-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]", isDedicatedPublicPage && "xl:px-10 xl:py-10")}>
            <div ref={publicDetailsPanelRef} className={publicPrimaryPanelClass}>
              <SectionTitle
                title="Client details"
                body="Enter the booking details here and confirm directly from the live summary."
              />
              <div className="mt-6 grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
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
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
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
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
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
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
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
                {provider.customQuestionLabel ? (
                  <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {provider.customQuestionLabel}
                    </span>
                    <input
                      value={bookingFlow.customAnswer}
                      onChange={(event) => updateBookingFlow("customAnswer", event.target.value)}
                      placeholder="Add your answer here"
                      className={publicFieldClass}
                    />
                  </label>
                ) : null}
              </div>
            </div>

            <div
              className={cn("self-start xl:sticky xl:top-8", publicSoftPanelClass)}
              style={
                publicDetailsPanelHeight
                  ? { minHeight: `${publicDetailsPanelHeight}px` }
                  : undefined
              }
            >
              <SectionTitle
                eyebrow="Booking summary"
                title="Live booking summary"
                body="This panel updates as the client details are entered so you can confirm from the same screen."
              />
              <div className={cn("mt-6 space-y-3 text-sm text-[var(--muted)]", publicInsetCardClass)}>
                {hasMultipleServices ? (
                  <p>
                    <span className="font-semibold text-[var(--ink)]">Service:</span> {selectedService.name}
                  </p>
                ) : null}
                <p>
                  <span className="font-semibold text-[var(--ink)]">Type:</span>{" "}
                  {getBookingTypeLabel(selectedService.bookingType)}
                </p>
                <p>
                  <span className="font-semibold text-[var(--ink)]">When:</span>{" "}
                  {bookingFlow.dateKey
                    ? `${formatDateLabel(bookingFlow.dateKey)} · ${
                        selectedService.bookingType === "appointment"
                          ? formatTimeLabel(bookingFlow.time)
                          : "Full Day"
                      }`
                    : "Not selected"}
                </p>
                {selectedService.capacity ? (
                  <p>
                    <span className="font-semibold text-[var(--ink)]">Capacity:</span>{" "}
                    {selectedService.capacity}
                  </p>
                ) : null}
                <p>
                  <span className="font-semibold text-[var(--ink)]">Client:</span>{" "}
                  {bookingFlow.clientName.trim() || "Not entered yet"}
                </p>
                <p>
                  <span className="font-semibold text-[var(--ink)]">Email:</span>{" "}
                  {bookingFlow.clientEmail.trim() || "Not entered yet"}
                </p>
                <p>
                  <span className="font-semibold text-[var(--ink)]">Phone:</span>{" "}
                  {bookingFlow.clientPhone.trim() || "Not entered yet"}
                </p>
                <p>
                  <span className="font-semibold text-[var(--ink)]">Notes:</span>{" "}
                  {bookingFlow.notes.trim() || "None"}
                </p>
                {provider.customQuestionLabel ? (
                  <p>
                    <span className="font-semibold text-[var(--ink)]">
                      {provider.customQuestionLabel}:
                    </span>{" "}
                    {bookingFlow.customAnswer.trim() || "Not entered yet"}
                  </p>
                ) : null}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <ActionButton
                  tone="ghost"
                  className="w-full px-6"
                  onClick={() => setBookingFlow((current) => ({ ...current, step: 2 }))}
                >
                  Back
                </ActionButton>
                <ActionButton
                  tone="primary"
                  className={cn("w-full px-6", isDedicatedPublicPage && "justify-center")}
                  onClick={confirmBooking}
                >
                  Confirm
                </ActionButton>
              </div>
              {bookingError ? (
                <div className="mt-4 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm font-medium text-[#be123c]">
                  {bookingError}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {resolvedBookingFlow.step === 4 && successfulBooking ? (
          <div
            className={cn(
              "grid gap-5 p-5 sm:p-8",
              isDedicatedPublicPage
                ? "mx-auto w-full xl:max-w-[50vw] xl:px-10 xl:py-10"
                : "xl:grid-cols-[1fr_0.85fr]",
            )}
          >
            <div className={publicPrimaryPanelClass}>
              <div>
                {isDedicatedPublicPage ? (
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                      Success
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                      Booking confirmed
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      A confirmation-ready record is stored for {successfulBooking.clientEmail}.
                    </p>
                  </div>
                ) : (
                  <SectionTitle
                    eyebrow="Success"
                    title="Booking confirmed"
                    body={`A confirmation-ready record is stored for ${successfulBooking.clientEmail}.`}
                  />
                )}
                <div className={cn("mt-6", publicInsetCardClass)}>
                  <div className="grid gap-3 text-sm text-[var(--muted)]">
                    {hasMultipleServices ? (
                      <p>
                        <span className="font-semibold text-[var(--ink)]">Service:</span>{" "}
                        {successfulBooking.serviceName}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-semibold text-[var(--ink)]">Date:</span>{" "}
                      {formatDateLabel(successfulBooking.dateKey)}
                    </p>
                    <p>
                      <span className="font-semibold text-[var(--ink)]">Time:</span>{" "}
                      {formatTimeRange(successfulBooking.startTime, successfulBooking.endTime)}
                    </p>
                    <p>
                      <span className="font-semibold text-[var(--ink)]">Client:</span>{" "}
                      {successfulBooking.clientName}
                    </p>
                    {successfulBooking.capacitySnapshot ? (
                      <p>
                        <span className="font-semibold text-[var(--ink)]">Capacity:</span>{" "}
                        {successfulBooking.capacitySnapshot}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-semibold text-[var(--ink)]">Status:</span>{" "}
                      {successfulBooking.status}
                    </p>
                  </div>
                </div>
                <div className={cn("mt-6 flex flex-wrap gap-3", isDedicatedPublicPage && "justify-center")}>
                  <a
                    download={`${businessSlug}-${successfulBooking.id}.ics`}
                    href={`data:text/calendar;charset=utf-8,${encodeURIComponent(
                      buildIcsContent(successfulBooking, provider),
                    )}`}
                    className={buttonClasses("primary")}
                  >
                    Add to calendar
                  </a>
                  <ActionButton tone="ghost" onClick={() => openReschedule(successfulBooking.id)}>
                    Reschedule
                  </ActionButton>
                  <ActionButton tone="danger" onClick={() => setCancellationId(successfulBooking.id)}>
                    Cancel booking
                  </ActionButton>
                  <ActionButton tone="secondary" onClick={() => startFreshBooking()}>
                    Book another
                  </ActionButton>
                </div>
              </div>
            </div>

            {!isDedicatedPublicPage ? (
              <div className={publicSoftPanelClass}>
                <SectionTitle
                  title="Share or return"
                  body="The booking remains visible to both client and provider. The provider workspace also reflects the new record instantly."
                />
                <div className="mt-6 flex flex-col gap-3">
                  <ActionButton tone="primary" onClick={copyPublicLink}>
                    {copiedLink ? "Copied public URL" : "Copy public booking URL"}
                  </ActionButton>
                  {surfaceMode === "adaptive" ? (
                    <ActionButton tone="secondary" onClick={() => setSurface("management")}>
                      Open provider workspace
                    </ActionButton>
                  ) : null}
                  {surfaceMode !== "adaptive" ? (
                    <ActionLink href="/" tone="secondary">
                      Open provider workspace
                    </ActionLink>
                  ) : null}
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
        <div className="w-full max-w-lg rounded-[32px] border border-[var(--line)] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
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
            <ActionButton tone="ghost" onClick={() => setCancellationId(null)}>
              Keep booking
            </ActionButton>
            <ActionButton tone="danger" onClick={confirmCancellation}>
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

    const weeks = createMonthMatrix(rescheduleState.monthAnchor);
    const slots =
      service.bookingType === "appointment"
        ? getAvailableSlots(
            rescheduleState.dateKey,
            service,
            availability,
            bookings,
            booking.id,
          )
        : [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-8">
        <div
          className={cn(
            "max-h-[92vh] w-full max-w-5xl overflow-auto",
            isDedicatedPublicPage
              ? "rounded-[34px] bg-[#f3f4f5] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_26px_64px_rgba(25,28,29,0.05)] xl:p-8"
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
              <ActionButton tone="ghost" onClick={() => setRescheduleState(null)}>
                Close
              </ActionButton>
            }
          />
          <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.88fr]">
            <div className="space-y-5">
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-3",
                  isDedicatedPublicPage
                    ? "bg-[rgba(255,255,255,0.72)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_24px_48px_rgba(25,28,29,0.04)] backdrop-blur-[18px]"
                    : "border border-[var(--line)] bg-[var(--surface-soft)]",
                )}
              >
                <div className="flex items-center gap-2">
                  <ActionButton
                    tone="ghost"
                    className={calendarNavPillClass}
                    onClick={() =>
                      setRescheduleState((current) =>
                        current
                          ? { ...current, monthAnchor: shiftMonth(current.monthAnchor, -1) }
                          : current,
                      )
                    }
                  >
                    Previous
                  </ActionButton>
                  <ActionButton
                    tone="ghost"
                    className={calendarNavPillClass}
                    onClick={() =>
                      setRescheduleState((current) =>
                        current ? { ...current, monthAnchor: new Date() } : current,
                      )
                    }
                  >
                    Today
                  </ActionButton>
                  <ActionButton
                    tone="ghost"
                    className={calendarNavPillClass}
                    onClick={() =>
                      setRescheduleState((current) =>
                        current
                          ? { ...current, monthAnchor: shiftMonth(current.monthAnchor, 1) }
                          : current,
                      )
                    }
                  >
                    Next
                  </ActionButton>
                </div>
                <p className="text-base font-semibold text-[var(--ink)]">
                  {formatMonthLabel(rescheduleState.monthAnchor)}
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
                      const inMonth =
                        date.getMonth() === rescheduleState.monthAnchor.getMonth();
                      const available = isDateAvailable(
                        dateKey,
                        service,
                        availability,
                        bookings,
                        booking.id,
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
                                  }
                                : current,
                            )
                          }
                          className={cn(
                            "min-h-[84px] rounded-[24px] p-3 text-left transition",
                            isDedicatedPublicPage &&
                              "shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_20px_42px_rgba(25,28,29,0.04)]",
                            inMonth
                              ? isDedicatedPublicPage
                                ? "bg-[rgba(255,255,255,0.78)]"
                                : "border border-[var(--line)] bg-[var(--surface-soft)]"
                              : isDedicatedPublicPage
                                ? "bg-[rgba(243,244,245,0.72)]"
                                : "border border-[var(--line)] bg-white",
                            available &&
                              (isDedicatedPublicPage
                                ? "hover:bg-[rgba(255,255,255,0.88)] hover:ring-2 hover:ring-[rgba(26,115,232,0.12)]"
                                : "hover:border-[var(--accent)]"),
                            selected &&
                              (isDedicatedPublicPage
                                ? "bg-[rgba(255,255,255,0.92)] ring-2 ring-[rgba(26,115,232,0.18)]"
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
                          isDedicatedPublicPage &&
                            "bg-[rgba(243,244,245,0.82)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
                          !isDedicatedPublicPage &&
                            "border border-[var(--line)] bg-white",
                          rescheduleState.time === slot &&
                            (isDedicatedPublicPage
                              ? "bg-[rgba(255,255,255,0.9)] text-[var(--accent)] shadow-[0_26px_52px_rgba(25,28,29,0.06),inset_0_1px_0_rgba(255,255,255,0.84)]"
                              : "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"),
                          rescheduleState.time !== slot &&
                            (isDedicatedPublicPage
                              ? "hover:bg-[rgba(255,255,255,0.82)]"
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
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <ActionButton tone="ghost" onClick={() => setRescheduleState(null)}>
                  Cancel
                </ActionButton>
                <ActionButton
                  tone="primary"
                  disabled={
                    !rescheduleState.dateKey ||
                    (service.bookingType === "appointment" && !rescheduleState.time)
                  }
                  onClick={confirmReschedule}
                >
                  Save new booking time
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
