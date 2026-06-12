import { slugify, currentTimestamp, createId } from "./utils";
import { getServiceSlug } from "./public-url";
import { compareDateKeys } from "./date";
import { DEFAULT_APPOINTMENT_DURATION_MINUTES, WEEKDAY_KEYS } from "./constants";
import { VERTICAL_IDS } from "./types";
import type {
  AvailabilityBlock,
  BookingHoldRecord,
  BookingRecord,
  ModuleStore,
  ProviderInfo,
  Service,
  ServiceDraft,
  VerticalId,
  WeeklyAvailability,
  BookingFlow,
} from "./types";
import type { Vertical } from "../config/verticals";

export function createDefaultAvailability(): WeeklyAvailability {
  return {
    sunday: { enabled: false, startTime: "09:00", endTime: "17:00", blockedWindows: [] },
    monday: { enabled: true, startTime: "09:00", endTime: "17:00", blockedWindows: [] },
    tuesday: { enabled: true, startTime: "09:00", endTime: "17:00", blockedWindows: [] },
    wednesday: { enabled: true, startTime: "09:00", endTime: "17:00", blockedWindows: [] },
    thursday: { enabled: true, startTime: "09:00", endTime: "17:00", blockedWindows: [] },
    friday: { enabled: true, startTime: "09:00", endTime: "17:00", blockedWindows: [] },
    saturday: { enabled: false, startTime: "09:00", endTime: "17:00", blockedWindows: [] },
  };
}

export function createEmptyStore(): ModuleStore {
  return {
    provider: {
      fullName: "",
      businessName: "",
      email: "",
      phoneNumber1: "",
      phoneNumber2: "",
      address1: "",
      address2: "",
      publicSlug: "",
    },
    services: [],
    availability: createDefaultAvailability(),
    bookings: [],
    bookingHolds: [],
    setupComplete: false,
    vertical: undefined,
  };
}

export function normalizeVertical(value?: string | null): VerticalId | undefined {
  return (VERTICAL_IDS as readonly string[]).includes(value ?? "")
    ? (value as VerticalId)
    : undefined;
}

export function materializeVerticalServices(drafts: ServiceDraft[]): Service[] {
  return drafts.map((draft) => ({
    id: createId("svc"),
    name: draft.name,
    slug: slugify(draft.name || "service"),
    bookingType: draft.bookingType,
    durationMinutes: draft.bookingType === "full-day" ? undefined : draft.durationMinutes,
    description: draft.description,
    capacity: draft.capacity,
    cost: draft.cost,
    notes: draft.notes,
    linkedAddress1: draft.linkedAddress1,
    linkedAddress2: draft.linkedAddress2,
    linkedPhone1: draft.linkedPhone1,
    linkedPhone2: draft.linkedPhone2,
    customAddress: draft.customAddress || undefined,
    customPhone: draft.customPhone || undefined,
  }));
}

export function applyVerticalToStore(store: ModuleStore, vertical: Vertical): ModuleStore {
  return {
    ...store,
    vertical: vertical.id,
    services: materializeVerticalServices(vertical.services),
    availability: normalizeAvailability(vertical.availability),
  };
}

export function setAppointmentServiceDurations(
  store: ModuleStore,
  durationMinutes: number,
): ModuleStore {
  return {
    ...store,
    services: store.services.map((service) =>
      service.bookingType === "appointment"
        ? { ...service, durationMinutes }
        : service,
    ),
  };
}

export function setServiceBookingLength(
  store: ModuleStore,
  bookingLength: number | "full-day",
): ModuleStore {
  return {
    ...store,
    services: store.services.map((service) =>
      bookingLength === "full-day"
        ? {
            ...service,
            bookingType: "full-day",
            durationMinutes: undefined,
          }
        : {
            ...service,
            bookingType: "appointment",
            durationMinutes: bookingLength,
          },
    ),
  };
}

export function createBlankServiceDraft(): ServiceDraft {
  return {
    name: "",
    bookingType: "appointment",
    durationMinutes: DEFAULT_APPOINTMENT_DURATION_MINUTES,
    description: "",
    capacity: "",
    cost: "",
    notes: "",
    linkedAddress1: false,
    linkedAddress2: false,
    linkedPhone1: false,
    linkedPhone2: false,
    customAddress: "",
    customPhone: "",
  };
}

export function createInitialBookingFlow(
  services: Service[],
  preferredServiceId?: string,
): BookingFlow {
  const hasPreferredService = services.some((service) => service.id === preferredServiceId);
  const firstService = hasPreferredService && preferredServiceId
    ? preferredServiceId
    : services.length === 1
      ? services[0]?.id ?? ""
      : "";

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

function normalizeAvailabilityBlocks(
  source?: AvailabilityBlock[] | null,
): AvailabilityBlock[] {
  return (source ?? [])
    .filter(
      (block) =>
        typeof block?.startTime === "string" &&
        typeof block?.endTime === "string",
    )
    .map((block) => ({
      startTime: block.startTime,
      endTime: block.endTime,
    }));
}

export function normalizeAvailability(
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
      blockedWindows: normalizeAvailabilityBlocks(next.blockedWindows),
    };
  }

  return base;
}

export function normalizeProvider(source?: Partial<ProviderInfo> | null): ProviderInfo {
  return {
    fullName: source?.fullName ?? "",
    businessName: source?.businessName ?? "",
    email: source?.email ?? "",
    phoneNumber1: source?.phoneNumber1 ?? "",
    phoneNumber2: source?.phoneNumber2 ?? "",
    address1: source?.address1 ?? "",
    address2: source?.address2 ?? "",
    publicSlug:
      source?.publicSlug ??
      slugify(source?.businessName || source?.fullName || "haab-calendar"),
  };
}

export function normalizeServices(source?: Service[] | null): Service[] {
  return (source ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    slug: getServiceSlug(service),
    bookingType: service.bookingType,
    durationMinutes:
      service.bookingType === "full-day"
        ? undefined
        : service.durationMinutes,
    description: service.description,
    capacity: service.capacity,
    cost: service.cost,
    notes: service.notes,
    linkedAddress1: service.linkedAddress1 ?? false,
    linkedAddress2: service.linkedAddress2 ?? false,
    linkedPhone1: service.linkedPhone1 ?? false,
    linkedPhone2: service.linkedPhone2 ?? false,
    customAddress: service.customAddress,
    customPhone: service.customPhone,
  }));
}

export function sortBookings(bookings: BookingRecord[]) {
  return [...bookings].sort((left, right) => {
    const dateCompare = compareDateKeys(left.dateKey, right.dateKey);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return (left.startTime ?? "00:00").localeCompare(right.startTime ?? "00:00");
  });
}

export function normalizeBookings(source?: BookingRecord[] | null): BookingRecord[] {
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
      manageToken: booking.manageToken ?? "",
    })),
  );
}

export function pruneBookingHolds(holds: BookingHoldRecord[], now = currentTimestamp()) {
  return holds.filter((hold) => hold.expiresAt > now);
}

export function normalizeBookingHolds(source?: BookingHoldRecord[] | null): BookingHoldRecord[] {
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

export function normalizeStore(source?: ModuleStore | null): ModuleStore {
  const empty = createEmptyStore();

  return {
    provider: normalizeProvider(source?.provider),
    services: normalizeServices(source?.services),
    availability: normalizeAvailability(source?.availability),
    bookings: normalizeBookings(source?.bookings),
    bookingHolds: normalizeBookingHolds(source?.bookingHolds),
    setupComplete: Boolean(source?.setupComplete ?? empty.setupComplete),
    vertical: normalizeVertical(source?.vertical),
  };
}
