export type BookingType = "appointment" | "full-day";
export type OccurrenceMode = "single" | "periodic" | "weekly";
export type LocationKey = "address1" | "address2" | "custom";
export type BookingStatus = "confirmed" | "cancelled" | "rescheduled";
export type Surface = "management" | "public";
export type SurfaceMode = "adaptive" | "public-only";
export type Lang = "en" | "es";
export type AdminTab = "dashboard" | "bookings" | "calendar" | "services" | "settings";
export type WeekdayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";
export type SetupStep = 1 | 2 | 3;
export type BookingStep = 1 | 2 | 3 | 4;

export const VERTICAL_IDS = ["healthcare", "spaces", "professional", "events"] as const;
export type VerticalId = (typeof VERTICAL_IDS)[number];

export type ProviderInfo = {
  fullName: string;
  businessName: string;
  email: string;
  phoneNumber1: string;
  phoneNumber2: string;
  address1: string;
  address2: string;
  publicSlug: string;
  // Public-page branding (all verticals). Vercel Blob URLs.
  headerImageUrl?: string; // banner shown at the public root, above services
  heroText?: string; // overlaid on the header image; defaults to businessName
  galleryImageUrls?: string[]; // reserved: future manual carousel below header
  /** UI/content language for this provider. Drives the public booking page. */
  language: Lang;
};

export type Service = {
  id: string;
  name: string;
  slug?: string;
  bookingType: BookingType;
  durationMinutes?: number;
  description: string;
  medicalSpecialty?: string;
  capacity?: string;
  // Events: single-occurrence scheduling. occurrenceMode undefined === legacy
  // periodic (weekly availability) behavior used by every other vertical.
  occurrenceMode?: OccurrenceMode;
  occurrenceDate?: string; // "YYYY-MM-DD", single mode only
  weekdays?: WeekdayKey[]; // weekly mode: days the event recurs on
  startTime?: string; // "HH:MM", single/weekly window start
  endTime?: string; // "HH:MM", single/weekly window end
  maxSpots?: number; // events: maximum capacity in spots
  cost?: string;
  // Per-location price overrides (free text). Base price is `cost`.
  locationPrices?: Partial<Record<LocationKey, string>>;
  notes?: string;
  linkedAddress1?: boolean;
  linkedAddress2?: boolean;
  linkedPhone1?: boolean;
  linkedPhone2?: boolean;
  customAddress?: string;
  customPhone?: string;
};

export type DayAvailability = {
  enabled: boolean;
  startTime: string;
  endTime: string;
  blockedWindows?: AvailabilityBlock[];
};

export type AvailabilityBlock = {
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
  location?: string; // chosen location's address text (per-location pricing)
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
  vertical?: VerticalId;
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
  medicalSpecialty?: string;
  capacity: string;
  occurrenceMode: OccurrenceMode;
  occurrenceDate: string;
  weekdays: WeekdayKey[];
  startTime: string;
  endTime: string;
  maxSpots: string;
  cost: string;
  locationPrices?: { address1: string; address2: string; custom: string };
  notes: string;
  linkedAddress1: boolean;
  linkedAddress2: boolean;
  linkedPhone1: boolean;
  linkedPhone2: boolean;
  customAddress: string;
  customPhone: string;
};

export type BookingFlow = {
  step: BookingStep;
  serviceId: string;
  dateKey: string;
  time: string;
  locationKey?: LocationKey;
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
