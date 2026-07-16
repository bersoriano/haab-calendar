import type { Lang, WeekdayKey } from "@/lib/types";

export type BookingDict = {
  common: {
    back: string;
    next: string;
    confirm: string;
    cancel: string;
    loading: string;
    saving: string;
    saved: string;
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
    holdEndingSoon: string;
    holdEndingBody: string;
    holdEndingCta: string;
    holdLabel: string;
    holdCancelled: string;
    holdSecured: string;
    holdExpired: string;
    holdInactiveBody: string;
    holdConfirmedBody: string;
    holdFinishBody: string;
    expired: string;
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
    progressLabel: string;
    dateAndTime: string;
    completedPrefix: string;
    currentStepPrefix: string;
    upcomingPrefix: string;
    bookingSummaryStatus: string;
    statusCancelled: string;
    statusUpdated: string;
    statusConfirmed: string;
  };
  admin: {
    // Dashboard
    upcoming7Days: string;
    confirmed: string;
    allTimeEveryStatus: string;
    capacityNotSet: string;
    totalNotSet: string;
    // Bookings list
    allStatuses: string;
    rescheduled: string;
    cancelled: string;
    allTypes: string;
    appointments: string;
    tryBroaderSearch: string;
    // Calendar
    monthlyCalendar: string;
    newBookingPrefix: string;
    // Settings
    providerInformation: string;
    configuredByParentApp: string;
    weeklyAvailability: string;
    resetStandaloneSetup: string;
    saveChanges: string;
    couldNotSaveSettings: string;
    languageLabel: string;
    languageHint: string;
    publicBookingLink: string;
    viewPublicPage: string;
    availabilityStart: string;
    availabilityEnd: string;
    blockedTimes: string;
    blockedTimesHint: string;
    addBlock: string;
    blockedFrom: string;
    blockedTo: string;
    removeBlock: string;
    weekdays: Record<WeekdayKey, string>;
    // Nav
    tabDashboard: string;
    tabCalendar: string;
    tabSettings: string;
    backToWorkspace: string;
    signOut: string;
    // ServiceEditor
    serviceReadOnly: string;
    editButton: string;
    deleteButton: string;
    clearButton: string;
    occurrenceLabel: string;
    occurrenceSingle: string;
    occurrenceWeekly: string;
    occurrencePeriodic: string;
    singleOccurrenceHint: string;
    weeklyOccurrenceHint: string;
    periodicOccurrenceHint: string;
    bookingTypeLabel: string;
    startLabel: string;
    endLabel: string;
    repeatsOn: string;
    durationLabel: string;
    medicalSpecialtyLabel: string;
    descriptionLabel: string;
    capacityLabel: string;
    maxSpotsLabel: string;
    notesLabel: string;
    totalLabel: string;
    locationSection: string;
    phoneSection: string;
    address1Label: string;
    address2Label: string;
    addAnotherAddress: string;
    addAnAddress: string;
    phone1Label: string;
    phone2Label: string;
    addAnotherPhone: string;
    addAPhone: string;
    priceAtLocation: string;
    addressHintSlot1: string;
    addressHintSlot2: string;
    addressHintFull: string;
    phoneHintSlot1: string;
    phoneHintSlot2: string;
    phoneHintFull: string;
    notesPlaceholder: string;
  };
  setup: {
    eyebrow: string;
    wizardBody: string;
    stepLabel: string;
    stepProvider: string;
    stepAvailability: string;
    stepDone: string;
    statusReady: string;
    statusCurrent: string;
    statusNext: string;
    step1Title: string;
    step2Title: string;
    bookingLength: string;
    bookingLengthHint: string;
    lengthLabel: string;
    fullDayOption: string;
    doneEyebrow: string;
    doneBody: string;
    editServicesPrefix: string;
    editServicesSuffix: string;
    goToDashboard: string;
    openPublicPage: string;
    continueButton: string;
    providerRequiredFieldsError: string;
  };
  healthcareRole: {
    dataTitle: string;
    informationTitle: string;
    contactLabel: string;
    requiredFieldsError: string;
    addressHintSlot1: string;
    addressHintSlot2: string;
    addressHintFull: string;
    phoneHintSlot1: string;
    phoneHintSlot2: string;
    phoneHintFull: string;
  };
  welcome: {
    badge: string;
    title: string;
    body: string;
    featureCustomizable: string;
    featureNoCard: string;
    featureReady: string;
  };
  providerForm: {
    fullName: string;
    businessName: string;
    confirmationEmail: string;
    phoneNumber1: string;
    phoneNumber2: string;
    address1: string;
    address2: string;
    fullNamePlaceholder: string;
    businessNamePlaceholder: string;
    emailPlaceholder: string;
    phone1Placeholder: string;
    phone2Placeholder: string;
    address1Placeholder: string;
    address2Placeholder: string;
    heroText: string;
    heroTextHint: string;
    heroTextPlaceholder: string;
    headerImage: string;
    headerImageHint: string;
    headerImagePreviewAlt: string;
    noHeaderImage: string;
    uploadingImage: string;
    replaceImage: string;
    uploadImage: string;
    removeImage: string;
    imageTypeError: string;
    imageSizeError: string;
    imageUploadError: string;
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
      saving: "Saving...",
      saved: "Saved.",
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
      holdEndingSoon: "Hold ending soon",
      holdEndingBody: "Your booking hold is ending soon.",
      holdEndingCta: "Confirm now, or the selected time may become available to someone else.",
      holdLabel: "Booking hold",
      holdCancelled: "Booking cancelled",
      holdSecured: "Booking secured",
      holdExpired: "Hold expired",
      holdInactiveBody: "This reservation is no longer active.",
      holdConfirmedBody: "Your booking is confirmed and the temporary hold is complete.",
      holdFinishBody: "Finish your details before the temporary hold expires.",
      expired: "Expired",
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
      progressLabel: "Booking progress",
      dateAndTime: "Date & Time",
      completedPrefix: "Completed: ",
      currentStepPrefix: "Current step: ",
      upcomingPrefix: "Upcoming: ",
      bookingSummaryStatus: "Booking summary",
      statusCancelled: "Cancelled",
      statusUpdated: "Updated",
      statusConfirmed: "Confirmed",
    },
    admin: {
      upcoming7Days: "Upcoming (7 days)",
      confirmed: "Confirmed",
      allTimeEveryStatus: "All time, every status",
      capacityNotSet: "Capacity not set",
      totalNotSet: "Total not set",
      allStatuses: "All statuses",
      rescheduled: "Rescheduled",
      cancelled: "Cancelled",
      allTypes: "All types",
      appointments: "Appointments",
      tryBroaderSearch: "Try a broader search or clear the filters.",
      monthlyCalendar: "Monthly calendar",
      newBookingPrefix: "New booking",
      providerInformation: "Provider information",
      configuredByParentApp: "Configured by the parent app. These settings are visible but not editable.",
      weeklyAvailability: "Weekly availability",
      resetStandaloneSetup: "Reset standalone setup",
      saveChanges: "Save changes",
      couldNotSaveSettings: "Could not save settings.",
      languageLabel: "Language",
      languageHint: "Sets the language clients see on your public booking page.",
      publicBookingLink: "Public booking link:",
      viewPublicPage: "View public page",
      availabilityStart: "Start",
      availabilityEnd: "End",
      blockedTimes: "Blocked times",
      blockedTimesHint: "Hide breaks or unavailable windows from booking.",
      addBlock: "Add block",
      blockedFrom: "From",
      blockedTo: "To",
      removeBlock: "Remove",
      weekdays: {
        sunday: "Sunday",
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
      },
      tabDashboard: "Dashboard",
      tabCalendar: "Calendar",
      tabSettings: "Settings",
      backToWorkspace: "← Back to workspace",
      signOut: "Sign out",
      serviceReadOnly: "Configured by the parent app. Service editing is read-only in this mode.",
      editButton: "Edit",
      deleteButton: "Delete",
      clearButton: "Clear",
      occurrenceLabel: "Occurrence",
      occurrenceSingle: "Single",
      occurrenceWeekly: "Weekly",
      occurrencePeriodic: "Periodic",
      singleOccurrenceHint: "This event happens once, on a fixed date and time.",
      weeklyOccurrenceHint: "This event recurs on the weekdays you pick, at a fixed time.",
      periodicOccurrenceHint: "This event repeats on your weekly availability.",
      bookingTypeLabel: "Booking type",
      startLabel: "Start",
      endLabel: "End",
      repeatsOn: "Repeats on",
      durationLabel: "Duration",
      medicalSpecialtyLabel: "Medical specialty",
      descriptionLabel: "Description",
      capacityLabel: "Capacity",
      maxSpotsLabel: "Maximum spots",
      notesLabel: "Notes",
      totalLabel: "Total",
      locationSection: "Location",
      phoneSection: "Phone",
      address1Label: "Address 1",
      address2Label: "Address 2",
      addAnotherAddress: "Add another address",
      addAnAddress: "Add an address",
      phone1Label: "Phone 1",
      phone2Label: "Phone 2",
      addAnotherPhone: "Add another phone",
      addAPhone: "Add a phone",
      priceAtLocation: "Price at this location",
      addressHintSlot1: "We'll save this as Address 1 in your provider profile so other services can reuse it.",
      addressHintSlot2: "We'll save this as Address 2 in your provider profile so other services can reuse it.",
      addressHintFull: "Both provider address slots are already taken — this address will stay with this service only.",
      phoneHintSlot1: "We'll save this as Phone 1 in your provider profile so other services can reuse it.",
      phoneHintSlot2: "We'll save this as Phone 2 in your provider profile so other services can reuse it.",
      phoneHintFull: "Both provider phone slots are already taken — this phone will stay with this service only.",
      notesPlaceholder: "Bring prior records or arrive 10 minutes early.",
    },
    setup: {
      eyebrow: "Setup",
      wizardBody: "Add your details and weekly hours, then publish.",
      stepLabel: "Step",
      stepProvider: "My Data",
      stepAvailability: "Availability",
      stepDone: "Done",
      statusReady: "Ready",
      statusCurrent: "Current",
      statusNext: "Next",
      step1Title: "My data",
      step2Title: "Set the weekly availability schedule",
      bookingLength: "Booking length",
      bookingLengthHint: "Choose how long each booking should last. You can refine individual services later from the Services tab.",
      lengthLabel: "Length",
      fullDayOption: "Full day",
      doneEyebrow: "Ready",
      doneBody: "Publish now, then manage everything from your workspace.",
      editServicesPrefix: "Edit these anytime from the",
      editServicesSuffix: "tab.",
      goToDashboard: "Go to dashboard",
      openPublicPage: "Open public booking page",
      continueButton: "Continue",
      providerRequiredFieldsError: "Provider name, business name, and email are all required.",
    },
    healthcareRole: {
      dataTitle: "Physician Data",
      informationTitle: "Physician information",
      contactLabel: "Contact physician",
      requiredFieldsError: "Physician name, business name, and email are all required.",
      addressHintSlot1: "We'll save this as Address 1 in your physician profile so other services can reuse it.",
      addressHintSlot2: "We'll save this as Address 2 in your physician profile so other services can reuse it.",
      addressHintFull: "Both physician address slots are already taken — this address will stay with this service only.",
      phoneHintSlot1: "We'll save this as Phone 1 in your physician profile so other services can reuse it.",
      phoneHintSlot2: "We'll save this as Phone 2 in your physician profile so other services can reuse it.",
      phoneHintFull: "Both physician phone slots are already taken — this phone will stay with this service only.",
    },
    welcome: {
      badge: "Welcome to Haab",
      title: "What kind of business are we setting up today?",
      body: "Pick your industry and we'll prefill your services, weekly hours, and a polished booking page. You can edit everything afterward in under a minute.",
      featureCustomizable: "Fully customizable later",
      featureNoCard: "No credit card required",
      featureReady: "Ready to share in minutes",
    },
    providerForm: {
      fullName: "Full name",
      businessName: "Business name",
      confirmationEmail: "Confirmation email",
      phoneNumber1: "Phone Number 1",
      phoneNumber2: "Phone Number 2",
      address1: "Address 1",
      address2: "Address 2",
      fullNamePlaceholder: "Dr. Maya Alvarez",
      businessNamePlaceholder: "Haab Health Studio",
      emailPlaceholder: "bookings@haabcalendar.com",
      phone1Placeholder: "+1 (555) 123-4567",
      phone2Placeholder: "Optional secondary number",
      address1Placeholder: "123 Main St, Suite 4, Springfield",
      address2Placeholder: "Optional secondary location",
      heroText: "Hero text",
      heroTextHint: "Shown over the header image. Defaults to your business name.",
      heroTextPlaceholder: "Your business name",
      headerImage: "Header image",
      headerImageHint: "Shown as a banner at the top of your public page, above the list to book.",
      headerImagePreviewAlt: "Header banner preview",
      noHeaderImage: "No header image yet",
      uploadingImage: "Uploading…",
      replaceImage: "Replace image",
      uploadImage: "Upload image",
      removeImage: "Remove",
      imageTypeError: "Use a JPG, PNG, or WEBP image.",
      imageSizeError: "Image must be 5 MB or smaller.",
      imageUploadError: "Upload failed. Check your connection and try again.",
    },
  },
  es: {
    common: {
      back: "Atrás",
      next: "Siguiente",
      confirm: "Confirmar",
      cancel: "Cancelar",
      loading: "Cargando…",
      saving: "Guardando...",
      saved: "Guardado.",
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
      holdEndingSoon: "Reserva por expirar",
      holdEndingBody: "Su reserva temporal está por vencer.",
      holdEndingCta: "Confirme ahora o el horario podría quedar disponible para otra persona.",
      holdLabel: "Reserva temporal",
      holdCancelled: "Reserva cancelada",
      holdSecured: "Reserva asegurada",
      holdExpired: "Reserva temporal vencida",
      holdInactiveBody: "Esta reserva ya no está activa.",
      holdConfirmedBody: "Su reserva está confirmada y la retención temporal ha finalizado.",
      holdFinishBody: "Complete sus datos antes de que expire la reserva temporal.",
      expired: "Vencida",
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
      progressLabel: "Progreso de la reserva",
      dateAndTime: "Fecha y horario",
      completedPrefix: "Completado: ",
      currentStepPrefix: "Paso actual: ",
      upcomingPrefix: "Próximo: ",
      bookingSummaryStatus: "Resumen de la reserva",
      statusCancelled: "Cancelada",
      statusUpdated: "Actualizada",
      statusConfirmed: "Confirmada",
    },
    admin: {
      upcoming7Days: "Próximos (7 días)",
      confirmed: "Confirmado",
      allTimeEveryStatus: "Todo el tiempo, todos los estados",
      capacityNotSet: "Capacidad no definida",
      totalNotSet: "Total no definido",
      allStatuses: "Todos los estados",
      rescheduled: "Reagendado",
      cancelled: "Cancelado",
      allTypes: "Todos los tipos",
      appointments: "Citas",
      tryBroaderSearch: "Intente una búsqueda más amplia o limpie los filtros.",
      monthlyCalendar: "Calendario mensual",
      newBookingPrefix: "Nueva reserva",
      providerInformation: "Información del proveedor",
      configuredByParentApp: "Configurado por la aplicación principal. Estos ajustes son visibles pero no editables.",
      weeklyAvailability: "Disponibilidad semanal",
      resetStandaloneSetup: "Restablecer configuración independiente",
      saveChanges: "Guardar cambios",
      couldNotSaveSettings: "No se pudieron guardar los ajustes.",
      languageLabel: "Idioma",
      languageHint: "Define el idioma que sus clientes ven en la página pública de reservas.",
      publicBookingLink: "Enlace público de reservas:",
      viewPublicPage: "Ver página pública",
      availabilityStart: "Inicio",
      availabilityEnd: "Fin",
      blockedTimes: "Horarios bloqueados",
      blockedTimesHint: "Oculte descansos u horarios no disponibles para reservas.",
      addBlock: "Agregar bloqueo",
      blockedFrom: "Desde",
      blockedTo: "Hasta",
      removeBlock: "Eliminar",
      weekdays: {
        sunday: "Domingo",
        monday: "Lunes",
        tuesday: "Martes",
        wednesday: "Miércoles",
        thursday: "Jueves",
        friday: "Viernes",
        saturday: "Sábado",
      },
      tabDashboard: "Panel",
      tabCalendar: "Calendario",
      tabSettings: "Ajustes",
      backToWorkspace: "← Volver al espacio de trabajo",
      signOut: "Cerrar sesión",
      serviceReadOnly: "Configurado por la aplicación principal. La edición de servicios es de solo lectura en este modo.",
      editButton: "Editar",
      deleteButton: "Eliminar",
      clearButton: "Limpiar",
      occurrenceLabel: "Frecuencia",
      occurrenceSingle: "Único",
      occurrenceWeekly: "Semanal",
      occurrencePeriodic: "Periódico",
      singleOccurrenceHint: "Este evento ocurre una vez, en una fecha y hora fija.",
      weeklyOccurrenceHint: "Este evento se repite los días que elija, a una hora fija.",
      periodicOccurrenceHint: "Este evento se repite según su disponibilidad semanal.",
      bookingTypeLabel: "Tipo de reserva",
      startLabel: "Inicio",
      endLabel: "Fin",
      repeatsOn: "Se repite los",
      durationLabel: "Duración",
      medicalSpecialtyLabel: "Especialidad médica",
      descriptionLabel: "Descripción",
      capacityLabel: "Capacidad",
      maxSpotsLabel: "Lugares máximos",
      notesLabel: "Notas",
      totalLabel: "Total",
      locationSection: "Ubicación",
      phoneSection: "Teléfono",
      address1Label: "Dirección 1",
      address2Label: "Dirección 2",
      addAnotherAddress: "Agregar otra dirección",
      addAnAddress: "Agregar una dirección",
      phone1Label: "Teléfono 1",
      phone2Label: "Teléfono 2",
      addAnotherPhone: "Agregar otro teléfono",
      addAPhone: "Agregar un teléfono",
      priceAtLocation: "Precio en esta ubicación",
      addressHintSlot1: "Lo guardaremos como Dirección 1 en su perfil para que otros servicios puedan reutilizarla.",
      addressHintSlot2: "Lo guardaremos como Dirección 2 en su perfil para que otros servicios puedan reutilizarla.",
      addressHintFull: "Ambos campos de dirección ya están ocupados — esta dirección solo se guardará con este servicio.",
      phoneHintSlot1: "Lo guardaremos como Teléfono 1 en su perfil para que otros servicios puedan reutilizarlo.",
      phoneHintSlot2: "Lo guardaremos como Teléfono 2 en su perfil para que otros servicios puedan reutilizarlo.",
      phoneHintFull: "Ambos campos de teléfono ya están ocupados — este teléfono solo se guardará con este servicio.",
      notesPlaceholder: "Traiga sus estudios previos o llegue 10 minutos antes.",
    },
    setup: {
      eyebrow: "Configuración",
      wizardBody: "Agregue sus datos y horarios semanales, y luego publique.",
      stepLabel: "Paso",
      stepProvider: "Mis Datos",
      stepAvailability: "Disponibilidad",
      stepDone: "Listo",
      statusReady: "Listo",
      statusCurrent: "Actual",
      statusNext: "Siguiente",
      step1Title: "Mis datos",
      step2Title: "Configure el horario de disponibilidad semanal",
      bookingLength: "Duración de la reserva",
      bookingLengthHint: "Elija cuánto debe durar cada reserva. Puede ajustar los servicios individuales más tarde desde la pestaña de Servicios.",
      lengthLabel: "Duración",
      fullDayOption: "Día completo",
      doneEyebrow: "Todo listo",
      doneBody: "Publique ahora y gestione todo desde su espacio de trabajo.",
      editServicesPrefix: "Edite estos servicios en cualquier momento desde la pestaña de",
      editServicesSuffix: ".",
      goToDashboard: "Ir al panel",
      openPublicPage: "Abrir página de reservas",
      continueButton: "Continuar",
      providerRequiredFieldsError: "El nombre del proveedor, el nombre del negocio y el correo electrónico son obligatorios.",
    },
    healthcareRole: {
      dataTitle: "Datos del Médico",
      informationTitle: "Información del Médico",
      contactLabel: "Contactar al médico",
      requiredFieldsError: "El nombre del médico, el nombre del negocio y el correo electrónico son obligatorios.",
      addressHintSlot1: "Lo guardaremos como Dirección 1 en el perfil del médico para que otros servicios puedan reutilizarla.",
      addressHintSlot2: "Lo guardaremos como Dirección 2 en el perfil del médico para que otros servicios puedan reutilizarla.",
      addressHintFull: "Ambos campos de dirección del médico ya están ocupados — esta dirección solo se guardará con este servicio.",
      phoneHintSlot1: "Lo guardaremos como Teléfono 1 en el perfil del médico para que otros servicios puedan reutilizarlo.",
      phoneHintSlot2: "Lo guardaremos como Teléfono 2 en el perfil del médico para que otros servicios puedan reutilizarlo.",
      phoneHintFull: "Ambos campos de teléfono del médico ya están ocupados — este teléfono solo se guardará con este servicio.",
    },
    welcome: {
      badge: "Bienvenido a Haab",
      title: "¿Qué tipo de negocio estamos configurando hoy?",
      body: "Elija su industria y preconfiguraremos sus servicios, horarios semanales y una página de reservas. Puede editar todo en menos de un minuto.",
      featureCustomizable: "Totalmente personalizable después",
      featureNoCard: "Sin tarjeta de crédito",
      featureReady: "Listo para compartir en minutos",
    },
    providerForm: {
      fullName: "Nombre completo",
      businessName: "Nombre del negocio",
      confirmationEmail: "Correo de confirmación",
      phoneNumber1: "Número de teléfono 1",
      phoneNumber2: "Número de teléfono 2",
      address1: "Dirección 1",
      address2: "Dirección 2",
      fullNamePlaceholder: "Dra. Maya Álvarez",
      businessNamePlaceholder: "Centro de Salud Haab",
      emailPlaceholder: "citas@haabcalendar.com",
      phone1Placeholder: "+52 55 1234 5678",
      phone2Placeholder: "Número secundario opcional",
      address1Placeholder: "Av. Principal 123, consultorio 4",
      address2Placeholder: "Ubicación secundaria opcional",
      heroText: "Texto del encabezado",
      heroTextHint: "Se muestra sobre la imagen de encabezado. Predeterminado: nombre del negocio.",
      heroTextPlaceholder: "Nombre de su negocio",
      headerImage: "Imagen de encabezado",
      headerImageHint: "Se muestra como banner en la parte superior de su página pública, antes de la lista de reservas.",
      headerImagePreviewAlt: "Vista previa del banner de encabezado",
      noHeaderImage: "Aún no hay imagen de encabezado",
      uploadingImage: "Subiendo…",
      replaceImage: "Reemplazar imagen",
      uploadImage: "Subir imagen",
      removeImage: "Eliminar",
      imageTypeError: "Use una imagen JPG, PNG o WEBP.",
      imageSizeError: "La imagen debe pesar 5 MB o menos.",
      imageUploadError: "No se pudo subir la imagen. Revise su conexión e inténtelo de nuevo.",
    },
  },
};

export function bookingT(lang: Lang = "en"): BookingDict {
  return bookingTranslations[lang] ?? bookingTranslations.en;
}
