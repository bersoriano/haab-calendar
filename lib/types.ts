export type BookingType = "appointment" | "full-day";
export type BookingStatus = "confirmed" | "cancelled" | "rescheduled";
export type Surface = "management" | "public";
export type SurfaceMode = "adaptive" | "public-only";
export type AdminTab = "dashboard" | "bookings" | "calendar" | "services" | "settings";
export type WeekdayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";
export type SetupStep = 1 | 2 | 3 | 4;
export type BookingStep = 1 | 2 | 3 | 4;

export type ProviderInfo = {
  fullName: string;
  businessName: string;
  email: string;
  publicSlug: string;
};

export type Service = {
  id: string;
  name: string;
  bookingType: BookingType;
  durationMinutes?: number;
  description: string;
  capacity?: string;
  cost?: string;
  notes?: string;
};

export type DayAvailability = {
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type WeeklyAvailability = Record<WeekdayKey, DayAvailability>;

export type BookingRecord = {
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
  manageToken: string;
};

export type BookingHoldRecord = {
  id: string;
  serviceId: string;
  bookingType: BookingType;
  dateKey: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  expiresAt: number;
};

export type ModuleStore = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings: BookingRecord[];
  bookingHolds: BookingHoldRecord[];
  setupComplete: boolean;
};

export type InjectedConfig = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings?: BookingRecord[];
};

export type ServiceDraft = {
  name: string;
  bookingType: BookingType;
  durationMinutes: number;
  description: string;
  capacity: string;
  cost: string;
  notes: string;
};

export type BookingFlow = {
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

export type BookingHold = {
  id: string;
  selectionKey: string;
  startedAt: number;
  expiresAt: number;
  released: boolean;
};

export type RescheduleState = {
  bookingId: string;
  dateKey: string;
  time: string;
  monthAnchor: Date;
  error?: string;
};

export type ManageLookupState = "idle" | "pending" | "found" | "not-found";
