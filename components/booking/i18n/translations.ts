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
  language: {
    chooseLanguage: string;
    english: string;
    spanish: string;
    switchToEnglish: string;
    switchToSpanish: string;
  };
  errors: {
    qrGenerationFailed: string;
    selectionUnavailable: string;
    selectTimeFirst: string;
    holdFailed: string;
    confirmFailed: string;
    rescheduleSlotUnavailable: string;
    rescheduleDateUnavailable: string;
    rescheduleFailed: string;
    cancelFailed: string;
  };
  notFound: {
    eyebrow: string;
    title: string;
    body: string;
    goHome: string;
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
    stillInterestedTitle: string;
    stillInterestedBody: string;
    addFiveMinutes: string;
    extendingHold: string;
    holdExtended: string;
    extensionUsed: string;
    offlineTitle: string;
    offlineBody: string;
    backOnline: string;
    expiredBody: string;
    chooseAnotherTime: string;
    onlineRequired: string;
    holdExpired: string;
    holdInactiveBody: string;
    holdFinishBody: string;
    holdCancelledFor: string;
    holdSecuredFor: string;
    holdLabelFor: string;
    holdCountdownLabel: string;
    holdConfirmedFor: string;
    expired: string;
    // Soft-hold explanation + expiry recovery
    holdMeaningTitle: string;
    holdMeaningBody: string;
    holdMeaningTooltipLabel: string;
    holdChangeTime: string;
    holdDetailsSafe: string;
    holdExpiredTitle: string;
    holdExpiredRecoveryBody: string;
    holdAgain: string;
    holdingAgain: string;
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
    // Private management page
    yourBookingTitle: string;
    privateLinkTrust: string;
    statusConfirmedBody: string;
    statusRescheduledBody: string;
    statusCancelledBody: string;
    manageActionsTitle: string;
    rescheduleOneTap: string;
    cancelBooking: string;
    reschedulingTitle: string;
    reschedulingBody: string;
    keepCurrentTime: string;
    currentlyBooked: string;
    noteTitle: string;
    noteBody: string;
    notePlaceholder: string;
    saveNote: string;
    savingNote: string;
    noteSaved: string;
    noteFailed: string;
    noteOnRecord: string;
    editNote: string;
  };
  publicFlow: {
    // Calendar
    previous: string;
    today: string;
    next: string;
    onlyRealFreeDatesActive: string;
    noDateSelectedYet: string;
    selected: string;
    // Day availability, announced to screen readers since the calendar codes it
    // by colour alone.
    availabilityOpen: string;
    availabilityTight: string;
    availabilityFull: string;
    availabilityClosed: string;
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
    // Returned-to-time-selection notices
    holdExpiredNoticeTitle: string;
    holdExpiredNoticeBody: string;
    conflictNoticeTitle: string;
    conflictNoticeBody: string;
    holdingSlot: string;
    tapTimeHint: string;
    // Section titles & misc actions
    bookingCancelled: string;
    bookingConfirmed: string;
    bookingUpdated: string;
    selectedDate: string;
    finishBeforeHoldExpires: string;
    confirm: string;
    pickDateAndTime: string;
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
    heldBySomeoneElse: string;
    freesAt: string;
    open: string;
    dayFreeFullDay: string;
    dayUnavailableChooseAnother: string;
    // Review summary
    notSelected: string;
    notEnteredYet: string;
    none: string;
    changeDateTime: string;
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
    openPrivateLink: string;
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
    providerLogoAlt: string;
    headerBannerAlt: string;
    managementUrlLabel: string;
    // Public header live slot
    headerTimesShownIn: string;
    headerHoldingSpot: string;
    // Boarding-pass confirmation
    passEyebrow: string;
    passDate: string;
    passTime: string;
    passContact: string;
    /**
     * Field labels that name a vertical noun. English puts the noun first
     * ("Registration notes"), Spanish puts it last ("Notas de registro") — so
     * they are templates, not `${noun} ${label.toLowerCase()}` at the call
     * site, which rendered "Registro notas" on the confirmation screen.
     *
     * The Spanish forms use the bare "de" rather than "del"/"de la" on
     * purpose: the nouns are mixed gender (`reserva` F, `cita` F, `registro`
     * M, `sesión` F) and a contraction would agree with only some of them.
     */
    passBookingNotes: string;
    passClientNotes: string;
    passClientContact: string;
    receiptReference: string;
    receiptIssued: string;
    downloadIcs: string;
    scanToAdd: string;
    saveThisLinkTitle: string;
    saveThisLinkTagline: string;
    // Coming back to time selection with a part-filled form
    detailsKeptNoticeTitle: string;
    detailsKeptNoticeBody: string;
  };
  admin: {
    // Dashboard
    heroTitle: string;
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
    scanAppointment: string;
    // Calendar
    monthlyCalendar: string;
    newBookingPrefix: string;
    // Settings
    providerInformation: string;
    appearanceTitle: string;
    appearanceBody: string;
    integrationsTitle: string;
    integrationsBody: string;
    googleCalendarName: string;
    googleCalendarDescription: string;
    integrationAvailable: string;
    integrationNotConnected: string;
    integrationPremiumRequired: string;
    integrationUnavailable: string;
    integrationPublishRequired: string;
    integrationReadOnly: string;
    comingSoon: string;
    googleConnect: string;
    googleDisconnect: string;
    googleConnected: string;
    googleChooseCalendar: string;
    googleChooseCalendarHelp: string;
    googleSaveCalendar: string;
    googleNeedsReauth: string;
    googleConnectionFailed: string;
    googleWritesTo: string;
    googleBusyTitle: string;
    googleBusyBody: string;
    googleBusyEnable: string;
    googleBusyChoose: string;
    googleBusyChooseHelp: string;
    googleBusyLimit: string;
    googleBusyNoCalendars: string;
    googleBusySourceFailed: string;
    googleTwoWayTitle: string;
    googleTwoWayBody: string;
    googleTwoWayEnable: string;
    googleTwoWayDeletion: string;
    googleTwoWayDeletionHelp: string;
    googleConflictsTitle: string;
    googleConflictsBody: string;
    googleConflictsNone: string;
    googleConflictRepairing: string;
    googleSaveFailed: string;
    googleConflictDuration: string;
    googleConflictOccupied: string;
    googleConflictDeletion: string;
    googleConflictOther: string;
    configuredByParentApp: string;
    weeklyAvailability: string;
    eventSchedulingTitle: string;
    eventSchedulingBody: string;
    eventSchedulingHint: string;
    manageEvents: string;
    resetStandaloneSetup: string;
    saveChanges: string;
    couldNotSaveSettings: string;
    clientLanguageLabel: string;
    clientLanguageHint: string;
    clientsSeeNotice: string;
    dashboardLanguageLabel: string;
    publicBookingLinkFor: string;
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
    tabAppearance: string;
    backToWorkspace: string;
    signOut: string;
    // ServiceEditor
    serviceReadOnly: string;
    editButton: string;
    deleteButton: string;
    /**
     * Service-editor labels that name a vertical noun. Composed inline in
     * English before, which meant a Spanish dashboard read "Keep at least
     * one servicio." Spanish word order differs, so they are templates.
     *
     * The Spanish forms take a masculine article ("un", "del") because every
     * Spanish `service` noun is masculine — servicio, servicio médico, evento,
     * espacio. A new vertical with a feminine one has to reword these, the same
     * bar the booking nouns already set in `public.hold*For`.
     */
    keepOneService: string;
    serviceNameLabel: string;
    clearButton: string;
    occurrenceLabel: string;
    occurrenceSingle: string;
    occurrenceWeekly: string;
    occurrencePeriodic: string;
    singleOccurrenceHint: string;
    weeklyOccurrenceHint: string;
    periodicOccurrenceHint: string;
    legacyPeriodicEventHint: string;
    bookingTypeLabel: string;
    startLabel: string;
    endLabel: string;
    repeatsOn: string;
    durationLabel: string;
    medicalSpecialtyLabel: string;
    descriptionLabel: string;
    capacityLabel: string;
    maxSpotsLabel: string;
    tablesPerSeatingLabel: string;
    maxPartySizeLabel: string;
    partySizeLabel: string;
    publicThemeLabel: string;
    publicThemeHelper: string;
    publicThemeNames: Record<"default" | "pink" | "summer" | "miami", string>;
    partySizeRequiredError: string;
    partySizePlaceholder: string;
    guestsSuffix: string;
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
    sameAsBasePrice: string;
    serviceNamePlaceholder: string;
    medicalSpecialtyPlaceholder: string;
    capacityPlaceholder: string;
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
    stepServices: string;
    stepAvailability: string;
    stepDone: string;
    stepPreview: string;
    statusReady: string;
    statusCurrent: string;
    statusNext: string;
    step1Title: string;
    stepServicesTitle: string;
    stepServicesBody: string;
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
    previewPage: string;
    previewNotPublished: string;
    createAccountToPublish: string;
    savingAndPublishing: string;
    retryPublishing: string;
    missingGuestDraft: string;
    publicBookingPage: string;
    yourServices: string;
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
  eventOrganizerRole: {
    informationTitle: string;
    contactLabel: string;
    requiredFieldsError: string;
    addressHintSlot1: string;
    addressHintSlot2: string;
    addressHintFull: string;
    phoneHintSlot1: string;
    phoneHintSlot2: string;
    phoneHintFull: string;
    logoAlt: string;
    bookingPageUnavailableBody: string;
  };
  welcome: {
    badge: string;
    title: string;
    body: string;
    featureCustomizable: string;
    featureNoCard: string;
    featureReady: string;
    getStarted: string;
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
    timeZone: string;
    timeZoneUnset: string;
    timeZoneHint: string;
    timeZoneDetect: string;
    timeZoneCurrentTime: string;
    timeZonePromptTitle: string;
    timeZonePromptBody: string;
    timeZonePromptAccept: string;
    timeZonePromptDismiss: string;
    headerImage: string;
    headerImageHint: string;
    headerImagePreviewAlt: string;
    noHeaderImage: string;
    logoImage: string;
    logoImageHint: string;
    logoImagePreviewAlt: string;
    noLogoImage: string;
    logoImageSizeError: string;
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
    language: {
      chooseLanguage: "Choose language",
      english: "English",
      spanish: "Español",
      switchToEnglish: "Switch to English",
      switchToSpanish: "Cambiar a español",
    },
    errors: {
      qrGenerationFailed: "We couldn't generate the calendar QR code. Please try again.",
      selectionUnavailable:
        "That selection is no longer available. Go back and choose another date or time.",
      selectTimeFirst: "Choose a time before continuing.",
      holdFailed: "We couldn't protect that selection. Please choose it again.",
      confirmFailed: "We couldn't confirm your booking. Please try again.",
      rescheduleSlotUnavailable: "That time is no longer available. Choose another time.",
      rescheduleDateUnavailable: "That date is no longer available. Choose another day.",
      rescheduleFailed: "We couldn't reschedule your booking. Please try again.",
      cancelFailed: "We couldn't cancel your booking. Please try again.",
    },
    notFound: {
      eyebrow: "404 · Page not found",
      title: "This booking page doesn't exist",
      body: "The link may be incorrect, or this booking page is not available right now.",
      goHome: "Go to Haab Calendar",
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
      stillInterestedTitle: "Still interested?",
      stillInterestedBody: "Need a little longer on this page? Keep the slot for five more minutes.",
      addFiveMinutes: "Add 5 minutes",
      extendingHold: "Adding time…",
      holdExtended: "Five minutes were added to your hold.",
      extensionUsed: "The one-time five-minute extension has already been used.",
      offlineTitle: "You’re offline",
      offlineBody: "The timer keeps running. Reconnect before it expires to extend or confirm.",
      backOnline: "Connection restored. Your hold was checked.",
      expiredBody: "Your hold ran out and this time is open again. Take it back, or pick another.",
      chooseAnotherTime: "Choose another time",
      onlineRequired: "Reconnect to confirm",
      holdExpired: "Hold expired",
      holdInactiveBody: "This reservation is no longer active.",
      holdFinishBody: "This time is yours while you finish. Nobody else can take it.",
      holdCancelledFor: "{Booking} cancelled",
      holdSecuredFor: "{Booking} secured",
      holdLabelFor: "{Booking} hold",
      holdCountdownLabel: "{Booking} hold countdown",
      holdConfirmedFor: "Your {booking} is confirmed and the temporary hold is complete.",
      expired: "Expired",
      holdMeaningTitle: "This time is yours for the next 10 minutes",
      holdMeaningBody:
        "Nobody else can book it while the timer runs. Nothing is charged and nothing is final until you confirm.",
      holdMeaningTooltipLabel: "What this hold means",
      holdChangeTime: "Change",
      holdDetailsSafe: "Anything you have typed is kept.",
      holdExpiredTitle: "The hold ran out",
      holdExpiredRecoveryBody:
        "Your details are saved. Take this time again in one tap — or pick another if someone got there first.",
      holdAgain: "Hold this time again",
      holdingAgain: "Holding it again…",
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
      yourBookingTitle: "Your booking",
      privateLinkTrust:
        "You opened this page with your private link. No account, no password — keep the link and you can come back anytime.",
      statusConfirmedBody: "You are booked in. Nothing else to do before the day.",
      statusRescheduledBody: "Moved to a new time. This is the time that counts now.",
      statusCancelledBody: "This booking was cancelled. The time was released to other people.",
      manageActionsTitle: "Change this booking",
      rescheduleOneTap: "Pick a new time",
      cancelBooking: "Cancel booking",
      reschedulingTitle: "Choosing a new time",
      reschedulingBody:
        "Pick any highlighted day and time. Your current booking stays exactly as it is until the new time is saved.",
      keepCurrentTime: "Keep current time",
      currentlyBooked: "Booked now",
      noteTitle: "Note for the provider",
      noteBody: "Optional. Anything they should know before your visit — they see it with your booking.",
      notePlaceholder: "Running late, parking questions, anything else…",
      saveNote: "Save note",
      savingNote: "Saving…",
      noteSaved: "Note sent to the provider.",
      noteFailed: "Could not save that note. Try again.",
      noteOnRecord: "Your note",
      editNote: "Edit note",
    },
    publicFlow: {
      previous: "Previous",
      today: "Today",
      next: "Next",
      onlyRealFreeDatesActive: "Only real free dates are active.",
      noDateSelectedYet: "No date selected yet",
      selected: "Selected",
      availabilityOpen: "mostly available",
      availabilityTight: "limited availability",
      availabilityFull: "fully booked",
      availabilityClosed: "unavailable",
      dateNotSet: "Date not set",
      selectADay: "Choose a day",
      selectADate: "Choose a date",
      selectATime: "Choose a time",
      fullDay: "Full day",
      continueToMyDetails: "Continue to your details",
      reserveMySpot: "Reserve my spot",
      myDetails: "Your details",
      pickDateAndTimeHelper: "Pick a date from the calendar and time slot below to continue.",
      pickTimeHelper: "Pick a time slot to continue.",
      clickToEnterDetails: "Click the button to enter your details.",
      pickDateFullDayHelper: "Pick a date to reserve the full day.",
      dayFreeHelper: "This day is free. Click the button to enter your details.",
      dayUnavailablePickAnother: "This day isn't available. Pick another date.",
      holdExpiredNoticeTitle: "Your 10-minute hold ran out",
      holdExpiredNoticeBody: "The time was released. Pick another one — it's held again straight away.",
      conflictNoticeTitle: "Someone confirmed that time first",
      conflictNoticeBody: "Nothing was booked. Pick another time to continue.",
      holdingSlot: "Holding your time…",
      tapTimeHint: "Tap a time — it's held for 10 minutes.",
      bookingCancelled: "Booking Cancelled",
      bookingConfirmed: "Booking Confirmed",
      bookingUpdated: "Booking Updated",
      selectedDate: "Selected Date",
      finishBeforeHoldExpires: "Finish your details before the temporary hold expires.",
      confirm: "Confirm",
      pickDateAndTime: "Pick a date and time",
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
      heldBySomeoneElse: "Held",
      freesAt: "Frees at {time}",
      open: "Open",
      dayFreeFullDay: "This day is currently free for a full-day reservation.",
      dayUnavailableChooseAnother:
        "This day is unavailable. Choose another date from the calendar.",
      notSelected: "Not selected",
      notEnteredYet: "Not entered yet",
      none: "None",
      changeDateTime: "Change date/time",
      appointmentDetails: "Appointment details",
      customerDetails: "Customer details",
      addToCalendar: "Add to calendar",
      showQrCode: "Show appointment QR",
      reschedule: "Reschedule",
      bookAnother: "Book another",
      manageBookingAnytime: "Manage this booking anytime",
      copied: "Copied",
      copyLink: "Copy link",
      openPrivateLink: "Open private link",
      manageLinkCopied: "Manage link copied to clipboard",
      saveThisLinkBody:
        "Keep this private link. It lets you reschedule or cancel without an account or contacting the business. Anyone with the link can manage this booking.",
      progressLabel: "Booking progress",
      dateAndTime: "Date and time",
      completedPrefix: "Completed: ",
      currentStepPrefix: "Current step: ",
      upcomingPrefix: "Upcoming: ",
      bookingSummaryStatus: "Booking summary",
      statusCancelled: "Cancelled",
      statusUpdated: "Updated",
      statusConfirmed: "Confirmed",
      providerLogoAlt: "Provider logo",
      headerBannerAlt: "Booking page banner",
      managementUrlLabel: "Booking management link",
      headerTimesShownIn: "Times shown in",
      headerHoldingSpot: "Holding your spot…",
      passEyebrow: "Appointment Receipt",
      passDate: "Date",
      passTime: "Time",
      passContact: "Contact",
      passBookingNotes: "{Booking} notes",
      passClientNotes: "{Client} notes",
      passClientContact: "{Client} contact",
      receiptReference: "Reference",
      receiptIssued: "Issued",
      downloadIcs: "Download .ics file",
      scanToAdd: "Scan to open appointment details or present this code to the provider",
      saveThisLinkTitle: "Save this link",
      saveThisLinkTagline:
        "Save this link – you can reschedule or cancel anytime without an account",
      detailsKeptNoticeTitle: "Your details are saved",
      detailsKeptNoticeBody:
        "Pick a new time — everything you already typed is still filled in.",
    },
    admin: {
      heroTitle: "Haab Calendar — booking operations in one workspace",
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
      scanAppointment: "Scan appointment",
      monthlyCalendar: "Monthly calendar",
      newBookingPrefix: "New booking",
      providerInformation: "Provider information",
      appearanceTitle: "Public page appearance",
      appearanceBody: "How your booking page looks and which language it speaks.",
      integrationsTitle: "Integrations",
      integrationsBody: "Other tools Haab can work with.",
      googleCalendarName: "Google Calendar",
      googleCalendarDescription:
        "Once connected, Haab will keep your booking availability in step with your Google Calendar.",
      integrationAvailable: "Available",
      integrationNotConnected: "Not connected",
      integrationPremiumRequired: "Premium feature",
      integrationUnavailable: "Status unavailable",
      integrationPublishRequired: "Available once your page is published",
      integrationReadOnly: "Read-only while editing an example page",
      comingSoon: "Coming soon",
      googleConnect: "Connect Google Calendar",
      googleDisconnect: "Disconnect",
      googleConnected: "Connected",
      googleChooseCalendar: "Choose the calendar Haab writes to",
      googleChooseCalendarHelp:
        "Haab adds an event for each booking, and removes it when a booking is cancelled. It never reads your other events.",
      googleSaveCalendar: "Use this calendar",
      googleNeedsReauth: "Reconnect needed",
      googleConnectionFailed: "Could not reach Google Calendar.",
      googleWritesTo: "Writing bookings to",
      googleBusyTitle: "Block times from other calendars",
      googleBusyBody:
        "Haab reads only when you are busy from the calendars you choose — never what the events are. Those times stop appearing as available.",
      googleBusyEnable: "Use my other calendars to block times",
      googleBusyChoose: "Calendars to check",
      googleBusyChooseHelp:
        "The calendar Haab writes bookings to is not listed: its events are already your Haab bookings.",
      googleBusyLimit: "You can check up to 10 calendars.",
      googleBusyNoCalendars: "No other calendars were found on this account.",
      googleBusySourceFailed: "Haab could not read this calendar.",
      googleTwoWayTitle: "Let Google changes move bookings",
      googleTwoWayBody:
        "Moving an event in Google moves the booking in Haab. Changes Haab cannot accept — a different length, an occupied time — are listed below instead, and the event goes back where it was.",
      googleTwoWayEnable: "Apply changes made in Google",
      googleTwoWayDeletion: "Deleting the event cancels the booking",
      googleTwoWayDeletionHelp:
        "Off by default. Deleting an event is not the same as telling a client their appointment is cancelled.",
      googleConflictsTitle: "Changes Haab did not apply",
      googleConflictsBody:
        "Each of these was put back the way Haab has it. Make the change in Haab to keep it.",
      googleConflictsNone: "Nothing to review.",
      googleConflictRepairing: "Putting this back",
      googleSaveFailed: "Could not save those settings.",
      googleConflictDuration: "The length was changed",
      googleConflictOccupied: "That time was not free in Haab",
      googleConflictDeletion: "The event was deleted",
      googleConflictOther: "Haab could not apply this change",
      configuredByParentApp: "Configured by the parent app. These settings are visible but not editable.",
      weeklyAvailability: "Weekly availability",
      eventSchedulingTitle: "Event scheduling",
      eventSchedulingBody: "Weekly availability does not apply to events.",
      eventSchedulingHint:
        "Set each event's date, time, location, pricing, and capacity from the Services tab.",
      manageEvents: "Manage events",
      resetStandaloneSetup: "Reset standalone setup",
      saveChanges: "Save changes",
      couldNotSaveSettings: "Could not save settings.",
      clientLanguageLabel: "Language your clients see",
      clientLanguageHint:
        "Applies to your public booking page and the confirmation screen. It does not translate the text you write yourself.",
      clientsSeeNotice: "Your clients see this page in {language}.",
      dashboardLanguageLabel: "Your workspace language",
      publicBookingLinkFor: "Public {booking} link:",
      viewPublicPage: "View public page",
      availabilityStart: "Start",
      availabilityEnd: "End",
      blockedTimes: "Blocked times",
      blockedTimesHint:
        "Hide breaks or unavailable windows from booking. A day with a blocked time cannot take full-day bookings.",
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
      tabAppearance: "Appearance",
      backToWorkspace: "← Back to workspace",
      signOut: "Sign out",
      serviceReadOnly: "Configured by the parent app. Service editing is read-only in this mode.",
      editButton: "Edit",
      deleteButton: "Delete",
      keepOneService:
        "Keep at least one {service}. Add another before you can remove this one.",
      serviceNameLabel: "{Service} name",
      clearButton: "Clear",
      occurrenceLabel: "Occurrence",
      occurrenceSingle: "Single",
      occurrenceWeekly: "Weekly",
      occurrencePeriodic: "Periodic",
      singleOccurrenceHint: "This event happens once, on a fixed date and time.",
      weeklyOccurrenceHint: "This event recurs on the weekdays you pick, at a fixed time.",
      periodicOccurrenceHint: "This event repeats on your weekly availability.",
      legacyPeriodicEventHint:
        "This legacy event uses weekly availability. Choose Single or Weekly to update its schedule.",
      bookingTypeLabel: "Booking type",
      startLabel: "Start",
      endLabel: "End",
      repeatsOn: "Repeats on",
      durationLabel: "Duration",
      medicalSpecialtyLabel: "Medical specialty",
      descriptionLabel: "Description",
      capacityLabel: "Capacity",
      maxSpotsLabel: "Maximum spots",
      tablesPerSeatingLabel: "Tables per seating",
      maxPartySizeLabel: "Max party size",
      partySizeLabel: "Guests",
      publicThemeLabel: "Look of your booking page",
      publicThemeHelper:
        "Changes the colours your clients see. Your dashboard stays as it is.",
      publicThemeNames: {
        default: "Classic",
        pink: "Pink",
        summer: "Summer",
        miami: "Miami nights",
      },
      partySizeRequiredError: "Tell us how many guests are coming.",
      partySizePlaceholder: "2",
      guestsSuffix: "guests",
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
      sameAsBasePrice: "Same as base price",
      // Fallbacks for when no vertical is chosen yet, so no preset hints exist.
      serviceNamePlaceholder: "Court rental",
      medicalSpecialtyPlaceholder: "Family medicine",
      capacityPlaceholder: "Max 12 people",
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
      stepServices: "Services",
      stepAvailability: "Availability",
      stepDone: "Done",
      stepPreview: "Preview",
      statusReady: "Ready",
      statusCurrent: "Current",
      statusNext: "Next",
      step1Title: "My data",
      stepServicesTitle: "Review your services",
      stepServicesBody:
        "Edit the ready-made services or add your own before previewing the page.",
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
      previewPage: "Preview booking page",
      previewNotPublished: "Preview mode — this page is not published yet.",
      createAccountToPublish: "Create account to publish",
      savingAndPublishing: "Saving and publishing your page…",
      retryPublishing: "Retry publishing",
      missingGuestDraft:
        "We could not find the draft saved in this browser. Return home to start again.",
      publicBookingPage: "Public booking page",
      yourServices: "Your services",
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
    eventOrganizerRole: {
      informationTitle: "Organizer information",
      contactLabel: "Contact organizer",
      requiredFieldsError: "Organizer name, business name, and email are all required.",
      addressHintSlot1: "We'll save this as Address 1 in your organizer profile so other events can reuse it.",
      addressHintSlot2: "We'll save this as Address 2 in your organizer profile so other events can reuse it.",
      addressHintFull: "Both organizer address slots are already taken — this address will stay with this event only.",
      phoneHintSlot1: "We'll save this as Phone 1 in your organizer profile so other events can reuse it.",
      phoneHintSlot2: "We'll save this as Phone 2 in your organizer profile so other events can reuse it.",
      phoneHintFull: "Both organizer phone slots are already taken — this phone will stay with this event only.",
      logoAlt: "Organizer logo",
      bookingPageUnavailableBody:
        "The link may be incorrect, or this organizer's registration page is not available right now.",
    },
    welcome: {
      badge: "Welcome to Haab",
      title: "What kind of business are we setting up today?",
      body: "Pick your industry and we'll prefill your services, weekly hours, and a polished booking page. You can edit everything afterward in under a minute.",
      featureCustomizable: "Fully customizable later",
      featureNoCard: "No credit card required",
      featureReady: "Ready to share in minutes",
      getStarted: "Get started",
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
      timeZone: "Time zone",
      timeZoneUnset: "Choose your time zone",
      timeZoneHint:
        "Your opening hours and every booking time are read in this zone. Clients see the city on your public page.",
      timeZoneDetect: "Detect my time zone",
      timeZoneCurrentTime: "Right now it's {time} there.",
      timeZonePromptTitle: "Confirm your time zone \u2014 we detected {zone}",
      timeZonePromptBody:
        "Your page is still using UTC, so booking times may not match your real hours.",
      timeZonePromptAccept: "Use this time zone",
      timeZonePromptDismiss: "Not now",
      headerImage: "Header image",
      headerImageHint: "Shown as a banner at the top of your public page, above the list to book.",
      headerImagePreviewAlt: "Header banner preview",
      noHeaderImage: "No header image yet",
      logoImage: "Public page logo",
      logoImageHint: "Shown at the top left beside your public page title. JPG, PNG, or WEBP, up to 1 MB.",
      logoImagePreviewAlt: "Public page logo preview",
      noLogoImage: "No logo uploaded yet",
      logoImageSizeError: "Logo must be 1 MB or smaller.",
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
    language: {
      chooseLanguage: "Elegir idioma",
      english: "English",
      spanish: "Español",
      switchToEnglish: "Switch to English",
      switchToSpanish: "Cambiar a español",
    },
    errors: {
      qrGenerationFailed:
        "No pudimos generar el código QR del calendario. Inténtelo de nuevo.",
      selectionUnavailable:
        "Esa opción ya no está disponible. Regrese y elija otra fecha u horario.",
      selectTimeFirst: "Elija un horario antes de continuar.",
      holdFailed: "No pudimos proteger esa opción. Vuelva a seleccionarla.",
      confirmFailed: "No pudimos confirmar su reserva. Inténtelo de nuevo.",
      rescheduleSlotUnavailable:
        "Ese horario ya no está disponible. Elija otro horario.",
      rescheduleDateUnavailable:
        "Esa fecha ya no está disponible. Elija otro día.",
      rescheduleFailed: "No pudimos reagendar su reserva. Inténtelo de nuevo.",
      cancelFailed: "No pudimos cancelar su reserva. Inténtelo de nuevo.",
    },
    notFound: {
      eyebrow: "404 · Página no encontrada",
      title: "Esta página de reservas no existe",
      body: "El enlace puede ser incorrecto o la página de reservas no está disponible en este momento.",
      goHome: "Ir a Haab Calendar",
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
      stillInterestedTitle: "¿Aún le interesa?",
      stillInterestedBody: "¿Necesita un poco más de tiempo? Mantenga el horario durante cinco minutos más.",
      addFiveMinutes: "Agregar 5 minutos",
      extendingHold: "Agregando tiempo…",
      holdExtended: "Agregamos cinco minutos a su reserva temporal.",
      extensionUsed: "Ya utilizó la extensión única de cinco minutos.",
      offlineTitle: "Está sin conexión",
      offlineBody: "El tiempo sigue corriendo. Reconéctese antes de que venza para extender o confirmar.",
      backOnline: "Se restableció la conexión y verificamos su reserva temporal.",
      expiredBody: "Su apartado terminó y este horario volvió a quedar libre. Tómelo de nuevo o elija otro.",
      chooseAnotherTime: "Elegir otro horario",
      onlineRequired: "Reconéctese para confirmar",
      holdExpired: "Reserva temporal vencida",
      holdInactiveBody: "Esta reserva ya no está activa.",
      holdFinishBody: "Este horario es suyo mientras termina. Nadie más puede tomarlo.",
      holdCancelledFor: "Se canceló su {booking}",
      holdSecuredFor: "Se confirmó su {booking}",
      holdLabelFor: "Apartado de {booking}",
      holdCountdownLabel: "Cuenta regresiva del apartado de {booking}",
      holdConfirmedFor: "Se confirmó su {booking} y el apartado temporal terminó.",
      expired: "Vencida",
      holdMeaningTitle: "Este horario es suyo durante los próximos 10 minutos",
      holdMeaningBody:
        "Nadie más puede reservarlo mientras corre el tiempo. No se cobra nada y nada queda en firme hasta que usted confirme.",
      holdMeaningTooltipLabel: "Qu\u00e9 significa esta reserva temporal",
      holdChangeTime: "Cambiar",
      holdDetailsSafe: "Lo que ya escribió se conserva.",
      holdExpiredTitle: "Se agotó la reserva temporal",
      holdExpiredRecoveryBody:
        "Sus datos están guardados. Vuelva a apartar este horario con un toque, o elija otro si alguien se adelantó.",
      holdAgain: "Apartar este horario otra vez",
      holdingAgain: "Apartándolo de nuevo…",
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
      yourBookingTitle: "Su reserva",
      privateLinkTrust:
        "Abrió esta página con su enlace privado. Sin cuenta ni contraseña: guarde el enlace y podrá volver cuando quiera.",
      statusConfirmedBody: "Su lugar está reservado. No hay nada más que hacer antes del día.",
      statusRescheduledBody: "Se movió a un nuevo horario. Este es el horario que vale ahora.",
      statusCancelledBody: "Esta reserva fue cancelada. El horario quedó libre para otras personas.",
      manageActionsTitle: "Modificar esta reserva",
      rescheduleOneTap: "Elegir un nuevo horario",
      cancelBooking: "Cancelar la reserva",
      reschedulingTitle: "Eligiendo un nuevo horario",
      reschedulingBody:
        "Elija cualquier día y horario resaltado. Su reserva actual se mantiene tal cual hasta que se guarde el nuevo horario.",
      keepCurrentTime: "Conservar el horario actual",
      currentlyBooked: "Reservado ahora",
      noteTitle: "Nota para el proveedor",
      noteBody: "Opcional. Algo que deba saber antes de su visita: lo verá junto a su reserva.",
      notePlaceholder: "Llegaré tarde, dudas de estacionamiento, lo que sea…",
      saveNote: "Guardar nota",
      savingNote: "Guardando…",
      noteSaved: "Nota enviada al proveedor.",
      noteFailed: "No se pudo guardar esa nota. Inténtelo de nuevo.",
      noteOnRecord: "Su nota",
      editNote: "Editar nota",
    },
    publicFlow: {
      previous: "Anterior",
      today: "Hoy",
      next: "Siguiente",
      onlyRealFreeDatesActive: "Solo las fechas realmente libres están activas.",
      noDateSelectedYet: "Aún no ha seleccionado una fecha",
      selected: "Seleccionado",
      availabilityOpen: "buena disponibilidad",
      availabilityTight: "disponibilidad limitada",
      availabilityFull: "sin cupos",
      availabilityClosed: "no disponible",
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
      holdExpiredNoticeTitle: "Su apartado de 10 minutos venció",
      holdExpiredNoticeBody: "El horario se liberó. Elija otro: se aparta de nuevo al instante.",
      conflictNoticeTitle: "Alguien confirmó ese horario primero",
      conflictNoticeBody: "No se reservó nada. Elija otro horario para continuar.",
      holdingSlot: "Apartando su horario…",
      tapTimeHint: "Toque un horario: se aparta por 10 minutos.",
      bookingCancelled: "Reserva cancelada",
      bookingConfirmed: "Reserva confirmada",
      bookingUpdated: "Reserva actualizada",
      selectedDate: "Fecha seleccionada",
      finishBeforeHoldExpires:
        "Complete sus datos antes de que expire la reservación temporal.",
      confirm: "Confirmar",
      pickDateAndTime: "Elija una fecha y un horario",
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
      heldBySomeoneElse: "Apartado",
      freesAt: "Se libera a las {time}",
      open: "Disponible",
      dayFreeFullDay: "Este día está libre para una reservación de día completo.",
      dayUnavailableChooseAnother:
        "Este día no está disponible. Elija otra fecha en el calendario.",
      notSelected: "No seleccionado",
      notEnteredYet: "Aún no ingresado",
      none: "Ninguna",
      changeDateTime: "Cambiar fecha/horario",
      appointmentDetails: "Detalles de la cita",
      customerDetails: "Datos del cliente",
      addToCalendar: "Agregar al calendario",
      showQrCode: "Mostrar QR de la cita",
      reschedule: "Reagendar",
      bookAnother: "Reserve otra",
      manageBookingAnytime: "Gestione esta reserva en cualquier momento",
      copied: "Copiado",
      copyLink: "Copiar enlace",
      openPrivateLink: "Abrir enlace privado",
      manageLinkCopied: "Enlace de gestión copiado al portapapeles",
      saveThisLinkBody:
        "Guarde este enlace privado. Le permite reagendar o cancelar sin crear una cuenta ni contactar al negocio. Cualquier persona con el enlace puede gestionar esta reserva.",
      progressLabel: "Progreso de la reserva",
      dateAndTime: "Fecha y horario",
      completedPrefix: "Completado: ",
      currentStepPrefix: "Paso actual: ",
      upcomingPrefix: "Próximo: ",
      bookingSummaryStatus: "Resumen de la reserva",
      statusCancelled: "Cancelada",
      statusUpdated: "Actualizada",
      statusConfirmed: "Confirmada",
      providerLogoAlt: "Logotipo del proveedor",
      headerBannerAlt: "Banner de la página de reservas",
      managementUrlLabel: "Enlace para gestionar la reserva",
      headerTimesShownIn: "Horarios en",
      headerHoldingSpot: "Apartando tu lugar…",
      passEyebrow: "Confirmación de cita",
      passDate: "Fecha",
      passTime: "Horario",
      passContact: "Contacto",
      passBookingNotes: "Notas de {booking}",
      passClientNotes: "Notas de {client}",
      passClientContact: "Contacto de {client}",
      receiptReference: "Referencia",
      receiptIssued: "Emitido",
      downloadIcs: "Descargar archivo .ics",
      scanToAdd: "Escanee para abrir los detalles o presente este código al proveedor",
      saveThisLinkTitle: "Guarde este enlace",
      saveThisLinkTagline:
        "Guarde este enlace: puede reagendar o cancelar cuando quiera, sin crear una cuenta",
      detailsKeptNoticeTitle: "Sus datos están guardados",
      detailsKeptNoticeBody:
        "Elija un nuevo horario: todo lo que ya escribió sigue completo.",
    },
    admin: {
      heroTitle: "Haab Calendar — sus reservas en un solo lugar",
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
      scanAppointment: "Escanear cita",
      monthlyCalendar: "Calendario mensual",
      newBookingPrefix: "Nueva reserva",
      providerInformation: "Información del proveedor",
      appearanceTitle: "Apariencia de su página pública",
      appearanceBody: "Cómo se ve su página de reservas y en qué idioma habla.",
      integrationsTitle: "Integraciones",
      integrationsBody: "Otras herramientas con las que Haab puede trabajar.",
      googleCalendarName: "Google Calendar",
      googleCalendarDescription:
        "Una vez conectado, Haab mantendrá su disponibilidad de reservas al día con su Google Calendar.",
      integrationAvailable: "Disponible",
      integrationNotConnected: "Sin conectar",
      integrationPremiumRequired: "Función premium",
      integrationUnavailable: "Estado no disponible",
      integrationPublishRequired: "Disponible cuando publique su página",
      integrationReadOnly: "Solo lectura mientras edita una página de ejemplo",
      comingSoon: "Próximamente",
      googleConnect: "Conectar Google Calendar",
      googleDisconnect: "Desconectar",
      googleConnected: "Conectado",
      googleChooseCalendar: "Elija el calendario en el que Haab escribirá",
      googleChooseCalendarHelp:
        "Haab agrega un evento por cada reserva y lo elimina cuando se cancela. Nunca lee sus otros eventos.",
      googleSaveCalendar: "Usar este calendario",
      googleNeedsReauth: "Necesita reconectarse",
      googleConnectionFailed: "No se pudo conectar con Google Calendar.",
      googleWritesTo: "Escribiendo reservas en",
      googleBusyTitle: "Bloquear horarios desde otros calendarios",
      googleBusyBody:
        "Haab lee únicamente cuándo estás ocupado en los calendarios que elijas, nunca de qué se tratan los eventos. Esos horarios dejan de aparecer como disponibles.",
      googleBusyEnable: "Usar mis otros calendarios para bloquear horarios",
      googleBusyChoose: "Calendarios por revisar",
      googleBusyChooseHelp:
        "El calendario donde Haab escribe las reservas no aparece en la lista: sus eventos ya son tus reservas de Haab.",
      googleBusyLimit: "Puedes revisar hasta 10 calendarios.",
      googleBusyNoCalendars: "No se encontraron otros calendarios en esta cuenta.",
      googleBusySourceFailed: "Haab no pudo leer este calendario.",
      googleTwoWayTitle: "Permitir que los cambios de Google muevan reservas",
      googleTwoWayBody:
        "Mover un evento en Google mueve la reserva en Haab. Los cambios que Haab no puede aceptar (otra duración, un horario ocupado) aparecen abajo y el evento vuelve a su lugar.",
      googleTwoWayEnable: "Aplicar los cambios hechos en Google",
      googleTwoWayDeletion: "Eliminar el evento cancela la reserva",
      googleTwoWayDeletionHelp:
        "Desactivado de forma predeterminada. Eliminar un evento no es lo mismo que avisarle a un cliente que su cita se canceló.",
      googleConflictsTitle: "Cambios que Haab no aplicó",
      googleConflictsBody:
        "Cada uno volvió a como está en Haab. Haz el cambio en Haab para conservarlo.",
      googleConflictsNone: "Nada por revisar.",
      googleConflictRepairing: "Restaurando",
      googleSaveFailed: "No se pudieron guardar esos ajustes.",
      googleConflictDuration: "Se cambió la duración",
      googleConflictOccupied: "Ese horario no estaba libre en Haab",
      googleConflictDeletion: "Se eliminó el evento",
      googleConflictOther: "Haab no pudo aplicar este cambio",
      configuredByParentApp: "Configurado por la aplicación principal. Estos ajustes son visibles pero no editables.",
      weeklyAvailability: "Disponibilidad semanal",
      eventSchedulingTitle: "Programación de eventos",
      eventSchedulingBody: "La disponibilidad semanal no aplica a los eventos.",
      eventSchedulingHint:
        "Configure la fecha, hora, ubicación, precio y capacidad de cada evento en la pestaña Servicios.",
      manageEvents: "Gestionar eventos",
      resetStandaloneSetup: "Restablecer configuración independiente",
      saveChanges: "Guardar cambios",
      couldNotSaveSettings: "No se pudieron guardar los ajustes.",
      clientLanguageLabel: "Idioma que ven sus clientes",
      clientLanguageHint:
        "Se aplica a su página pública de reservas y a la pantalla de confirmación. No traduce el texto que usted escribe.",
      clientsSeeNotice: "Sus clientes ven esta página en {language}.",
      dashboardLanguageLabel: "Idioma de su espacio de trabajo",
      publicBookingLinkFor: "Enlace público de {booking}:",
      viewPublicPage: "Ver página pública",
      availabilityStart: "Inicio",
      availabilityEnd: "Fin",
      blockedTimes: "Horarios bloqueados",
      blockedTimesHint:
        "Oculte descansos u horarios no disponibles para reservas. Un día con horario bloqueado no acepta reservas de día completo.",
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
      tabAppearance: "Apariencia",
      backToWorkspace: "← Volver al espacio de trabajo",
      signOut: "Cerrar sesión",
      serviceReadOnly: "Configurado por la aplicación principal. La edición de servicios es de solo lectura en este modo.",
      editButton: "Editar",
      deleteButton: "Eliminar",
      keepOneService:
        "Conserve al menos un {service}. Agregue otro antes de quitar este.",
      serviceNameLabel: "Nombre del {service}",
      clearButton: "Limpiar",
      occurrenceLabel: "Frecuencia",
      occurrenceSingle: "Único",
      occurrenceWeekly: "Semanal",
      occurrencePeriodic: "Periódico",
      singleOccurrenceHint: "Este evento ocurre una vez, en una fecha y hora fija.",
      weeklyOccurrenceHint: "Este evento se repite los días que elija, a una hora fija.",
      periodicOccurrenceHint: "Este evento se repite según su disponibilidad semanal.",
      legacyPeriodicEventHint:
        "Este evento heredado usa la disponibilidad semanal. Elija Único o Semanal para actualizar su programación.",
      bookingTypeLabel: "Tipo de reserva",
      startLabel: "Inicio",
      endLabel: "Fin",
      repeatsOn: "Se repite los",
      durationLabel: "Duración",
      medicalSpecialtyLabel: "Especialidad médica",
      descriptionLabel: "Descripción",
      capacityLabel: "Capacidad",
      maxSpotsLabel: "Lugares máximos",
      tablesPerSeatingLabel: "Mesas por turno",
      maxPartySizeLabel: "Grupo máximo",
      partySizeLabel: "Comensales",
      publicThemeLabel: "Estilo de tu página de reservas",
      publicThemeHelper:
        "Cambia los colores que ven tus clientes. Tu panel se queda igual.",
      publicThemeNames: {
        default: "Clásico",
        pink: "Rosa",
        summer: "Verano",
        miami: "Noches de Miami",
      },
      partySizeRequiredError: "Indique cuántos comensales asistirán.",
      partySizePlaceholder: "2",
      guestsSuffix: "comensales",
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
      sameAsBasePrice: "Igual que el precio base",
      // Respaldos para cuando aún no se elige un giro y no hay sugerencias.
      serviceNamePlaceholder: "Renta de cancha",
      medicalSpecialtyPlaceholder: "Medicina familiar",
      capacityPlaceholder: "Máx. 12 personas",
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
      stepServices: "Servicios",
      stepAvailability: "Disponibilidad",
      stepDone: "Listo",
      stepPreview: "Vista previa",
      statusReady: "Listo",
      statusCurrent: "Actual",
      statusNext: "Siguiente",
      step1Title: "Mis datos",
      stepServicesTitle: "Revise sus servicios",
      stepServicesBody:
        "Edite los servicios preparados o agregue los suyos antes de ver la página.",
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
      previewPage: "Ver página de reservas",
      previewNotPublished: "Modo de vista previa — esta página aún no está publicada.",
      createAccountToPublish: "Publicar creando una cuenta",
      savingAndPublishing: "Guardando y publicando su página…",
      retryPublishing: "Reintentar publicación",
      missingGuestDraft:
        "No encontramos el borrador guardado en este navegador. Vuelva al inicio para comenzar de nuevo.",
      publicBookingPage: "Página pública de reservas",
      yourServices: "Tus servicios",
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
    eventOrganizerRole: {
      informationTitle: "Información del organizador",
      contactLabel: "Contactar al organizador",
      requiredFieldsError: "El nombre del organizador, el nombre del negocio y el correo electrónico son obligatorios.",
      addressHintSlot1: "Lo guardaremos como Dirección 1 en el perfil del organizador para que otros eventos puedan reutilizarla.",
      addressHintSlot2: "Lo guardaremos como Dirección 2 en el perfil del organizador para que otros eventos puedan reutilizarla.",
      addressHintFull: "Ambos campos de dirección del organizador ya están ocupados — esta dirección solo se guardará con este evento.",
      phoneHintSlot1: "Lo guardaremos como Teléfono 1 en el perfil del organizador para que otros eventos puedan reutilizarlo.",
      phoneHintSlot2: "Lo guardaremos como Teléfono 2 en el perfil del organizador para que otros eventos puedan reutilizarlo.",
      phoneHintFull: "Ambos campos de teléfono del organizador ya están ocupados — este teléfono solo se guardará con este evento.",
      logoAlt: "Logotipo del organizador",
      bookingPageUnavailableBody:
        "El enlace puede ser incorrecto o la página de registro de este organizador no está disponible en este momento.",
    },
    welcome: {
      badge: "Bienvenido a Haab",
      title: "¿Qué tipo de negocio estamos configurando hoy?",
      body: "Elija su industria y preconfiguraremos sus servicios, horarios semanales y una página de reservas. Puede editar todo en menos de un minuto.",
      featureCustomizable: "Totalmente personalizable después",
      featureNoCard: "Sin tarjeta de crédito",
      featureReady: "Listo para compartir en minutos",
      getStarted: "Comenzar",
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
      timeZone: "Zona horaria",
      timeZoneUnset: "Elija su zona horaria",
      timeZoneHint:
        "Sus horarios de atenci\u00f3n y cada reserva se leen en esta zona. Sus clientes ven la ciudad en su p\u00e1gina p\u00fablica.",
      timeZoneDetect: "Detectar mi zona horaria",
      timeZoneCurrentTime: "All\u00e1 son las {time} en este momento.",
      timeZonePromptTitle: "Confirme su zona horaria: detectamos {zone}",
      timeZonePromptBody:
        "Su p\u00e1gina sigue usando UTC, as\u00ed que los horarios de reserva pueden no coincidir con su horario real.",
      timeZonePromptAccept: "Usar esta zona horaria",
      timeZonePromptDismiss: "Ahora no",
      headerImage: "Imagen de encabezado",
      headerImageHint: "Se muestra como banner en la parte superior de su página pública, antes de la lista de reservas.",
      headerImagePreviewAlt: "Vista previa del banner de encabezado",
      noHeaderImage: "Aún no hay imagen de encabezado",
      logoImage: "Logotipo de la página pública",
      logoImageHint: "Se muestra arriba a la izquierda, junto al título de su página pública. JPG, PNG o WEBP, hasta 1 MB.",
      logoImagePreviewAlt: "Vista previa del logotipo de la página pública",
      noLogoImage: "Aún no hay logotipo",
      logoImageSizeError: "El logotipo debe pesar 1 MB o menos.",
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

/**
 * Vertical nouns ("appointment", "reservation", "cita") are the only runtime
 * values these strings take, and each language orders them differently — so
 * they are placeholders in the dictionary rather than string concatenation at
 * the call site, which is what let English drift out of the dictionary.
 */
export function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function bookingT(lang: Lang = "en"): BookingDict {
  return bookingTranslations[lang] ?? bookingTranslations.en;
}
