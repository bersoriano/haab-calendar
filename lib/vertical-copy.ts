import type { VerticalId } from "./types";

export interface VerticalCopy {
  // Nouns (case + plural variants)
  service: string;
  Service: string;
  services: string;
  Services: string;
  booking: string;
  Booking: string;
  bookings: string;
  Bookings: string;
  client: string;
  Client: string;
  clients: string;
  Clients: string;

  // Verbs / short phrases
  bookVerb: string;
  bookingPage: string;
  publicBookingUrl: string;
  bookingWorkspace: string;
  bookingSummary: string;
  manageBooking: string;
  cancelBooking: string;
  rescheduleBooking: string;
  bookFullDay: string;

  // Sentence-level phrases where verbatim word swaps would read awkwardly.
  phrases: {
    // Setup wizard
    setupTitle: string;
    setupDoneTitle: string;
    providerInfoBody: string;
    availabilityBody: string;

    // Errors
    addServiceFirstError: string;
    serviceNameRequiredError: string;
    keepOneServiceError: string;
    cancelActiveFirstError: string;
    enableWeekdayError: string;
    chooseServiceFirstError: string;
    pickDateFirstError: string;
    clientFieldsRequiredError: string;

    // Public flow
    chooseServiceTitle: string;
    chooseServiceBody: string;
    onlyOneServiceBody: string;
    serviceUnavailableBody: string;
    notesPlaceholder: string;
    bookingSummaryBodyReview: string;
    bookingSummaryBodySuccess: string;

    // Provider dashboard
    upcomingTitle: string;
    upcomingEmptyTitle: string;
    upcomingEmptyBody: string;
    allBookingsTitle: string;
    noBookingsMatchTitle: string;
    bookingsSoonDetail: string;
    activeBookingsDetail: string;
    totalBookingsLabel: string;
    servicesStatDetail: string;
    searchPlaceholder: string;

    // Admin calendar
    addBookingHint: string;

    // Cancel + reschedule modals
    cancelExplain: string;
    keepBookingButton: string;
    cancelBookingButton: string;
    tryBookingButton: string;

    // Manage booking
    loadingBookingTitle: string;
    bookingNotFoundTitle: string;
    bookingNotFoundBody: string;
    bookNewButton: string;

    // ServiceEditor
    serviceEditorBody: string;
    noServicesTitle: string;
    noServicesBody: string;
    serviceDescPlaceholder: string;
    newServiceEyebrow: string;
    editServiceEyebrow: string;
    newServiceTitle: string;
    editServiceTitle: string;
    addServiceButton: string;
    saveServiceButton: string;
    typeOfServiceLabel: string;

    // Misc
    clientLabel: string;

    // Single-occurrence events (events vertical)
    eventDateLabel: string;
    singleOccurrenceHelper: string;
    spotsLeftSuffix: string; // rendered as "{n} {suffix}", e.g. "spots left"
    fullyBookedLabel: string;
    pickEventDateError: string;
    pickWeekdaysError: string;
    maxSpotsRequiredError: string;
  };
}

export const defaultCopy: VerticalCopy = {
  service: "service",
  Service: "Service",
  services: "services",
  Services: "Services",
  booking: "booking",
  Booking: "Booking",
  bookings: "bookings",
  Bookings: "Bookings",
  client: "client",
  Client: "Client",
  clients: "clients",
  Clients: "Clients",

  bookVerb: "book",
  bookingPage: "booking page",
  publicBookingUrl: "public booking URL",
  bookingWorkspace: "Booking workspace",
  bookingSummary: "Booking summary",
  manageBooking: "Manage booking",
  cancelBooking: "Cancel Booking",
  rescheduleBooking: "Reschedule Booking",
  bookFullDay: "Book full day",

  phrases: {
    setupTitle: "Set up your booking page",
    setupDoneTitle: "Your booking page is ready",
    providerInfoBody:
      "These details feed confirmations, branding, and the public booking URL.",
    availabilityBody:
      "Appointment services generate real slots from these windows. Full-day services simply need the weekday enabled and free of conflicts.",

    addServiceFirstError:
      "Add at least one service before publishing your booking page.",
    serviceNameRequiredError:
      "Add a service name and short description before saving it.",
    keepOneServiceError:
      "Keep at least one service. Add another before removing this one.",
    cancelActiveFirstError:
      "Cancel active bookings for this service before removing it.",
    enableWeekdayError: "Enable at least one weekday so clients can book.",
    chooseServiceFirstError: "Choose a service before confirming the booking.",
    pickDateFirstError: "Pick a date before confirming the booking.",
    clientFieldsRequiredError:
      "Client name, email, and phone number are required.",

    chooseServiceTitle: "Choose a service",
    chooseServiceBody:
      "Every card clearly shows whether it books a timed appointment or an entire day.",
    onlyOneServiceBody:
      "Only one service is available, so the module skips this step automatically.",
    serviceUnavailableBody:
      "This slot may be released, but you can still try booking it.",
    notesPlaceholder: "Anything we should know before your booking?",
    bookingSummaryBodyReview:
      "Review the live booking details here before confirming.",
    bookingSummaryBodySuccess:
      "The confirmed booking details remain visible here.",

    upcomingTitle: "Upcoming bookings",
    upcomingEmptyTitle: "No bookings in the next 7 days",
    upcomingEmptyBody: "New bookings appear here automatically.",
    allBookingsTitle: "All bookings",
    noBookingsMatchTitle: "No bookings match the current filters",
    bookingsSoonDetail: "Bookings scheduled soon",
    activeBookingsDetail: "Currently active bookings",
    totalBookingsLabel: "Total bookings",
    servicesStatDetail: "Appointment and full-day offerings",
    searchPlaceholder: "Search client, service, email, or phone",

    addBookingHint: "Click an available day to add a booking.",

    cancelExplain: "Cancelling frees the slot immediately.",
    keepBookingButton: "Keep booking",
    cancelBookingButton: "Cancel booking",
    tryBookingButton: "Try booking",

    loadingBookingTitle: "Loading your booking…",
    bookingNotFoundTitle: "We can't find this booking on this device",
    bookingNotFoundBody:
      "Bookings are stored locally in the browser they were created in. If you booked from a different browser or device, please open this link there. If you've cleared your browser data, the booking is no longer accessible from this device.",
    bookNewButton: "Book a new appointment",

    serviceEditorBody:
      "Each service is a timed appointment or a full-day reservation. Capacity and notes stay visible during booking.",
    noServicesTitle: "No services yet",
    noServicesBody: "Add a service so the public booking flow can open.",
    serviceDescPlaceholder:
      "Explain what the booking covers in one or two lines.",
    newServiceEyebrow: "New service",
    editServiceEyebrow: "Edit service",
    newServiceTitle: "Add a service",
    editServiceTitle: "Update this service",
    addServiceButton: "Add service",
    saveServiceButton: "Save service",
    typeOfServiceLabel: "Type of service",

    clientLabel: "Client",

    eventDateLabel: "Date and time",
    singleOccurrenceHelper: "This booking happens on a single fixed date.",
    spotsLeftSuffix: "spots left",
    fullyBookedLabel: "Fully booked",
    pickEventDateError: "Pick a date before publishing this booking.",
    pickWeekdaysError: "Pick at least one weekday and a start time.",
    maxSpotsRequiredError: "Set the maximum number of spots.",
  },
};

export const healthcareCopy: VerticalCopy = {
  service: "medical service",
  Service: "Medical service",
  services: "medical services",
  Services: "Medical services",
  booking: "appointment",
  Booking: "Appointment",
  bookings: "appointments",
  Bookings: "Appointments",
  client: "patient",
  Client: "Patient",
  clients: "patients",
  Clients: "Patients",

  bookVerb: "schedule",
  bookingPage: "appointment page",
  publicBookingUrl: "public appointment URL",
  bookingWorkspace: "Patient workspace",
  bookingSummary: "Appointment summary",
  manageBooking: "Manage appointment",
  cancelBooking: "Cancel Appointment",
  rescheduleBooking: "Reschedule Appointment",
  bookFullDay: "Reserve full day",

  phrases: {
    setupTitle: "Set up your patient appointment page",
    setupDoneTitle: "Your appointment page is ready",
    providerInfoBody:
      "These details feed appointment confirmations, branding, and your public appointment URL.",
    availabilityBody:
      "Timed appointments generate real slots from these windows. Full-day reservations simply need the weekday enabled and free of conflicts.",

    addServiceFirstError:
      "Add at least one medical service before publishing your appointment page.",
    serviceNameRequiredError:
      "Add a service name and short description before saving it.",
    keepOneServiceError:
      "Keep at least one medical service. Add another before removing this one.",
    cancelActiveFirstError:
      "Cancel active appointments for this service before removing it.",
    enableWeekdayError:
      "Enable at least one weekday so patients can schedule appointments.",
    chooseServiceFirstError:
      "Choose a medical service before confirming the appointment.",
    pickDateFirstError: "Pick a date before confirming the appointment.",
    clientFieldsRequiredError:
      "Patient name, email, and phone number are required.",

    chooseServiceTitle: "Choose a medical service",
    chooseServiceBody:
      "Every card shows whether it schedules a timed appointment or reserves an entire day.",
    onlyOneServiceBody:
      "Only one medical service is available, so this step is skipped automatically.",
    serviceUnavailableBody:
      "This slot may be released, but you can still try to schedule it.",
    notesPlaceholder: "Anything we should know before your appointment?",
    bookingSummaryBodyReview:
      "Review the live appointment details here before confirming.",
    bookingSummaryBodySuccess:
      "The confirmed appointment details remain visible here.",

    upcomingTitle: "Upcoming appointments",
    upcomingEmptyTitle: "No appointments in the next 7 days",
    upcomingEmptyBody: "New appointments appear here automatically.",
    allBookingsTitle: "All appointments",
    noBookingsMatchTitle: "No appointments match the current filters",
    bookingsSoonDetail: "Appointments scheduled soon",
    activeBookingsDetail: "Currently active appointments",
    totalBookingsLabel: "Total appointments",
    servicesStatDetail: "Timed and full-day offerings",
    searchPlaceholder: "Search patient, service, email, or phone",

    addBookingHint: "Click an available day to add an appointment.",

    cancelExplain: "Cancelling frees the slot immediately.",
    keepBookingButton: "Keep appointment",
    cancelBookingButton: "Cancel appointment",
    tryBookingButton: "Try scheduling",

    loadingBookingTitle: "Loading your appointment…",
    bookingNotFoundTitle: "We can't find this appointment on this device",
    bookingNotFoundBody:
      "Appointments are stored locally in the browser they were scheduled in. If you scheduled from a different browser or device, please open this link there. If you've cleared your browser data, the appointment is no longer accessible from this device.",
    bookNewButton: "Schedule a new appointment",

    serviceEditorBody:
      "Each medical service is a timed appointment or a full-day reservation. Capacity and notes stay visible during scheduling.",
    noServicesTitle: "No medical services yet",
    noServicesBody:
      "Add a medical service so patients can start scheduling appointments.",
    serviceDescPlaceholder:
      "Explain what the appointment covers in one or two lines.",
    newServiceEyebrow: "New medical service",
    editServiceEyebrow: "Edit medical service",
    newServiceTitle: "Add a medical service",
    editServiceTitle: "Update this medical service",
    addServiceButton: "Add medical service",
    saveServiceButton: "Save medical service",
    typeOfServiceLabel: "Type of appointment",

    clientLabel: "Patient",

    eventDateLabel: "Date and time",
    singleOccurrenceHelper: "This appointment happens on a single fixed date.",
    spotsLeftSuffix: "spots left",
    fullyBookedLabel: "Fully booked",
    pickEventDateError: "Pick a date before publishing this appointment.",
    pickWeekdaysError: "Pick at least one weekday and a start time.",
    maxSpotsRequiredError: "Set the maximum number of spots.",
  },
};

export const eventsCopy: VerticalCopy = {
  service: "event",
  Service: "Event",
  services: "events",
  Services: "Events",
  booking: "registration",
  Booking: "Registration",
  bookings: "registrations",
  Bookings: "Registrations",
  client: "attendee",
  Client: "Attendee",
  clients: "attendees",
  Clients: "Attendees",

  bookVerb: "register",
  bookingPage: "registration page",
  publicBookingUrl: "public registration URL",
  bookingWorkspace: "Attendee workspace",
  bookingSummary: "Registration summary",
  manageBooking: "Manage registration",
  cancelBooking: "Cancel Registration",
  rescheduleBooking: "Reschedule Registration",
  bookFullDay: "Reserve full-day pass",

  phrases: {
    setupTitle: "Set up your event registration page",
    setupDoneTitle: "Your registration page is ready",
    providerInfoBody:
      "These details feed registration confirmations, branding, and your public registration URL.",
    availabilityBody:
      "Timed events generate real spots from these windows. Full-day passes simply need the day enabled and free of conflicts.",

    addServiceFirstError:
      "Add at least one event before publishing your registration page.",
    serviceNameRequiredError:
      "Add an event name and short description before saving it.",
    keepOneServiceError:
      "Keep at least one event. Add another before removing this one.",
    cancelActiveFirstError:
      "Cancel active registrations for this event before removing it.",
    enableWeekdayError: "Enable at least one day so attendees can register.",
    chooseServiceFirstError:
      "Choose an event before confirming your registration.",
    pickDateFirstError: "Pick a date before confirming your registration.",
    clientFieldsRequiredError:
      "Attendee name, email, and phone number are required.",

    chooseServiceTitle: "Choose an event",
    chooseServiceBody:
      "Every card shows whether it's a timed session or an all-day pass.",
    onlyOneServiceBody:
      "Only one event is available, so this step is skipped automatically.",
    serviceUnavailableBody:
      "This spot may be released, but you can still try to grab it.",
    notesPlaceholder: "Anything we should know before the event?",
    bookingSummaryBodyReview:
      "Review your registration details here before confirming.",
    bookingSummaryBodySuccess:
      "Your confirmed registration details remain visible here.",

    upcomingTitle: "Upcoming registrations",
    upcomingEmptyTitle: "No registrations in the next 7 days",
    upcomingEmptyBody: "New registrations appear here automatically.",
    allBookingsTitle: "All registrations",
    noBookingsMatchTitle: "No registrations match the current filters",
    bookingsSoonDetail: "Registrations starting soon",
    activeBookingsDetail: "Currently active registrations",
    totalBookingsLabel: "Total registrations",
    servicesStatDetail: "Timed sessions and full-day passes",
    searchPlaceholder: "Search attendee, event, email, or phone",

    addBookingHint: "Click an available day to add a registration.",

    cancelExplain: "Cancelling frees the spot immediately.",
    keepBookingButton: "Keep my spot",
    cancelBookingButton: "Cancel my spot",
    tryBookingButton: "Try registering",

    loadingBookingTitle: "Loading your registration…",
    bookingNotFoundTitle: "We can't find this registration on this device",
    bookingNotFoundBody:
      "Registrations are stored locally in the browser they were created in. If you registered from a different browser or device, please open this link there. If you've cleared your browser data, the registration is no longer accessible from this device.",
    bookNewButton: "Register for another event",

    serviceEditorBody:
      "Each event is a timed session or a full-day pass. Capacity and notes stay visible during registration.",
    noServicesTitle: "No events yet",
    noServicesBody: "Add an event so attendees can start registering.",
    serviceDescPlaceholder:
      "Explain what the event covers in one or two lines.",
    newServiceEyebrow: "New event",
    editServiceEyebrow: "Edit event",
    newServiceTitle: "Add an event",
    editServiceTitle: "Update this event",
    addServiceButton: "Add event",
    saveServiceButton: "Save event",
    typeOfServiceLabel: "Type of event",

    clientLabel: "Attendee",

    eventDateLabel: "Event date and time",
    singleOccurrenceHelper:
      "This event happens once, on the date and time below. Reserve your spot to register.",
    spotsLeftSuffix: "spots left",
    fullyBookedLabel: "Fully booked",
    pickEventDateError: "Pick the event date before publishing this event.",
    pickWeekdaysError:
      "Pick at least one weekday and a start time for this recurring event.",
    maxSpotsRequiredError: "Set the maximum number of spots for this event.",
  },
};

export const spacesCopy: VerticalCopy = {
  service: "space",
  Service: "Space",
  services: "spaces",
  Services: "Spaces",
  booking: "reservation",
  Booking: "Reservation",
  bookings: "reservations",
  Bookings: "Reservations",
  client: "guest",
  Client: "Guest",
  clients: "guests",
  Clients: "Guests",

  bookVerb: "reserve",
  bookingPage: "reservation page",
  publicBookingUrl: "public reservation URL",
  bookingWorkspace: "Reservations workspace",
  bookingSummary: "Reservation summary",
  manageBooking: "Manage reservation",
  cancelBooking: "Cancel Reservation",
  rescheduleBooking: "Reschedule Reservation",
  bookFullDay: "Reserve full day",

  phrases: {
    setupTitle: "Set up your reservation page",
    setupDoneTitle: "Your reservation page is ready",
    providerInfoBody:
      "These details feed reservation confirmations, branding, and your public reservation URL.",
    availabilityBody:
      "Hourly spaces generate real slots from these windows. Full-day venues simply need the day enabled and free of conflicts.",

    addServiceFirstError:
      "Add at least one space before publishing your reservation page.",
    serviceNameRequiredError:
      "Add a space name and short description before saving it.",
    keepOneServiceError:
      "Keep at least one space. Add another before removing this one.",
    cancelActiveFirstError:
      "Cancel active reservations for this space before removing it.",
    enableWeekdayError: "Enable at least one day so guests can reserve.",
    chooseServiceFirstError: "Choose a space before confirming the reservation.",
    pickDateFirstError: "Pick a date before confirming the reservation.",
    clientFieldsRequiredError:
      "Guest name, email, and phone number are required.",

    chooseServiceTitle: "Choose a space",
    chooseServiceBody:
      "Every card shows whether it reserves an hourly slot or the full day.",
    onlyOneServiceBody:
      "Only one space is available, so this step is skipped automatically.",
    serviceUnavailableBody:
      "This slot may be released, but you can still try to reserve it.",
    notesPlaceholder: "Anything we should know before your reservation?",
    bookingSummaryBodyReview:
      "Review the live reservation details here before confirming.",
    bookingSummaryBodySuccess:
      "The confirmed reservation details remain visible here.",

    upcomingTitle: "Upcoming reservations",
    upcomingEmptyTitle: "No reservations in the next 7 days",
    upcomingEmptyBody: "New reservations appear here automatically.",
    allBookingsTitle: "All reservations",
    noBookingsMatchTitle: "No reservations match the current filters",
    bookingsSoonDetail: "Reservations starting soon",
    activeBookingsDetail: "Currently active reservations",
    totalBookingsLabel: "Total reservations",
    servicesStatDetail: "Hourly and full-day spaces",
    searchPlaceholder: "Search guest, space, email, or phone",

    addBookingHint: "Click an available day to add a reservation.",

    cancelExplain: "Cancelling frees the slot immediately.",
    keepBookingButton: "Keep reservation",
    cancelBookingButton: "Cancel reservation",
    tryBookingButton: "Try reserving",

    loadingBookingTitle: "Loading your reservation…",
    bookingNotFoundTitle: "We can't find this reservation on this device",
    bookingNotFoundBody:
      "Reservations are stored locally in the browser they were created in. If you reserved from a different browser or device, please open this link there. If you've cleared your browser data, the reservation is no longer accessible from this device.",
    bookNewButton: "Make a new reservation",

    serviceEditorBody:
      "Each space is an hourly reservation or a full-day venue. Capacity and notes stay visible during reservation.",
    noServicesTitle: "No spaces yet",
    noServicesBody: "Add a space so guests can start reserving.",
    serviceDescPlaceholder:
      "Explain what the reservation includes in one or two lines.",
    newServiceEyebrow: "New space",
    editServiceEyebrow: "Edit space",
    newServiceTitle: "Add a space",
    editServiceTitle: "Update this space",
    addServiceButton: "Add space",
    saveServiceButton: "Save space",
    typeOfServiceLabel: "Type of space",

    clientLabel: "Guest",

    eventDateLabel: "Date and time",
    singleOccurrenceHelper: "This reservation happens on a single fixed date.",
    spotsLeftSuffix: "spots left",
    fullyBookedLabel: "Fully booked",
    pickEventDateError: "Pick a date before publishing this reservation.",
    pickWeekdaysError: "Pick at least one weekday and a start time.",
    maxSpotsRequiredError: "Set the maximum number of spots.",
  },
};

export const professionalCopy: VerticalCopy = {
  service: "service",
  Service: "Service",
  services: "services",
  Services: "Services",
  booking: "session",
  Booking: "Session",
  bookings: "sessions",
  Bookings: "Sessions",
  client: "client",
  Client: "Client",
  clients: "clients",
  Clients: "Clients",

  bookVerb: "schedule",
  bookingPage: "scheduling page",
  publicBookingUrl: "public scheduling URL",
  bookingWorkspace: "Client workspace",
  bookingSummary: "Session summary",
  manageBooking: "Manage session",
  cancelBooking: "Cancel Session",
  rescheduleBooking: "Reschedule Session",
  bookFullDay: "Reserve full day",

  phrases: {
    setupTitle: "Set up your scheduling page",
    setupDoneTitle: "Your scheduling page is ready",
    providerInfoBody:
      "These details feed session confirmations, branding, and your public scheduling URL.",
    availabilityBody:
      "Timed sessions generate real slots from these windows. Full-day engagements simply need the weekday enabled and free of conflicts.",

    addServiceFirstError:
      "Add at least one service before publishing your scheduling page.",
    serviceNameRequiredError:
      "Add a service name and short description before saving it.",
    keepOneServiceError:
      "Keep at least one service. Add another before removing this one.",
    cancelActiveFirstError:
      "Cancel active sessions for this service before removing it.",
    enableWeekdayError:
      "Enable at least one weekday so clients can schedule sessions.",
    chooseServiceFirstError: "Choose a service before confirming the session.",
    pickDateFirstError: "Pick a date before confirming the session.",
    clientFieldsRequiredError:
      "Client name, email, and phone number are required.",

    chooseServiceTitle: "Choose a service",
    chooseServiceBody:
      "Every card shows whether it schedules a timed session or books an entire day.",
    onlyOneServiceBody:
      "Only one service is available, so this step is skipped automatically.",
    serviceUnavailableBody:
      "This slot may be released, but you can still try to schedule it.",
    notesPlaceholder: "Anything we should know before your session?",
    bookingSummaryBodyReview:
      "Review the live session details here before confirming.",
    bookingSummaryBodySuccess:
      "The confirmed session details remain visible here.",

    upcomingTitle: "Upcoming sessions",
    upcomingEmptyTitle: "No sessions in the next 7 days",
    upcomingEmptyBody: "New sessions appear here automatically.",
    allBookingsTitle: "All sessions",
    noBookingsMatchTitle: "No sessions match the current filters",
    bookingsSoonDetail: "Sessions scheduled soon",
    activeBookingsDetail: "Currently active sessions",
    totalBookingsLabel: "Total sessions",
    servicesStatDetail: "Timed and full-day offerings",
    searchPlaceholder: "Search client, service, email, or phone",

    addBookingHint: "Click an available day to add a session.",

    cancelExplain: "Cancelling frees the slot immediately.",
    keepBookingButton: "Keep session",
    cancelBookingButton: "Cancel session",
    tryBookingButton: "Try scheduling",

    loadingBookingTitle: "Loading your session…",
    bookingNotFoundTitle: "We can't find this session on this device",
    bookingNotFoundBody:
      "Sessions are stored locally in the browser they were scheduled in. If you scheduled from a different browser or device, please open this link there. If you've cleared your browser data, the session is no longer accessible from this device.",
    bookNewButton: "Schedule a new session",

    serviceEditorBody:
      "Each service is a timed session or a full-day engagement. Capacity and notes stay visible during scheduling.",
    noServicesTitle: "No services yet",
    noServicesBody: "Add a service so clients can start scheduling sessions.",
    serviceDescPlaceholder:
      "Explain what the session covers in one or two lines.",
    newServiceEyebrow: "New service",
    editServiceEyebrow: "Edit service",
    newServiceTitle: "Add a service",
    editServiceTitle: "Update this service",
    addServiceButton: "Add service",
    saveServiceButton: "Save service",
    typeOfServiceLabel: "Type of session",

    clientLabel: "Client",

    eventDateLabel: "Date and time",
    singleOccurrenceHelper: "This session happens on a single fixed date.",
    spotsLeftSuffix: "spots left",
    fullyBookedLabel: "Fully booked",
    pickEventDateError: "Pick a date before publishing this session.",
    pickWeekdaysError: "Pick at least one weekday and a start time.",
    maxSpotsRequiredError: "Set the maximum number of spots.",
  },
};

const COPY_BY_VERTICAL: Record<VerticalId, VerticalCopy> = {
  healthcare: healthcareCopy,
  events: eventsCopy,
  spaces: spacesCopy,
  professional: professionalCopy,
};

export function getVerticalCopy(verticalId?: VerticalId): VerticalCopy {
  if (!verticalId) {
    return defaultCopy;
  }
  return COPY_BY_VERTICAL[verticalId] ?? defaultCopy;
}
