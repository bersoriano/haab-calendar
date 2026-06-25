import type { Lang, VerticalId } from "./types";

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
    aboutServiceTitle: string;
    serviceDetailsTitle: string;

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

    // Calendar QR modal (sentence embeds the vertical booking noun)
    scanQrBody: string;
    calendarQrLabel: string;

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
    aboutServiceTitle: "About the Service",
    serviceDetailsTitle: "Service details",

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

    scanQrBody: "Scan the code with your phone camera to add this booking to your calendar.",
    calendarQrLabel: "QR code to add this booking to a calendar",

    eventDateLabel: "Date and time",
    singleOccurrenceHelper: "This booking happens on a single fixed date.",
    spotsLeftSuffix: "spots left",
    fullyBookedLabel: "Fully booked",
    pickEventDateError: "Pick a date before publishing this booking.",
    pickWeekdaysError: "Pick at least one weekday and a start time.",
    maxSpotsRequiredError: "Set the maximum number of spots.",
  },
};

export const defaultCopyEs: VerticalCopy = {
  service: "servicio",
  Service: "Servicio",
  services: "servicios",
  Services: "Servicios",
  booking: "reserva",
  Booking: "Reserva",
  bookings: "reservas",
  Bookings: "Reservas",
  client: "cliente",
  Client: "Cliente",
  clients: "clientes",
  Clients: "Clientes",

  bookVerb: "reservar",
  bookingPage: "página de reservas",
  publicBookingUrl: "URL pública de reservas",
  bookingWorkspace: "Espacio de reservas",
  bookingSummary: "Resumen de la reserva",
  manageBooking: "Gestionar reserva",
  cancelBooking: "Cancelar reserva",
  rescheduleBooking: "Reagendar reserva",
  bookFullDay: "Reservar día completo",

  phrases: {
    setupTitle: "Configure su página de reservas",
    setupDoneTitle: "Su página de reservas está lista",
    providerInfoBody:
      "Estos datos alimentan las confirmaciones, la marca y la URL pública de reservas.",
    availabilityBody:
      "Los servicios por cita generan horarios reales a partir de estas ventanas. Los servicios de día completo solo necesitan que el día de la semana esté habilitado y libre de conflictos.",

    addServiceFirstError:
      "Agregue al menos un servicio antes de publicar su página de reservas.",
    serviceNameRequiredError:
      "Agregue un nombre de servicio y una breve descripción antes de guardarlo.",
    keepOneServiceError:
      "Conserve al menos un servicio. Agregue otro antes de eliminar este.",
    cancelActiveFirstError:
      "Cancele las reservas activas de este servicio antes de eliminarlo.",
    enableWeekdayError:
      "Habilite al menos un día de la semana para que los clientes puedan reservar.",
    chooseServiceFirstError: "Elija un servicio antes de confirmar la reserva.",
    pickDateFirstError: "Elija una fecha antes de confirmar la reserva.",
    clientFieldsRequiredError:
      "El nombre, el correo electrónico y el número de teléfono del cliente son obligatorios.",

    chooseServiceTitle: "Elija un servicio",
    chooseServiceBody:
      "Cada tarjeta muestra claramente si reserva una cita con horario o un día completo.",
    onlyOneServiceBody:
      "Solo hay un servicio disponible, por lo que el módulo omite este paso automáticamente.",
    serviceUnavailableBody:
      "Este horario podría liberarse, pero aún puede intentar reservarlo.",
    notesPlaceholder: "¿Algo que debamos saber antes de su reserva?",
    bookingSummaryBodyReview:
      "Revise aquí los detalles de la reserva en tiempo real antes de confirmar.",
    bookingSummaryBodySuccess:
      "Los detalles de la reserva confirmada permanecen visibles aquí.",
    aboutServiceTitle: "Acerca del servicio",
    serviceDetailsTitle: "Detalles del servicio",

    upcomingTitle: "Próximas reservas",
    upcomingEmptyTitle: "No hay reservas en los próximos 7 días",
    upcomingEmptyBody: "Las nuevas reservas aparecen aquí automáticamente.",
    allBookingsTitle: "Todas las reservas",
    noBookingsMatchTitle: "Ninguna reserva coincide con los filtros actuales",
    bookingsSoonDetail: "Reservas programadas próximamente",
    activeBookingsDetail: "Reservas actualmente activas",
    totalBookingsLabel: "Total de reservas",
    servicesStatDetail: "Ofertas por cita y de día completo",
    searchPlaceholder: "Buscar cliente, servicio, correo o teléfono",

    addBookingHint: "Haga clic en un día disponible para agregar una reserva.",

    cancelExplain: "Cancelar libera el horario de inmediato.",
    keepBookingButton: "Conservar reserva",
    cancelBookingButton: "Cancelar reserva",
    tryBookingButton: "Intentar reservar",

    loadingBookingTitle: "Cargando su reserva…",
    bookingNotFoundTitle: "No encontramos esta reserva en este dispositivo",
    bookingNotFoundBody:
      "Las reservas se almacenan localmente en el navegador en el que se crearon. Si reservó desde otro navegador o dispositivo, abra este enlace allí. Si borró los datos de su navegador, la reserva ya no es accesible desde este dispositivo.",
    bookNewButton: "Reservar una nueva cita",

    serviceEditorBody:
      "Cada servicio es una cita con horario o una reserva de día completo. La capacidad y las notas permanecen visibles durante la reserva.",
    noServicesTitle: "Aún no hay servicios",
    noServicesBody:
      "Agregue un servicio para que el flujo público de reservas pueda abrirse.",
    serviceDescPlaceholder:
      "Explique en una o dos líneas qué incluye la reserva.",
    newServiceEyebrow: "Nuevo servicio",
    editServiceEyebrow: "Editar servicio",
    newServiceTitle: "Agregar un servicio",
    editServiceTitle: "Actualizar este servicio",
    addServiceButton: "Agregar servicio",
    saveServiceButton: "Guardar servicio",
    typeOfServiceLabel: "Tipo de servicio",

    clientLabel: "Cliente",

    scanQrBody: "Escanee el código con la cámara de su teléfono para agregar esta reserva a su calendario.",
    calendarQrLabel: "Código QR para agregar esta reserva al calendario",

    eventDateLabel: "Fecha y hora",
    singleOccurrenceHelper: "Esta reserva ocurre en una sola fecha fija.",
    spotsLeftSuffix: "lugares disponibles",
    fullyBookedLabel: "Cupo lleno",
    pickEventDateError: "Elija una fecha antes de publicar esta reserva.",
    pickWeekdaysError: "Elija al menos un día de la semana y una hora de inicio.",
    maxSpotsRequiredError: "Establezca el número máximo de lugares.",
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
    aboutServiceTitle: "About the Medical service",
    serviceDetailsTitle: "Medical service details",

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

    scanQrBody: "Scan the code with your phone camera to add this appointment to your calendar.",
    calendarQrLabel: "QR code to add this appointment to a calendar",

    eventDateLabel: "Date and time",
    singleOccurrenceHelper: "This appointment happens on a single fixed date.",
    spotsLeftSuffix: "spots left",
    fullyBookedLabel: "Fully booked",
    pickEventDateError: "Pick a date before publishing this appointment.",
    pickWeekdaysError: "Pick at least one weekday and a start time.",
    maxSpotsRequiredError: "Set the maximum number of spots.",
  },
};

export const healthcareCopyEs: VerticalCopy = {
  service: "servicio médico",
  Service: "Servicio médico",
  services: "servicios médicos",
  Services: "Servicios médicos",
  booking: "cita",
  Booking: "Cita",
  bookings: "citas",
  Bookings: "Citas",
  client: "paciente",
  Client: "Paciente",
  clients: "pacientes",
  Clients: "Pacientes",

  bookVerb: "agendar",
  bookingPage: "página de citas",
  publicBookingUrl: "URL pública de citas",
  bookingWorkspace: "Espacio de pacientes",
  bookingSummary: "Resumen de la cita",
  manageBooking: "Gestionar cita",
  cancelBooking: "Cancelar cita",
  rescheduleBooking: "Reagendar cita",
  bookFullDay: "Reservar día completo",

  phrases: {
    setupTitle: "Configure su página de citas para pacientes",
    setupDoneTitle: "Su página de citas está lista",
    providerInfoBody:
      "Estos datos alimentan las confirmaciones de citas, la marca y su URL pública de citas.",
    availabilityBody:
      "Las citas con horario generan horarios reales a partir de estas ventanas. Las reservas de día completo solo necesitan que el día de la semana esté habilitado y libre de conflictos.",

    addServiceFirstError:
      "Agregue al menos un servicio médico antes de publicar su página de citas.",
    serviceNameRequiredError:
      "Agregue un nombre de servicio y una breve descripción antes de guardarlo.",
    keepOneServiceError:
      "Conserve al menos un servicio médico. Agregue otro antes de eliminar este.",
    cancelActiveFirstError:
      "Cancele las citas activas de este servicio antes de eliminarlo.",
    enableWeekdayError:
      "Habilite al menos un día de la semana para que los pacientes puedan agendar citas.",
    chooseServiceFirstError:
      "Elija un servicio médico antes de confirmar la cita.",
    pickDateFirstError: "Elija una fecha antes de confirmar la cita.",
    clientFieldsRequiredError:
      "El nombre, el correo electrónico y el número de teléfono del paciente son obligatorios.",

    chooseServiceTitle: "Elija un servicio médico",
    chooseServiceBody:
      "Cada tarjeta muestra si agenda una cita con horario o reserva un día completo.",
    onlyOneServiceBody:
      "Solo hay un servicio médico disponible, por lo que este paso se omite automáticamente.",
    serviceUnavailableBody:
      "Este horario podría liberarse, pero aún puede intentar agendarlo.",
    notesPlaceholder: "¿Algo que debamos saber antes de su cita?",
    bookingSummaryBodyReview:
      "Revise aquí los detalles de la cita en tiempo real antes de confirmar.",
    bookingSummaryBodySuccess:
      "Los detalles de la cita confirmada permanecen visibles aquí.",
    aboutServiceTitle: "Acerca del servicio médico",
    serviceDetailsTitle: "Detalles del servicio médico",

    upcomingTitle: "Próximas citas",
    upcomingEmptyTitle: "No hay citas en los próximos 7 días",
    upcomingEmptyBody: "Las nuevas citas aparecen aquí automáticamente.",
    allBookingsTitle: "Todas las citas",
    noBookingsMatchTitle: "Ninguna cita coincide con los filtros actuales",
    bookingsSoonDetail: "Citas programadas próximamente",
    activeBookingsDetail: "Citas actualmente activas",
    totalBookingsLabel: "Total de citas",
    servicesStatDetail: "Ofertas con horario y de día completo",
    searchPlaceholder: "Buscar paciente, servicio, correo o teléfono",

    addBookingHint: "Haga clic en un día disponible para agregar una cita.",

    cancelExplain: "Cancelar libera el horario de inmediato.",
    keepBookingButton: "Conservar cita",
    cancelBookingButton: "Cancelar cita",
    tryBookingButton: "Intentar agendar",

    loadingBookingTitle: "Cargando su cita…",
    bookingNotFoundTitle: "No encontramos esta cita en este dispositivo",
    bookingNotFoundBody:
      "Las citas se almacenan localmente en el navegador en el que se agendaron. Si agendó desde otro navegador o dispositivo, abra este enlace allí. Si borró los datos de su navegador, la cita ya no es accesible desde este dispositivo.",
    bookNewButton: "Agendar una nueva cita",

    serviceEditorBody:
      "Cada servicio médico es una cita con horario o una reserva de día completo. La capacidad y las notas permanecen visibles durante el agendamiento.",
    noServicesTitle: "Aún no hay servicios médicos",
    noServicesBody:
      "Agregue un servicio médico para que los pacientes puedan comenzar a agendar citas.",
    serviceDescPlaceholder:
      "Explique en una o dos líneas qué incluye la cita.",
    newServiceEyebrow: "Nuevo servicio médico",
    editServiceEyebrow: "Editar servicio médico",
    newServiceTitle: "Agregar un servicio médico",
    editServiceTitle: "Actualizar este servicio médico",
    addServiceButton: "Agregar servicio médico",
    saveServiceButton: "Guardar servicio médico",
    typeOfServiceLabel: "Tipo de cita",

    clientLabel: "Paciente",

    scanQrBody: "Escanee el código con la cámara de su teléfono para agregar esta cita a su calendario.",
    calendarQrLabel: "Código QR para agregar esta cita al calendario",

    eventDateLabel: "Fecha y hora",
    singleOccurrenceHelper: "Esta cita ocurre en una sola fecha fija.",
    spotsLeftSuffix: "lugares disponibles",
    fullyBookedLabel: "Cupo lleno",
    pickEventDateError: "Elija una fecha antes de publicar esta cita.",
    pickWeekdaysError: "Elija al menos un día de la semana y una hora de inicio.",
    maxSpotsRequiredError: "Establezca el número máximo de lugares.",
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
    aboutServiceTitle: "About the Event",
    serviceDetailsTitle: "Event details",

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

    scanQrBody: "Scan the code with your phone camera to add this registration to your calendar.",
    calendarQrLabel: "QR code to add this registration to a calendar",

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

export const eventsCopyEs: VerticalCopy = {
  service: "evento",
  Service: "Evento",
  services: "eventos",
  Services: "Eventos",
  booking: "registro",
  Booking: "Registro",
  bookings: "registros",
  Bookings: "Registros",
  client: "asistente",
  Client: "Asistente",
  clients: "asistentes",
  Clients: "Asistentes",

  bookVerb: "registrarse",
  bookingPage: "página de registro",
  publicBookingUrl: "URL pública de registro",
  bookingWorkspace: "Espacio de asistentes",
  bookingSummary: "Resumen del registro",
  manageBooking: "Gestionar registro",
  cancelBooking: "Cancelar registro",
  rescheduleBooking: "Reagendar registro",
  bookFullDay: "Reservar pase de día completo",

  phrases: {
    setupTitle: "Configure su página de registro de eventos",
    setupDoneTitle: "Su página de registro está lista",
    providerInfoBody:
      "Estos datos alimentan las confirmaciones de registro, la marca y su URL pública de registro.",
    availabilityBody:
      "Los eventos con horario generan lugares reales a partir de estas ventanas. Los pases de día completo solo necesitan que el día esté habilitado y libre de conflictos.",

    addServiceFirstError:
      "Agregue al menos un evento antes de publicar su página de registro.",
    serviceNameRequiredError:
      "Agregue un nombre de evento y una breve descripción antes de guardarlo.",
    keepOneServiceError:
      "Conserve al menos un evento. Agregue otro antes de eliminar este.",
    cancelActiveFirstError:
      "Cancele los registros activos de este evento antes de eliminarlo.",
    enableWeekdayError:
      "Habilite al menos un día para que los asistentes puedan registrarse.",
    chooseServiceFirstError:
      "Elija un evento antes de confirmar su registro.",
    pickDateFirstError: "Elija una fecha antes de confirmar su registro.",
    clientFieldsRequiredError:
      "El nombre, el correo electrónico y el número de teléfono del asistente son obligatorios.",

    chooseServiceTitle: "Elija un evento",
    chooseServiceBody:
      "Cada tarjeta muestra si es una sesión con horario o un pase de día completo.",
    onlyOneServiceBody:
      "Solo hay un evento disponible, por lo que este paso se omite automáticamente.",
    serviceUnavailableBody:
      "Este lugar podría liberarse, pero aún puede intentar tomarlo.",
    notesPlaceholder: "¿Algo que debamos saber antes del evento?",
    bookingSummaryBodyReview:
      "Revise aquí los detalles de su registro antes de confirmar.",
    bookingSummaryBodySuccess:
      "Los detalles de su registro confirmado permanecen visibles aquí.",
    aboutServiceTitle: "Acerca del evento",
    serviceDetailsTitle: "Detalles del evento",

    upcomingTitle: "Próximos registros",
    upcomingEmptyTitle: "No hay registros en los próximos 7 días",
    upcomingEmptyBody: "Los nuevos registros aparecen aquí automáticamente.",
    allBookingsTitle: "Todos los registros",
    noBookingsMatchTitle: "Ningún registro coincide con los filtros actuales",
    bookingsSoonDetail: "Registros que comienzan próximamente",
    activeBookingsDetail: "Registros actualmente activos",
    totalBookingsLabel: "Total de registros",
    servicesStatDetail: "Sesiones con horario y pases de día completo",
    searchPlaceholder: "Buscar asistente, evento, correo o teléfono",

    addBookingHint: "Haga clic en un día disponible para agregar un registro.",

    cancelExplain: "Cancelar libera el lugar de inmediato.",
    keepBookingButton: "Conservar mi lugar",
    cancelBookingButton: "Cancelar mi lugar",
    tryBookingButton: "Intentar registrarse",

    loadingBookingTitle: "Cargando su registro…",
    bookingNotFoundTitle: "No encontramos este registro en este dispositivo",
    bookingNotFoundBody:
      "Los registros se almacenan localmente en el navegador en el que se crearon. Si se registró desde otro navegador o dispositivo, abra este enlace allí. Si borró los datos de su navegador, el registro ya no es accesible desde este dispositivo.",
    bookNewButton: "Registrarse en otro evento",

    serviceEditorBody:
      "Cada evento es una sesión con horario o un pase de día completo. La capacidad y las notas permanecen visibles durante el registro.",
    noServicesTitle: "Aún no hay eventos",
    noServicesBody:
      "Agregue un evento para que los asistentes puedan comenzar a registrarse.",
    serviceDescPlaceholder:
      "Explique en una o dos líneas de qué trata el evento.",
    newServiceEyebrow: "Nuevo evento",
    editServiceEyebrow: "Editar evento",
    newServiceTitle: "Agregar un evento",
    editServiceTitle: "Actualizar este evento",
    addServiceButton: "Agregar evento",
    saveServiceButton: "Guardar evento",
    typeOfServiceLabel: "Tipo de evento",

    clientLabel: "Asistente",

    scanQrBody: "Escanee el código con la cámara de su teléfono para agregar este registro a su calendario.",
    calendarQrLabel: "Código QR para agregar este registro al calendario",

    eventDateLabel: "Fecha y hora del evento",
    singleOccurrenceHelper:
      "Este evento ocurre una sola vez, en la fecha y hora indicadas abajo. Reserve su lugar para registrarse.",
    spotsLeftSuffix: "lugares disponibles",
    fullyBookedLabel: "Cupo lleno",
    pickEventDateError: "Elija la fecha del evento antes de publicar este evento.",
    pickWeekdaysError:
      "Elija al menos un día de la semana y una hora de inicio para este evento recurrente.",
    maxSpotsRequiredError:
      "Establezca el número máximo de lugares para este evento.",
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
    aboutServiceTitle: "About the Space",
    serviceDetailsTitle: "Space details",

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

    scanQrBody: "Scan the code with your phone camera to add this reservation to your calendar.",
    calendarQrLabel: "QR code to add this reservation to a calendar",

    eventDateLabel: "Date and time",
    singleOccurrenceHelper: "This reservation happens on a single fixed date.",
    spotsLeftSuffix: "spots left",
    fullyBookedLabel: "Fully booked",
    pickEventDateError: "Pick a date before publishing this reservation.",
    pickWeekdaysError: "Pick at least one weekday and a start time.",
    maxSpotsRequiredError: "Set the maximum number of spots.",
  },
};

export const spacesCopyEs: VerticalCopy = {
  service: "espacio",
  Service: "Espacio",
  services: "espacios",
  Services: "Espacios",
  booking: "reserva",
  Booking: "Reserva",
  bookings: "reservas",
  Bookings: "Reservas",
  client: "huésped",
  Client: "Huésped",
  clients: "huéspedes",
  Clients: "Huéspedes",

  bookVerb: "reservar",
  bookingPage: "página de reservas",
  publicBookingUrl: "URL pública de reservas",
  bookingWorkspace: "Espacio de reservas",
  bookingSummary: "Resumen de la reserva",
  manageBooking: "Gestionar reserva",
  cancelBooking: "Cancelar reserva",
  rescheduleBooking: "Reagendar reserva",
  bookFullDay: "Reservar día completo",

  phrases: {
    setupTitle: "Configure su página de reservas",
    setupDoneTitle: "Su página de reservas está lista",
    providerInfoBody:
      "Estos datos alimentan las confirmaciones de reservas, la marca y su URL pública de reservas.",
    availabilityBody:
      "Los espacios por hora generan horarios reales a partir de estas ventanas. Los recintos de día completo solo necesitan que el día esté habilitado y libre de conflictos.",

    addServiceFirstError:
      "Agregue al menos un espacio antes de publicar su página de reservas.",
    serviceNameRequiredError:
      "Agregue un nombre de espacio y una breve descripción antes de guardarlo.",
    keepOneServiceError:
      "Conserve al menos un espacio. Agregue otro antes de eliminar este.",
    cancelActiveFirstError:
      "Cancele las reservas activas de este espacio antes de eliminarlo.",
    enableWeekdayError:
      "Habilite al menos un día para que los huéspedes puedan reservar.",
    chooseServiceFirstError: "Elija un espacio antes de confirmar la reserva.",
    pickDateFirstError: "Elija una fecha antes de confirmar la reserva.",
    clientFieldsRequiredError:
      "El nombre, el correo electrónico y el número de teléfono del huésped son obligatorios.",

    chooseServiceTitle: "Elija un espacio",
    chooseServiceBody:
      "Cada tarjeta muestra si reserva un horario por hora o el día completo.",
    onlyOneServiceBody:
      "Solo hay un espacio disponible, por lo que este paso se omite automáticamente.",
    serviceUnavailableBody:
      "Este horario podría liberarse, pero aún puede intentar reservarlo.",
    notesPlaceholder: "¿Algo que debamos saber antes de su reserva?",
    bookingSummaryBodyReview:
      "Revise aquí los detalles de la reserva en tiempo real antes de confirmar.",
    bookingSummaryBodySuccess:
      "Los detalles de la reserva confirmada permanecen visibles aquí.",
    aboutServiceTitle: "Acerca del espacio",
    serviceDetailsTitle: "Detalles del espacio",

    upcomingTitle: "Próximas reservas",
    upcomingEmptyTitle: "No hay reservas en los próximos 7 días",
    upcomingEmptyBody: "Las nuevas reservas aparecen aquí automáticamente.",
    allBookingsTitle: "Todas las reservas",
    noBookingsMatchTitle: "Ninguna reserva coincide con los filtros actuales",
    bookingsSoonDetail: "Reservas que comienzan próximamente",
    activeBookingsDetail: "Reservas actualmente activas",
    totalBookingsLabel: "Total de reservas",
    servicesStatDetail: "Espacios por hora y de día completo",
    searchPlaceholder: "Buscar huésped, espacio, correo o teléfono",

    addBookingHint: "Haga clic en un día disponible para agregar una reserva.",

    cancelExplain: "Cancelar libera el horario de inmediato.",
    keepBookingButton: "Conservar reserva",
    cancelBookingButton: "Cancelar reserva",
    tryBookingButton: "Intentar reservar",

    loadingBookingTitle: "Cargando su reserva…",
    bookingNotFoundTitle: "No encontramos esta reserva en este dispositivo",
    bookingNotFoundBody:
      "Las reservas se almacenan localmente en el navegador en el que se crearon. Si reservó desde otro navegador o dispositivo, abra este enlace allí. Si borró los datos de su navegador, la reserva ya no es accesible desde este dispositivo.",
    bookNewButton: "Hacer una nueva reserva",

    serviceEditorBody:
      "Cada espacio es una reserva por hora o un recinto de día completo. La capacidad y las notas permanecen visibles durante la reserva.",
    noServicesTitle: "Aún no hay espacios",
    noServicesBody:
      "Agregue un espacio para que los huéspedes puedan comenzar a reservar.",
    serviceDescPlaceholder:
      "Explique en una o dos líneas qué incluye la reserva.",
    newServiceEyebrow: "Nuevo espacio",
    editServiceEyebrow: "Editar espacio",
    newServiceTitle: "Agregar un espacio",
    editServiceTitle: "Actualizar este espacio",
    addServiceButton: "Agregar espacio",
    saveServiceButton: "Guardar espacio",
    typeOfServiceLabel: "Tipo de espacio",

    clientLabel: "Huésped",

    scanQrBody: "Escanee el código con la cámara de su teléfono para agregar esta reserva a su calendario.",
    calendarQrLabel: "Código QR para agregar esta reserva al calendario",

    eventDateLabel: "Fecha y hora",
    singleOccurrenceHelper: "Esta reserva ocurre en una sola fecha fija.",
    spotsLeftSuffix: "lugares disponibles",
    fullyBookedLabel: "Cupo lleno",
    pickEventDateError: "Elija una fecha antes de publicar esta reserva.",
    pickWeekdaysError: "Elija al menos un día de la semana y una hora de inicio.",
    maxSpotsRequiredError: "Establezca el número máximo de lugares.",
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
    aboutServiceTitle: "About the Service",
    serviceDetailsTitle: "Service details",

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

    scanQrBody: "Scan the code with your phone camera to add this session to your calendar.",
    calendarQrLabel: "QR code to add this session to a calendar",

    eventDateLabel: "Date and time",
    singleOccurrenceHelper: "This session happens on a single fixed date.",
    spotsLeftSuffix: "spots left",
    fullyBookedLabel: "Fully booked",
    pickEventDateError: "Pick a date before publishing this session.",
    pickWeekdaysError: "Pick at least one weekday and a start time.",
    maxSpotsRequiredError: "Set the maximum number of spots.",
  },
};

export const professionalCopyEs: VerticalCopy = {
  service: "servicio",
  Service: "Servicio",
  services: "servicios",
  Services: "Servicios",
  booking: "sesión",
  Booking: "Sesión",
  bookings: "sesiones",
  Bookings: "Sesiones",
  client: "cliente",
  Client: "Cliente",
  clients: "clientes",
  Clients: "Clientes",

  bookVerb: "agendar",
  bookingPage: "página de agendamiento",
  publicBookingUrl: "URL pública de agendamiento",
  bookingWorkspace: "Espacio de clientes",
  bookingSummary: "Resumen de la sesión",
  manageBooking: "Gestionar sesión",
  cancelBooking: "Cancelar sesión",
  rescheduleBooking: "Reagendar sesión",
  bookFullDay: "Reservar día completo",

  phrases: {
    setupTitle: "Configure su página de agendamiento",
    setupDoneTitle: "Su página de agendamiento está lista",
    providerInfoBody:
      "Estos datos alimentan las confirmaciones de sesiones, la marca y su URL pública de agendamiento.",
    availabilityBody:
      "Las sesiones con horario generan horarios reales a partir de estas ventanas. Los compromisos de día completo solo necesitan que el día de la semana esté habilitado y libre de conflictos.",

    addServiceFirstError:
      "Agregue al menos un servicio antes de publicar su página de agendamiento.",
    serviceNameRequiredError:
      "Agregue un nombre de servicio y una breve descripción antes de guardarlo.",
    keepOneServiceError:
      "Conserve al menos un servicio. Agregue otro antes de eliminar este.",
    cancelActiveFirstError:
      "Cancele las sesiones activas de este servicio antes de eliminarlo.",
    enableWeekdayError:
      "Habilite al menos un día de la semana para que los clientes puedan agendar sesiones.",
    chooseServiceFirstError: "Elija un servicio antes de confirmar la sesión.",
    pickDateFirstError: "Elija una fecha antes de confirmar la sesión.",
    clientFieldsRequiredError:
      "El nombre, el correo electrónico y el número de teléfono del cliente son obligatorios.",

    chooseServiceTitle: "Elija un servicio",
    chooseServiceBody:
      "Cada tarjeta muestra si agenda una sesión con horario o reserva un día completo.",
    onlyOneServiceBody:
      "Solo hay un servicio disponible, por lo que este paso se omite automáticamente.",
    serviceUnavailableBody:
      "Este horario podría liberarse, pero aún puede intentar agendarlo.",
    notesPlaceholder: "¿Algo que debamos saber antes de su sesión?",
    bookingSummaryBodyReview:
      "Revise aquí los detalles de la sesión en tiempo real antes de confirmar.",
    bookingSummaryBodySuccess:
      "Los detalles de la sesión confirmada permanecen visibles aquí.",
    aboutServiceTitle: "Acerca del servicio",
    serviceDetailsTitle: "Detalles del servicio",

    upcomingTitle: "Próximas sesiones",
    upcomingEmptyTitle: "No hay sesiones en los próximos 7 días",
    upcomingEmptyBody: "Las nuevas sesiones aparecen aquí automáticamente.",
    allBookingsTitle: "Todas las sesiones",
    noBookingsMatchTitle: "Ninguna sesión coincide con los filtros actuales",
    bookingsSoonDetail: "Sesiones programadas próximamente",
    activeBookingsDetail: "Sesiones actualmente activas",
    totalBookingsLabel: "Total de sesiones",
    servicesStatDetail: "Ofertas con horario y de día completo",
    searchPlaceholder: "Buscar cliente, servicio, correo o teléfono",

    addBookingHint: "Haga clic en un día disponible para agregar una sesión.",

    cancelExplain: "Cancelar libera el horario de inmediato.",
    keepBookingButton: "Conservar sesión",
    cancelBookingButton: "Cancelar sesión",
    tryBookingButton: "Intentar agendar",

    loadingBookingTitle: "Cargando su sesión…",
    bookingNotFoundTitle: "No encontramos esta sesión en este dispositivo",
    bookingNotFoundBody:
      "Las sesiones se almacenan localmente en el navegador en el que se agendaron. Si agendó desde otro navegador o dispositivo, abra este enlace allí. Si borró los datos de su navegador, la sesión ya no es accesible desde este dispositivo.",
    bookNewButton: "Agendar una nueva sesión",

    serviceEditorBody:
      "Cada servicio es una sesión con horario o un compromiso de día completo. La capacidad y las notas permanecen visibles durante el agendamiento.",
    noServicesTitle: "Aún no hay servicios",
    noServicesBody:
      "Agregue un servicio para que los clientes puedan comenzar a agendar sesiones.",
    serviceDescPlaceholder:
      "Explique en una o dos líneas qué incluye la sesión.",
    newServiceEyebrow: "Nuevo servicio",
    editServiceEyebrow: "Editar servicio",
    newServiceTitle: "Agregar un servicio",
    editServiceTitle: "Actualizar este servicio",
    addServiceButton: "Agregar servicio",
    saveServiceButton: "Guardar servicio",
    typeOfServiceLabel: "Tipo de sesión",

    clientLabel: "Cliente",

    scanQrBody: "Escanee el código con la cámara de su teléfono para agregar esta sesión a su calendario.",
    calendarQrLabel: "Código QR para agregar esta sesión al calendario",

    eventDateLabel: "Fecha y hora",
    singleOccurrenceHelper: "Esta sesión ocurre en una sola fecha fija.",
    spotsLeftSuffix: "lugares disponibles",
    fullyBookedLabel: "Cupo lleno",
    pickEventDateError: "Elija una fecha antes de publicar esta sesión.",
    pickWeekdaysError: "Elija al menos un día de la semana y una hora de inicio.",
    maxSpotsRequiredError: "Establezca el número máximo de lugares.",
  },
};

const COPY: Record<Lang, Record<VerticalId, VerticalCopy>> = {
  en: {
    healthcare: healthcareCopy,
    events: eventsCopy,
    spaces: spacesCopy,
    professional: professionalCopy,
  },
  es: {
    healthcare: healthcareCopyEs,
    events: eventsCopyEs,
    spaces: spacesCopyEs,
    professional: professionalCopyEs,
  },
};

const DEFAULTS: Record<Lang, VerticalCopy> = {
  en: defaultCopy,
  es: defaultCopyEs,
};

export function getVerticalCopy(
  verticalId?: VerticalId,
  lang: Lang = "en",
): VerticalCopy {
  const table = COPY[lang] ?? COPY.en;
  if (!verticalId) {
    return DEFAULTS[lang] ?? defaultCopy;
  }
  return table[verticalId] ?? DEFAULTS[lang] ?? defaultCopy;
}
