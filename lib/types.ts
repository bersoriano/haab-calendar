export type BookingType = "appointment" | "full-day";
export type OccurrenceMode = "single" | "periodic" | "weekly";
export type LocationKey = "address1" | "address2" | "custom";
export type BookingStatus = "confirmed" | "cancelled" | "rescheduled";
export type Surface = "management" | "public";
export type SurfaceMode = "adaptive" | "public-only";
export type Lang = "en" | "es";
import type { PublicTheme } from "./public-theme";

export type { PublicTheme };
export type AdminTab =
  | "dashboard"
  | "bookings"
  | "clients"
  | "scan"
  | "services"
  | "availability"
  | "appearance"
  | "analytics"
  | "campaigns"
  | "integrations"
  | "settings"
  | "business-type"
  | "guests";
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

/**
 * Extra details a booking form can ask for. Each service opts in; the person
 * booking can always leave them empty. The values are stored as written, in the
 * `services.traveler_fields` column and as `details.travelerDetails` keys.
 */
export const TRAVELER_FIELDS = [
  "passport",
  "emergency_contact",
  "diet",
  "hotel_pickup",
] as const;
export type TravelerField = (typeof TRAVELER_FIELDS)[number];
export type TravelerDetails = Partial<Record<TravelerField, string>>;

/**
 * A word set that replaces the vertical's own on one provider's page and
 * dashboard. Undefined means the vertical's words. See getVerticalCopy.
 */
export const VOCABULARIES = ["tours", "weddings"] as const;
export type Vocabulary = (typeof VOCABULARIES)[number];

/**
 * How an events page takes sign-ups. "open": anyone with the link books a spot.
 * "invitations": only invited households answer, through their own link. See
 * lib/rsvp-mode.ts and docs/superpowers/specs/2026-11-08-wedding-rsvp-design.md.
 */
export type RsvpMode = "open" | "invitations";

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
  /** Events only: speak of tours or a wedding instead of events and attendees. */
  vocabulary?: Vocabulary;
  /** Events only. Undefined is "open". */
  rsvpMode?: RsvpMode;
  /** Seat limit a new invitation starts with, 1–20. Undefined is 2. */
  defaultInvitationSeats?: number;
  /** Invitation-only pages: last day answers are taken (YYYY-MM-DD, page time zone). */
  rsvpDeadline?: string;
  /**
   * The owner's own dashboard language. Undefined means "follow the browser",
   * which is what every pre-existing provider does. Deliberately separate from
   * `language`: an owner may write Spanish page content and still want an
   * English workspace.
   */
  dashboardLanguage?: Lang;
  /**
   * Look of the public booking page. "default" is the page as it always was.
   * See lib/public-theme.ts.
   */
  publicTheme?: PublicTheme;
  /** Public booking attribution. Effective public values are entitlement-filtered by the database view. */
  publicFooterText?: string;
  publicFooterUrl?: string;
  /**
   * IANA zone the provider's hours are stated in, e.g. "America/Mexico_City".
   * "" means never chosen; the column defaults to "UTC", which is stored but
   * read back as unset. Drives slot generation and the public page's label.
   */
  timezone: string;
  /**
   * Most bookings accepted on one date, across all services. Undefined means
   * no limit, which is every provider until they turn it on.
   */
  maxBookingsPerDay?: number;
  /** Opt-in preference; effective only with extended-history entitlement. */
  keepBookingHistoryOneYear?: boolean;
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
  /** Optional public images. The first is the cover on the service card. */
  photoUrls?: string[];
  /** Optional owner-written policy. Shown to the public, never enforced. */
  cancellationPolicy?: string;
  /** Optional fewest people this runs with. Shown to the public, never enforced. */
  minGroupSize?: number;
  /** Optional extra details the booking form asks for. Empty means none. */
  travelerFields?: TravelerField[];
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
  /** Note left by the client on confirmation or through the private link. */
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
  /** Optional, "YYYY-MM-DD". Stored in the booking details payload. */
  dateOfBirth?: string;
  /**
   * Answers to the service's traveler fields, in the booking details payload.
   * Provider-side only: may hold a passport number, so it is never sent back
   * through the client's private link.
   */
  travelerDetails?: TravelerDetails;
  cost: string;
  location?: string; // chosen location's address text (per-location pricing)
  status: BookingStatus;
  /** The campaign link and referring site the client booked through. */
  campaign?: BookingCampaign;
  /**
   * When the provider marked the booking as seen; absent while it is still
   * new. Provider-side only: never sent to the client who booked.
   */
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  manageToken: string;
};

export type BookingCampaign = {
  source?: string;
  medium?: string;
  campaign?: string;
  referrerHost?: string;
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
  photoUrls?: string[];
  cancellationPolicy?: string;
  minGroupSize?: string;
  travelerFields?: TravelerField[];
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
  /**
   * Optional, as the date input gives it ("YYYY-MM-DD"). Optional here too so
   * a flow saved before the field existed still reads.
   */
  dateOfBirth?: string;
  /** Optional answers to the chosen service's traveler fields. */
  travelerDetails?: TravelerDetails;
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
