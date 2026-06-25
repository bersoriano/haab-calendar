import type { Lang } from "@/lib/types";

export type BookingDict = {
  common: {
    back: string;
    next: string;
    confirm: string;
    cancel: string;
    loading: string;
    required: string;
  };
  public: {
    yourName: string;
    email: string;
    phone: string;
    notes: string;
    selectDate: string;
    selectTime: string;
    holdRemaining: string;
    spotsLeftSuffix: string;
    fullyBooked: string;
  };
  manage: {
    title: string;
    lookupPrompt: string;
    notFound: string;
    cancelConfirm: string;
    rescheduleTitle: string;
    cancelled: string;
    rescheduled: string;
    close: string;
    downloadEvent: string;
    preparingQr: string;
    confirmCancellation: string;
    chooseNewSlot: string;
    chooseNewDay: string;
    selectReplacementSlot: string;
    confirmFullDayReschedule: string;
    noSlotsOnDateHelper: string;
    newDayFreeReplaceHelper: string;
    saveNewTime: string;
    contactProvider: string;
  };
  publicFlow: {
    // Calendar
    previous: string;
    today: string;
    next: string;
    onlyRealFreeDatesActive: string;
    noDateSelectedYet: string;
    selected: string;
    // Step summary / helpers / buttons
    dateNotSet: string;
    selectADay: string;
    selectADate: string;
    selectATime: string;
    fullDay: string;
    continueToMyDetails: string;
    reserveMySpot: string;
    myDetails: string;
    pickDateAndTimeHelper: string;
    pickTimeHelper: string;
    clickToEnterDetails: string;
    pickDateFullDayHelper: string;
    dayFreeHelper: string;
    dayUnavailablePickAnother: string;
    // Section titles & misc actions
    bookingCancelled: string;
    bookingConfirmed: string;
    chooseAnother: string;
    selectedDate: string;
    finishBeforeHoldExpires: string;
    back: string;
    confirm: string;
    cancel: string;
    update: string;
    pickDateAndTime: string;
    typeDateTimeInstead: string;
    describeDateTime: string;
    describeDate: string;
    nlPlaceholderDateTime: string;
    nlPlaceholderDate: string;
    chooseLocation: string;
    // Details fields
    fullName: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    phoneNumber: string;
    phonePlaceholder: string;
    notes: string;
    // Summary field labels
    aboutTheAppointment: string;
    description: string;
    when: string;
    type: string;
    specialty: string;
    capacity: string;
    length: string;
    total: string;
    notSet: string;
    location: string;
    locations: string;
    phone: string;
    phones: string;
    // Slots / availability
    availableTimeSlots: string;
    fullDayReservation: string;
    selectHighlightedDateFirst: string;
    chooseADate: string;
    chooseDateBody: string;
    noSlotsLeft: string;
    noSlotsLeftBody: string;
    ends: string;
    open: string;
    dayFreeFullDay: string;
    dayUnavailableChooseAnother: string;
    // Review summary
    notSelected: string;
    notEnteredYet: string;
    none: string;
    changeDateTime: string;
    newDateTime: string;
    // Success step
    appointmentDetails: string;
    customerDetails: string;
    addToCalendar: string;
    showQrCode: string;
    reschedule: string;
    bookAnother: string;
    manageBookingAnytime: string;
    copied: string;
    copyLink: string;
    manageLinkCopied: string;
    saveThisLinkBody: string;
  };
};

export const bookingTranslations: Record<Lang, BookingDict> = {
  en: {
    common: {
      back: "Back",
      next: "Next",
      confirm: "Confirm",
      cancel: "Cancel",
      loading: "Loading…",
      required: "Required",
    },
    public: {
      yourName: "Your name",
      email: "Email",
      phone: "Phone",
      notes: "Notes",
      selectDate: "Select a date",
      selectTime: "Select a time",
      holdRemaining: "Time left to confirm",
      spotsLeftSuffix: "left",
      fullyBooked: "Fully booked",
    },
    manage: {
      title: "Manage your booking",
      lookupPrompt: "Enter your booking reference",
      notFound: "We couldn't find that booking.",
      cancelConfirm: "Are you sure you want to cancel?",
      rescheduleTitle: "Reschedule your booking",
      cancelled: "Your booking has been cancelled.",
      rescheduled: "Your booking has been rescheduled.",
      close: "Close",
      downloadEvent: "Download event to your phone",
      preparingQr: "Preparing calendar QR...",
      confirmCancellation: "Confirm cancellation",
      chooseNewSlot: "Choose a new slot",
      chooseNewDay: "Choose a new day",
      selectReplacementSlot: "Select a replacement slot",
      confirmFullDayReschedule: "Confirm full-day reschedule",
      noSlotsOnDateHelper: "No available slots on this date. Choose another date from the calendar.",
      newDayFreeReplaceHelper: "This new day is free and will replace the original full-day reservation as soon as you confirm.",
      saveNewTime: "Save new time",
      contactProvider: "Contact provider",
    },
    publicFlow: {
      previous: "Previous",
      today: "Today",
      next: "Next",
      onlyRealFreeDatesActive: "Only real free dates are active.",
      noDateSelectedYet: "No date selected yet",
      selected: "Selected",
      dateNotSet: "Date not set",
      selectADay: "Select a Day",
      selectADate: "Select a Date",
      selectATime: "Select a Time",
      fullDay: "Full Day",
      continueToMyDetails: "Continue to My Details",
      reserveMySpot: "Reserve my spot",
      myDetails: "My Details",
      pickDateAndTimeHelper: "Pick a date from the calendar and time slot below to continue.",
      pickTimeHelper: "Pick a time slot to continue.",
      clickToEnterDetails: "Click the button to enter your details.",
      pickDateFullDayHelper: "Pick a date to reserve the full day.",
      dayFreeHelper: "This day is free. Click the button to enter your details.",
      dayUnavailablePickAnother: "This day isn't available. Pick another date.",
      bookingCancelled: "Booking Cancelled",
      bookingConfirmed: "Booking Confirmed",
      chooseAnother: "Choose another",
      selectedDate: "Selected Date",
      finishBeforeHoldExpires: "Finish your details before the temporary hold expires.",
      back: "Back",
      confirm: "Confirm",
      cancel: "Cancel",
      update: "Update",
      pickDateAndTime: "Pick a date and time",
      typeDateTimeInstead: "Type a date and time instead",
      describeDateTime: "Describe a date and time",
      describeDate: "Describe a date",
      nlPlaceholderDateTime: "e.g. \"next Monday at 2 PM\"",
      nlPlaceholderDate: "e.g. \"next Friday\"",
      chooseLocation: "Choose a location",
      fullName: "Full name",
      namePlaceholder: "Jamie Rivera",
      email: "Email",
      emailPlaceholder: "jamie@example.com",
      phoneNumber: "Phone number",
      phonePlaceholder: "+1 (555) 123-4567",
      notes: "Notes",
      aboutTheAppointment: "About the Appointment",
      description: "Description",
      when: "When",
      type: "Type",
      specialty: "Specialty",
      capacity: "Capacity",
      length: "Length",
      total: "Total",
      notSet: "Not set",
      location: "Location",
      locations: "Locations",
      phone: "Phone",
      phones: "Phones",
      availableTimeSlots: "Available time slots",
      fullDayReservation: "Full-day reservation",
      selectHighlightedDateFirst: "Select a highlighted date from the calendar first.",
      chooseADate: "Choose a date",
      chooseDateBody:
        "Only real free dates are highlighted. Once you pick one, the next action becomes available here.",
      noSlotsLeft: "No slots left on this date",
      noSlotsLeftBody: "Pick another available date from the calendar to continue.",
      ends: "Ends",
      open: "Open",
      dayFreeFullDay: "This day is currently free for a full-day reservation.",
      dayUnavailableChooseAnother:
        "This day is unavailable. Choose another date from the calendar.",
      notSelected: "Not selected",
      notEnteredYet: "Not entered yet",
      none: "None",
      changeDateTime: "Change date/time",
      newDateTime: "New date/time",
      appointmentDetails: "Appointment Details",
      customerDetails: "Customer Details",
      addToCalendar: "Add to calendar",
      showQrCode: "Show QR code",
      reschedule: "Reschedule",
      bookAnother: "Book another",
      manageBookingAnytime: "Manage this booking anytime",
      copied: "Copied",
      copyLink: "Copy link",
      manageLinkCopied: "Manage link copied to clipboard",
      saveThisLinkBody:
        "Save this link or use the calendar attachment — anyone with the link can manage this booking.",
    },
  },
  es: {
    common: {
      back: "Atrás",
      next: "Siguiente",
      confirm: "Confirmar",
      cancel: "Cancelar",
      loading: "Cargando…",
      required: "Obligatorio",
    },
    public: {
      yourName: "Su nombre",
      email: "Correo electrónico",
      phone: "Teléfono",
      notes: "Notas",
      selectDate: "Seleccione una fecha",
      selectTime: "Seleccione un horario",
      holdRemaining: "Tiempo restante para confirmar",
      spotsLeftSuffix: "disponibles",
      fullyBooked: "Cupo lleno",
    },
    manage: {
      title: "Gestione su reserva",
      lookupPrompt: "Ingrese su referencia de reserva",
      notFound: "No encontramos esa reserva.",
      cancelConfirm: "¿Está seguro de que desea cancelar?",
      rescheduleTitle: "Reagende su reserva",
      cancelled: "Su reserva ha sido cancelada.",
      rescheduled: "Su reserva ha sido reagendada.",
      close: "Cerrar",
      downloadEvent: "Descargue el evento en su teléfono",
      preparingQr: "Preparando código QR del calendario...",
      confirmCancellation: "Confirmar cancelación",
      chooseNewSlot: "Elija un nuevo horario",
      chooseNewDay: "Elija un nuevo día",
      selectReplacementSlot: "Seleccione un horario de reemplazo",
      confirmFullDayReschedule: "Confirmar reagenda de día completo",
      noSlotsOnDateHelper: "No hay horarios disponibles en esta fecha. Elija otra fecha en el calendario.",
      newDayFreeReplaceHelper: "Este nuevo día está libre y reemplazará la reservación original de día completo en cuanto confirme.",
      saveNewTime: "Guardar nuevo horario",
      contactProvider: "Contactar al proveedor",
    },
    publicFlow: {
      previous: "Anterior",
      today: "Hoy",
      next: "Siguiente",
      onlyRealFreeDatesActive: "Solo las fechas realmente libres están activas.",
      noDateSelectedYet: "Aún no ha seleccionado una fecha",
      selected: "Seleccionado",
      dateNotSet: "Fecha no definida",
      selectADay: "Seleccione un día",
      selectADate: "Seleccione una fecha",
      selectATime: "Seleccione un horario",
      fullDay: "Día completo",
      continueToMyDetails: "Continúe a sus datos",
      reserveMySpot: "Reserve su lugar",
      myDetails: "Sus datos",
      pickDateAndTimeHelper:
        "Elija una fecha del calendario y un horario abajo para continuar.",
      pickTimeHelper: "Elija un horario para continuar.",
      clickToEnterDetails: "Haga clic en el botón para ingresar sus datos.",
      pickDateFullDayHelper: "Elija una fecha para reservar el día completo.",
      dayFreeHelper: "Este día está libre. Haga clic en el botón para ingresar sus datos.",
      dayUnavailablePickAnother: "Este día no está disponible. Elija otra fecha.",
      bookingCancelled: "Reserva cancelada",
      bookingConfirmed: "Reserva confirmada",
      chooseAnother: "Elija otro",
      selectedDate: "Fecha seleccionada",
      finishBeforeHoldExpires:
        "Complete sus datos antes de que expire la reservación temporal.",
      back: "Atrás",
      confirm: "Confirmar",
      cancel: "Cancelar",
      update: "Actualizar",
      pickDateAndTime: "Elija una fecha y un horario",
      typeDateTimeInstead: "Escriba una fecha y un horario",
      describeDateTime: "Describa una fecha y un horario",
      describeDate: "Describa una fecha",
      nlPlaceholderDateTime: "p. ej. \"el próximo lunes a las 2 PM\"",
      nlPlaceholderDate: "p. ej. \"el próximo viernes\"",
      chooseLocation: "Elija una ubicación",
      fullName: "Nombre completo",
      namePlaceholder: "Juan Pérez",
      email: "Correo electrónico",
      emailPlaceholder: "juan@ejemplo.com",
      phoneNumber: "Número de teléfono",
      phonePlaceholder: "+52 55 1234 5678",
      notes: "Notas",
      aboutTheAppointment: "Sobre la cita",
      description: "Descripción",
      when: "Cuándo",
      type: "Tipo",
      specialty: "Especialidad",
      capacity: "Capacidad",
      length: "Duración",
      total: "Total",
      notSet: "No definido",
      location: "Ubicación",
      locations: "Ubicaciones",
      phone: "Teléfono",
      phones: "Teléfonos",
      availableTimeSlots: "Horarios disponibles",
      fullDayReservation: "Reservación de día completo",
      selectHighlightedDateFirst:
        "Primero seleccione una fecha resaltada en el calendario.",
      chooseADate: "Elija una fecha",
      chooseDateBody:
        "Solo se resaltan las fechas realmente libres. Cuando elija una, la siguiente acción aparecerá aquí.",
      noSlotsLeft: "No quedan horarios en esta fecha",
      noSlotsLeftBody: "Elija otra fecha disponible en el calendario para continuar.",
      ends: "Termina",
      open: "Disponible",
      dayFreeFullDay: "Este día está libre para una reservación de día completo.",
      dayUnavailableChooseAnother:
        "Este día no está disponible. Elija otra fecha en el calendario.",
      notSelected: "No seleccionado",
      notEnteredYet: "Aún no ingresado",
      none: "Ninguna",
      changeDateTime: "Cambiar fecha/horario",
      newDateTime: "Nueva fecha/horario",
      appointmentDetails: "Detalles de la cita",
      customerDetails: "Datos del cliente",
      addToCalendar: "Agregar al calendario",
      showQrCode: "Mostrar código QR",
      reschedule: "Reagendar",
      bookAnother: "Reserve otra",
      manageBookingAnytime: "Gestione esta reserva en cualquier momento",
      copied: "Copiado",
      copyLink: "Copiar enlace",
      manageLinkCopied: "Enlace de gestión copiado al portapapeles",
      saveThisLinkBody:
        "Guarde este enlace o use el archivo de calendario adjunto; cualquier persona con el enlace puede gestionar esta reserva.",
    },
  },
};

export function bookingT(lang: Lang = "en"): BookingDict {
  return bookingTranslations[lang] ?? bookingTranslations.en;
}
