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
export type SetupStep = 1 | 2 | 3 | 4;
export type BookingStep = 1 | 2 | 3 | 4;

/**
 * Whether a service's `maxSpots` is capacity for the whole date or for each
 * slot on it. Events sell a date (one occurrence, one window); a restaurant
 * sells each seating separately. Undefined reads as "date", which is how every
 * service behaved before restaurants existed.
 */
export type CapacityScope = "date" | "slot";

export const VERTICAL_IDS = [
  "healthcare",
  "spaces",
  "professional",
  "events",
  "restaurant",
] as const;
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
  logoImageUrl?: string; // logo shown beside the title on the public page
  headerImageUrl?: string; // banner shown at the public root, above services
  heroText?: string; // overlaid on the header image; defaults to businessName
  galleryImageUrls?: string[]; // reserved: future manual carousel below header
  /** UI/content language for this provider. Drives the public booking page. */
  language: Lang;
  /**
   * The owner's own dashboard language. Undefined means "follow the browser",
   * which is what every pre-existing provider does. Deliberately separate from
   * `language`: an owner may write Spanish page content and still want an
   * English workspace.
   */
  dashboardLanguage?: Lang;
  /**
   * IANA zone the provider's hours are stated in, e.g. "America/Mexico_City".
   * "" means never chosen; the column defaults to "UTC", which is stored but
   * read back as unset. Drives slot generation and the public page's label.
   */
  timezone: string;
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
  maxSpots?: number; // units of capacity: spots for events, tables per seating
  capacityScope?: CapacityScope; // undefined === "date"
  maxPartySize?: number; // restaurants: largest party one table takes
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
  /** Left by the client from the private management link, after booking. */
  clientNote?: string;
  capacitySnapshot?: string;
  /**
   * Whether this row was written against a capacity-bearing service. Mirrors
   * `bookings.allows_shared_capacity`, which is excluded from the database's
   * overlap constraint — so a shared booking neither blocks another service nor
   * is blocked by one, and its own service's capacity governs it instead.
   */
  sharedCapacity?: boolean;
  /** Restaurants: guests in the party. Stored in the booking details payload. */
  partySize?: number;
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
  extensionCount?: number;
  /** See BookingRecord.sharedCapacity. */
  sharedCapacity?: boolean;
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
  bookingHolds?: BookingHoldRecord[];
  vertical?: VerticalId;
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
  capacityScope?: CapacityScope;
  maxPartySize: string;
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
  /** Restaurants: guests in the party, collected on the details step. */
  partySize: string;
  notes: string;
  successBookingId?: string;
};

export type BookingHold = {
  id: string;
  selectionKey: string;
  startedAt: number;
  expiresAt: number;
  extensionCount: number;
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
