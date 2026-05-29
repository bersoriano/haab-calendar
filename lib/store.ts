import { slugify, currentTimestamp } from "./utils";
import { compareDateKeys } from "./date";
import { WEEKDAY_KEYS } from "./constants";
import type {
  BookingHoldRecord,
  BookingRecord,
  ModuleStore,
  ProviderInfo,
  Service,
  ServiceDraft,
  WeeklyAvailability,
  BookingFlow,
} from "./types";

export function createDefaultAvailability(): WeeklyAvailability {
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

export function createEmptyStore(): ModuleStore {
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

export function createBlankServiceDraft(): ServiceDraft {
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

export function createInitialBookingFlow(services: Service[]): BookingFlow {
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
    };
  }

  return base;
}

export function normalizeProvider(source?: Partial<ProviderInfo> | null): ProviderInfo {
  return {
    fullName: source?.fullName ?? "",
    businessName: source?.businessName ?? "",
    email: source?.email ?? "",
    publicSlug:
      source?.publicSlug ??
      slugify(source?.businessName || source?.fullName || "haab-calendar"),
  };
}

export function normalizeServices(source?: Service[] | null): Service[] {
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
  };
}
