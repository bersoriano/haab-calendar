export type Lang = "es" | "en";

export const translations = {
  es: {
    nav: {
      brand: "Haab Calendar",
      links: {
        examples: "Ejemplos reales",
        how: "Cómo funciona",
        features: "Funciones",
        useCases: "Casos de uso",
        faq: "Preguntas",
      },
      seeLivePage: "Verlo en vivo",
      createPageShort: "Crear página",
      createPageLong: "Crear mi página",
      openMenu: "Abrir menú",
      logIn: "Iniciar sesión",
      dashboard: "Tu panel",
    },
    home: {
      backToHome: "← Volver al inicio",
      signedInAs: "Sesión iniciada como",
      signedIn: "Sesión iniciada",
      bookingPageReady: "Tu página de reservas está lista",
      dashboardBody:
        "Administra disponibilidad, servicios y reservas entrantes desde tu panel.",
      goToDashboard: "Ir a tu panel →",
      guestDraftTitle: "Modo de vista previa",
      guestDraftBody:
        "Prueba servicios, horarios y tu página pública. Este borrador está guardado en este navegador.",
      guestDraftPublish: "Publicar mi página",
      selectedWorkflow: "Flujo de trabajo seleccionado",
      selectedWorkflowHint:
        "La configuración usará los servicios, la disponibilidad y las reglas de reserva predeterminados para este flujo.",
      chooseAnotherWorkflow: "Elegir otro flujo",
      signOut: "Cerrar sesión",
      verticals: {
        healthcare: {
          label: "Salud",
          tagline: "Para médicos y especialistas",
          start: "Empezar con salud →",
        },
        spaces: {
          label: "Espacios",
          tagline: "Para canchas, salones y oficinas compartidas",
          start: "Empezar con espacios →",
        },
        professional: {
          label: "Servicios profesionales",
          tagline: "Para asesores, contadores y consultores",
          start: "Empezar con servicios profesionales →",
        },
        events: {
          label: "Eventos",
          tagline: "Para carreras, talleres, clases y reuniones",
          start: "Empezar con eventos →",
        },
        restaurant: {
          label: "Restaurantes",
          tagline: "Para comedores que reservan mesas",
          start: "Empezar con restaurantes →",
        },
      },
    },
    auth: {
      pageTitle: "Inicia sesión para administrar tu espacio de reservas.",
      pageBody:
        "Usa tu cuenta de proveedor para configurar servicios, disponibilidad, reservas y la página pública de reservas.",
      panelTitle: "Acceso para proveedores",
      eventOrganizerPageBody:
        "Usa tu cuenta de organizador para configurar eventos, registros y la página pública de registro.",
      eventOrganizerPanelTitle: "Acceso para organizadores",
      panelBody: "La autenticación con correo y contraseña se gestiona con Supabase Auth.",
      email: "Correo electrónico",
      emailPlaceholder: "tu@ejemplo.com",
      password: "Contraseña",
      passwordPlaceholder: "Al menos 6 caracteres",
      signIn: "Iniciar sesión",
      signingIn: "Iniciando sesión...",
      createAccount: "Crear cuenta",
      createAccountToPublish: "Crear cuenta para publicar",
      alreadyHaveAccount: "¿Ya tienes una cuenta? Inicia sesión",
      newHereCreateAccount: "¿Eres nuevo? Crea una cuenta",
      publishPageTitle: "Crea tu cuenta para publicar tu página.",
      publishPageBody:
        "Todo lo que configuraste está seguro en este navegador. Crea una cuenta para guardarlo y publicar.",
      publishPanelTitle: "Guarda y publica tu página",
      publishPanelBody:
        "Usa correo electrónico y contraseña. Volverás a tu página con todo intacto.",
      draftSafe: "Tu borrador está seguro en este navegador.",
      creatingAccount: "Creando cuenta...",
      creatingAndSending:
        "Creando tu cuenta y enviando el correo de confirmación...",
      requiredCredentials: "Ingresa tu correo electrónico y contraseña.",
      passwordMin: "La contraseña debe tener al menos 6 caracteres.",
      signInFailed: "No se pudo iniciar sesión con esos datos.",
      invalidCredentials: "El correo o la contraseña son incorrectos.",
      emailNotConfirmed: "Confirma tu correo electrónico antes de iniciar sesión.",
      createFailed: "No se pudo crear la cuenta.",
      userExists: "Ya existe una cuenta con este correo electrónico.",
      signupDisabled: "La creación de cuentas no está disponible en este momento.",
      emailInvalid: "Ingresa un correo electrónico válido.",
      emailConfirmed: "Correo confirmado. Inicia sesión para continuar.",
      accountCreated:
        "Cuenta creada. Enviamos un enlace de confirmación a tu correo. Confírmalo y después inicia sesión aquí.",
      confirmationExpired:
        "El enlace de confirmación venció o ya fue utilizado. Intenta iniciar sesión; si no funciona, crea la cuenta de nuevo.",
    },
    hero: {
      title: "Un enlace. Sin registrarse. Sin reservas duplicadas.",
      body: "Disponibilidad en vivo, un apartado de diez minutos mientras escriben y un enlace privado para reagendar. Tus clientes nunca crean una cuenta, y tú nunca confirmas un horario a mano.",
      ctaPrimary: "Crear mi página",
      ctaSecondary: "Ver una página real",
      fineprint: "Gratis durante el acceso anticipado. Sin tarjeta y sin instalar nada.",
      returningPrompt: "¿Ya tienes una página?",
      returningCta: "Inicia sesión",
      previewCaption: "La página real de Dra. Maya Rivera. Tócala: está en vivo.",
    },
    startDialog: {
      eyebrow: "Gratis · 20 segundos",
      title: "Reserva tu enlace.",
      stepVertical: "¿Qué reservas?",
      stepName: "Nombra tu página",
      namePlaceholder: "Consultorio Rivera",
      submit: "Quiero este enlace →",
      submitDisabled: "Elige qué reservas",
      fineprint: "Gratis durante el acceso anticipado. Sin tarjeta. Tus clientes nunca se registran.",
      close: "Cerrar",
    },
    demoDialog: {
      title: "Resérvalo tú. 15 segundos.",
      steps: ["Elige un servicio", "Elige un horario", "Mira arrancar el apartado de 10 minutos"],
      frameTitle: "Página pública de reservas de Dra. Maya Rivera",
      disclaimer: "Página real, apartado real. Sin cuenta y sin instalar nada.",
      openFull: "Abrir página completa ↗",
      close: "Cerrar",
    },
    heroPreview: {
      ariaLabel: "Vista previa interactiva de una página pública de reservas",
      liveBadge: "En vivo",
      providerMeta: "Medicina familiar · Nueva York",
      stepService: "1 · Elige un servicio",
      stepDate: "2 · Elige una fecha",
      stepTime: "3 · Elige un horario",
      services: [
        { name: "Consulta para pacientes nuevos", meta: "30 min · $95 · 1 paciente" },
        { name: "Consulta de seguimiento", meta: "20 min · $65 · 1 paciente" },
      ],
      moreTimes: "+{n} horarios más disponibles",
      takenNote: "Otra persona acaba de tomar un horario. Desapareció en vivo.",
      holdLabel: "Apartado de la reserva",
      holdIdle: "Elige un horario para apartarlo",
      holdHelper: "El horario queda protegido mientras el cliente completa sus datos.",
      holdExpired: "El apartado venció",
      holdExpiredHelper: "El horario volvió a estar disponible para todos.",
      confirmCta: "Confirmar reserva",
      noAccountNote: "Sin crear cuenta",
      restart: "Repetir la demo",
    },
    liveExamples: {
      eyebrow: "Producto real, no una maqueta",
      title: "Abre una. Resérvala como lo haría un cliente.",
      body: "{n} páginas públicas funcionando ahora. Revisa disponibilidad, toma el apartado, confirma y luego reagenda tú mismo.",
      liveBadge: "En vivo",
      items: [
        {
          vertical: "Salud",
          title: "Dra. Maya Rivera",
          proof: "Citas médicas con horarios reales y lenguaje para pacientes.",
          cta: "Probar una cita",
        },
        {
          vertical: "Espacios",
          title: "Riverside Padel Club",
          proof: "Una cancha techada por horario: reservarla la quita del calendario de todos.",
          cta: "Reservar la cancha",
        },
        {
          vertical: "Servicios profesionales",
          title: "Northstar Strategy",
          proof: "Sesiones de consultoría con confirmación y gestión privada.",
          cta: "Probar una sesión",
        },
        {
          vertical: "Eventos",
          title: "Makers Workshop",
          proof: "Registros para talleres con fecha, cupo y lugares disponibles.",
          cta: "Probar un registro",
        },
        {
          vertical: "Carreras",
          title: "Kilómetro Cero Running",
          proof: "Inscripciones a carreras con fecha fija, cupo y entrenamientos semanales.",
          cta: "Inscribirse a una carrera",
        },
        {
          vertical: "Belleza",
          title: "Nube Rosa Nail Studio",
          proof: "Citas de manicure y pestañas con duración, precio y horarios reales.",
          cta: "Agendar una cita",
        },
        {
          vertical: "Dental",
          title: "Brightpoint Dental",
          proof: "Limpiezas y urgencias dentales con horario partido y consultorio único.",
          cta: "Agendar una limpieza",
        },
        {
          vertical: "Veterinaria",
          title: "Clínica Veterinaria Patitas",
          proof: "Consultas, vacunas y limpieza dental para mascotas con precios visibles.",
          cta: "Agendar una consulta",
        },
        {
          vertical: "Peluquería",
          title: "Copperline Hair Studio",
          proof: "Corte, color y peinado en una silla: cada cita bloquea su propio horario.",
          cta: "Reservar una silla",
        },
        {
          vertical: "Taller mecánico",
          title: "Northgate Auto Service",
          proof: "Cambio de aceite, frenos y neumáticos con una bahía y un auto por turno.",
          cta: "Apartar la bahía",
        },
        {
          vertical: "Entrenamiento de golf",
          title: "Fairway Lab Golf",
          proof: "Clases uno a uno de golf con horarios de mañana y duración por tipo de sesión.",
          cta: "Reservar una clase",
        },
        {
          vertical: "Restaurante",
          title: "Casa Mirador",
          proof: "Doce mesas por turno: cada reserva descuenta una, no cierra el horario.",
          cta: "Reservar una mesa",
        },
      ],
      seeAll: "Ver las {n} demos →",
      note: "No necesitas iniciar sesión. Las {n} páginas usan el flujo público real de Haab.",
    },
    gallery: {
      eyebrow: "Todas las demos",
      title: "Cada página de ejemplo, en vivo.",
      body: "{n} negocios distintos sobre el mismo motor de reservas. Abre cualquiera y resérvala como lo haría un cliente.",
      back: "← Volver al inicio",
      note: "Ninguna requiere cuenta. Todas usan el flujo público real de Haab.",
    },
    how: {
      eyebrow: "Cómo funciona",
      title: "Publica una vez. Y deja de contestar mensajes de reservas.",
      stepLabel: "Paso",
      steps: [
        {
          title: "Nombra tu página.",
          body: "Servicios, horarios y precios llegan puestos para lo que haces. Cambia lo que quieras.",
        },
        {
          title: "Comparte el enlace.",
          body: "Tu bio, tus correos, un código QR en la puerta.",
        },
        {
          title: "Piloto automático.",
          body: "Ellos reservan, ellos reagendan, a ti te llega una cita al calendario.",
        },
      ],
      cta: "Crear mi página",
    },
    features: {
      eyebrow: "Por qué se siente diferente",
      title: "Tres decisiones que notarás la primera semana.",
      items: [
        {
          title: "Citas, días completos y boletos en una página.",
          body: "Una hora de consultoría, un salón para el sábado y cuarenta lugares en una clase son la misma página y el mismo enlace. Sin un segundo producto para el evento.",
          tag: "Tres modos, una página",
        },
        {
          title: "Habla como tu sector.",
          body: "Pacientes, huéspedes, clientes, asistentes, comensales: cada etiqueta, confirmación y error calza con lo que vendes, en español o en inglés.",
          tag: "Lenguaje específico",
        },
        {
          title: "Ellos arreglan sus cambios.",
          body: "Cada confirmación lleva un enlace privado para reagendar o cancelar. El cambio llega a tu calendario sin llegar a tu bandeja.",
          tag: "Autoservicio privado",
        },
      ],
    },
    useCases: {
      eyebrow: "Casos de uso",
      title: "Elige qué reservas. Tu página llega lista.",
      body:
        "Servicios, horarios y reglas ya vienen puestos para tu giro. Cambia lo que quieras.",
      cards: [
        {
          title: "Salud — médicos y especialistas",
          body: "Consultas de primera vez y seguimientos, con horario al minuto, un paciente por cita y precio a la vista.",
        },
        {
          title: "Espacios — canchas, salones y oficinas",
          body: "Rentas por hora y reservas de día completo en la misma página, abiertas todos los días, con capacidad por reserva.",
        },
        {
          title: "Servicios profesionales — asesores y consultores",
          body: "Sesiones de estrategia y consultas rápidas, precios premium, un cliente por horario.",
        },
        {
          title: "Eventos — carreras, talleres y clases",
          body: "Registros únicos o recurrentes con fecha, ubicación, precio y cupo real — la página lleva la cuenta de los lugares por ti.",
        },
      ],
      note:
        "Gana el más parecido. Todo se edita en la configuración.",
      cta: "Crear mi página",
    },
    trust: {
      eyebrow: "Confianza",
      title: "Hecho para cuidar un calendario real.",
      items: [
        {
          title: "Decide el servidor, no el navegador.",
          body: "Un horario apartado se aparta en el servidor. Cuando dos personas van por el mismo horario, una queda confirmada y a la otra se le avisa de inmediato: la página no puede convencerse sola de duplicar una reserva.",
        },
        {
          title: "Sin cuentas no hay contraseñas que perder.",
          body: "Tus clientes nunca se registran, así que no hay contraseña que guardar, filtrar ni restablecer. Llegan a su reserva por un enlace privado que se guarda cifrado, nunca en texto plano.",
        },
        {
          title: "Tu página la publicas tú.",
          body: "Nada es público hasta que lo publicas, y puedes bajarlo desde tu panel sin borrar tu trabajo.",
        },
      ],
    },
    faq: {
      eyebrow: "Preguntas",
      title: "Preguntas, respondidas.",
      items: [
        {
          q: "¿Qué funciona hoy?",
          a: "Páginas públicas de reservas, disponibilidad en vivo, apartados de diez minutos, confirmaciones, cupo de eventos y un enlace privado de autoservicio en cada reserva.",
        },
        {
          q: "¿Puedo aceptar registros para una clase o evento?",
          a: "Sí. Los eventos descuentan lugares confirmados y apartados de tu cupo, así que una clase se cierra sola cuando se llena.",
        },
        {
          q: "¿Reservas de día completo, no solo citas?",
          a: "Sí. Citas, días completos y registros comparten una misma página.",
        },
        {
          q: "¿Las reservas se pueden agregar a un calendario?",
          a: "Sí. Cada confirmación incluye un archivo de calendario. También incluye un QR privado para abrir o verificar la reserva.",
        },
        {
          q: "¿Cuánto cuesta?",
          a: "Nada durante el acceso anticipado.",
        },
      ],
    },
    finalCta: {
      title: "Un enlace. Después, piloto automático.",
      body: "Nombra tu página y compártela hoy.",
      ownerBody: "Tu página está en vivo. Comparte el enlace y déjala correr.",
      ctaPrimary: "Crear mi página",
      fineprint: "Gratis durante el acceso anticipado. Sin tarjeta.",
    },
    footer: {
      tagline: "Un enlace de reservas. Disponibilidad protegida. Sin cuentas para tus clientes.",
      productHeading: "Producto",
      product: {
        how: "Cómo funciona",
        features: "Funciones",
        useCases: "Casos de uso",
        seeLivePage: "Verlo en vivo",
      },
      companyHeading: "Empresa",
      company: {
        pricing: "Acceso anticipado",
      },
      copyright: "© 2026 Haab Calendar. Software de reservas en acceso anticipado.",
      createLink: "Crear mi página →",
    },
  },

  en: {
    nav: {
      brand: "Haab Calendar",
      links: {
        examples: "Live examples",
        how: "How it works",
        features: "Features",
        useCases: "Use cases",
        faq: "FAQ",
      },
      seeLivePage: "See it live",
      createPageShort: "Create page",
      createPageLong: "Create your page",
      openMenu: "Open menu",
      logIn: "Log in",
      dashboard: "Your dashboard",
    },
    home: {
      backToHome: "← Back to home",
      signedInAs: "Signed in as",
      signedIn: "You're signed in",
      bookingPageReady: "Your booking page is ready",
      dashboardBody:
        "Manage availability, services, and incoming bookings from your dashboard.",
      goToDashboard: "Go to your dashboard →",
      guestDraftTitle: "Preview mode",
      guestDraftBody:
        "Try services, availability, and your public page. This draft is saved in this browser.",
      guestDraftPublish: "Publish my page",
      selectedWorkflow: "Selected workflow",
      selectedWorkflowHint:
        "Setup will use this workflow's service, availability, and booking defaults.",
      chooseAnotherWorkflow: "Choose another workflow",
      signOut: "Sign out",
      verticals: {
        healthcare: {
          label: "Healthcare",
          tagline: "For doctors and medical specialists",
          start: "Start with Healthcare →",
        },
        spaces: {
          label: "Spaces",
          tagline: "For courts, venues, and shared offices",
          start: "Start with Spaces →",
        },
        professional: {
          label: "Professional services",
          tagline: "For advisors, accountants, and consultants",
          start: "Start with Professional services →",
        },
        events: {
          label: "Events",
          tagline: "For races, workshops, classes, and gatherings",
          start: "Start with Events →",
        },
        restaurant: {
          label: "Restaurants",
          tagline: "For dining rooms taking table reservations",
          start: "Start with Restaurants →",
        },
      },
    },
    auth: {
      pageTitle: "Sign in to manage your booking workspace.",
      pageBody:
        "Use your provider account to configure services, availability, bookings, and the public booking page.",
      panelTitle: "Provider login",
      eventOrganizerPageBody:
        "Use your organizer account to configure events, registrations, and the public registration page.",
      eventOrganizerPanelTitle: "Organizer login",
      panelBody: "Email and password authentication is handled by Supabase Auth.",
      email: "Email",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "At least 6 characters",
      signIn: "Sign in",
      signingIn: "Signing in...",
      createAccount: "Create account",
      createAccountToPublish: "Create account to publish",
      alreadyHaveAccount: "Already have an account? Sign in",
      newHereCreateAccount: "New here? Create account",
      publishPageTitle: "Create your account to publish your page.",
      publishPageBody:
        "Everything you configured is safe in this browser. Create an account to save it and publish.",
      publishPanelTitle: "Save and publish your page",
      publishPanelBody:
        "Use your email and a password. You will return to your page with everything intact.",
      draftSafe: "Your draft is safe in this browser.",
      creatingAccount: "Creating account...",
      creatingAndSending:
        "Creating your account and sending your confirmation email...",
      requiredCredentials: "Enter both an email address and password.",
      passwordMin: "Password must be at least 6 characters.",
      signInFailed: "Could not sign in with those credentials.",
      invalidCredentials: "Invalid email or password.",
      emailNotConfirmed: "Confirm your email before signing in.",
      createFailed: "Could not create that account.",
      userExists: "An account already exists for this email address.",
      signupDisabled: "Account creation is not available right now.",
      emailInvalid: "Enter a valid email address.",
      emailConfirmed: "Email confirmed. Sign in to continue.",
      accountCreated:
        "Account created. We sent a confirmation link to your email. Confirm it, then sign in here.",
      confirmationExpired:
        "That confirmation link is expired or has already been used. Try signing in below; if it does not work, create the account again.",
    },
    hero: {
      title: "One link. No registration needed. No double bookings.",
      body: "Live availability, a ten-minute hold while they type, and a private link to reschedule. Your clients never make an account, and you never confirm a time by hand.",
      ctaPrimary: "Create your page",
      ctaSecondary: "See a real page",
      fineprint: "Free while in early access. No card, nothing to install.",
      returningPrompt: "Already have a page?",
      returningCta: "Log in",
      previewCaption: "Dr. Maya Rivera's real page. Touch it — it's live.",
    },
    startDialog: {
      eyebrow: "Free · 20 seconds",
      title: "Claim your booking link.",
      stepVertical: "What do you book?",
      stepName: "Name your page",
      namePlaceholder: "Rivera Family Medicine",
      submit: "Claim this link →",
      submitDisabled: "Pick what you book",
      fineprint: "Free while in early access. No card. Your clients never sign up.",
      close: "Close",
    },
    demoDialog: {
      title: "Book it yourself. 15 seconds.",
      steps: ["Pick a service", "Pick a time", "Watch the 10-minute hold start"],
      frameTitle: "Live public booking page for Dr. Maya Rivera",
      disclaimer: "Real page, real hold. No account, nothing to install.",
      openFull: "Open full page ↗",
      close: "Close",
    },
    heroPreview: {
      ariaLabel: "Interactive preview of a public booking page",
      liveBadge: "Live",
      providerMeta: "Family medicine · New York",
      stepService: "1 · Choose a service",
      stepDate: "2 · Pick a date",
      stepTime: "3 · Pick a time",
      services: [
        { name: "New patient consultation", meta: "30 min · $95 · 1 patient" },
        { name: "Follow-up visit", meta: "20 min · $65 · 1 patient" },
      ],
      moreTimes: "+{n} more times available",
      takenNote: "Someone else just took a time. It disappeared live.",
      holdLabel: "Booking hold",
      holdIdle: "Pick a time to hold it",
      holdHelper: "The time stays protected while the client fills in their details.",
      holdExpired: "Hold expired",
      holdExpiredHelper: "The time went back on sale for everyone.",
      confirmCta: "Confirm booking",
      noAccountNote: "No account needed",
      restart: "Run the demo again",
    },
    liveExamples: {
      eyebrow: "Real product, not a mockup",
      title: "Open one. Book it like a client would.",
      body: "{n} public pages, running right now. Check availability, take the hold, confirm, then reschedule yourself.",
      liveBadge: "Live",
      items: [
        {
          vertical: "Healthcare",
          title: "Dr. Maya Rivera",
          proof: "Medical appointments with live times and patient-specific language.",
          cta: "Try an appointment",
        },
        {
          vertical: "Spaces",
          title: "Riverside Padel Club",
          proof: "One indoor court by the hour — booking it takes that time off every list.",
          cta: "Book the court",
        },
        {
          vertical: "Professional services",
          title: "Northstar Strategy",
          proof: "Consulting sessions with confirmation and private management.",
          cta: "Try a session",
        },
        {
          vertical: "Events",
          title: "Makers Workshop",
          proof: "Workshop registration with a fixed date, capacity, and spots left.",
          cta: "Try a registration",
        },
        {
          vertical: "Races",
          title: "Kilómetro Cero Running",
          proof: "Race entries with a fixed date, entry caps, and weekly training sessions.",
          cta: "Enter a race",
        },
        {
          vertical: "Beauty",
          title: "Nube Rosa Nail Studio",
          proof: "Nail and lash appointments with real durations, prices, and hours.",
          cta: "Book an appointment",
        },
        {
          vertical: "Dental",
          title: "Brightpoint Dental",
          proof: "Cleanings and urgent visits with a lunch break and one treatment room.",
          cta: "Book a cleaning",
        },
        {
          vertical: "Veterinary",
          title: "Clínica Veterinaria Patitas",
          proof: "Pet check-ups, vaccines, and dental work with prices stated up front.",
          cta: "Book a check-up",
        },
        {
          vertical: "Hair salon",
          title: "Copperline Hair Studio",
          proof: "Cut, colour, and blow-dry in one chair — each booking holds its own slot.",
          cta: "Book the chair",
        },
        {
          vertical: "Auto service",
          title: "Northgate Auto Service",
          proof: "Oil, brakes, and tires with one bay and one vehicle per slot.",
          cta: "Book the bay",
        },
        {
          vertical: "Golf coaching",
          title: "Fairway Lab Golf",
          proof: "One-on-one golf lessons on early hours, priced by session length.",
          cta: "Book a lesson",
        },
        {
          vertical: "Restaurant",
          title: "Casa Mirador",
          proof: "Twelve tables per seating — each reservation takes one, not the hour.",
          cta: "Reserve a table",
        },
      ],
      seeAll: "See all {n} demos →",
      note: "No sign-in required. All {n} pages use Haab's real public booking flow.",
    },
    gallery: {
      eyebrow: "Every demo",
      title: "Every example page, live.",
      body: "{n} different businesses on one booking engine. Open any of them and book it the way a client would.",
      back: "← Back to home",
      note: "None of them need an account. All use Haab's real public booking flow.",
    },
    how: {
      eyebrow: "How it works",
      title: "Publish once. Then stop answering booking messages.",
      stepLabel: "Step",
      steps: [
        {
          title: "Name your page.",
          body: "Services, hours, and prices arrive pre-filled for what you do. Change what you want.",
        },
        {
          title: "Share the link.",
          body: "Your bio, your emails, a QR code on the door.",
        },
        {
          title: "Switch on autopilot.",
          body: "They book, they reschedule, you get a calendar entry.",
        },
      ],
      cta: "Create your page",
    },
    features: {
      eyebrow: "Why it feels different",
      title: "Three decisions you will notice in week one.",
      items: [
        {
          title: "Appointments, full days, and tickets on one page.",
          body: "A consulting hour, a venue for a Saturday, and forty seats at a class are the same page and the same link. No second product for the event.",
          tag: "Three modes, one page",
        },
        {
          title: "It speaks your industry.",
          body: "Patients, guests, clients, attendees, diners — every label, confirmation, and error matches what you actually sell, in English or Spanish.",
          tag: "Industry-specific language",
        },
        {
          title: "They fix their own changes.",
          body: "Every confirmation carries a private link to reschedule or cancel. The change lands on your calendar without landing in your inbox.",
          tag: "Private self-service",
        },
      ],
    },
    useCases: {
      eyebrow: "Use cases",
      title: "Pick what you book. Your page arrives filled in.",
      body:
        "Services, hours, and booking rules come pre-set for your line of work. Change anything you like.",
      cards: [
        {
          title: "Healthcare — doctors & specialists",
          body: "New-patient consults and follow-ups, timed to the minute, one patient per slot, price shown up front.",
        },
        {
          title: "Spaces — courts, venues & offices",
          body: "Hourly rentals and full-day reservations on one page, open every day, capacity per booking.",
        },
        {
          title: "Professional services — advisors & consultants",
          body: "Strategy sessions and quick consults, premium pricing, one client per slot.",
        },
        {
          title: "Events — races, workshops & classes",
          body: "One-time or recurring registrations with a date, location, price, and real capacity — the page tracks spots left for you.",
        },
      ],
      note:
        "Closest match wins. Everything is editable during setup.",
      cta: "Create your page",
    },
    trust: {
      eyebrow: "Trust",
      title: "Built to be trusted with a real calendar.",
      items: [
        {
          title: "The server decides, not the browser.",
          body: "A held slot is held on the server. When two people reach for the same time, one is confirmed and the other is told immediately — the page cannot talk itself into a double booking.",
        },
        {
          title: "No accounts means no passwords to lose.",
          body: "Your clients never register, so there is no client password to store, leak, or reset. Their booking is reached through a private link that is stored hashed, never in plain text.",
        },
        {
          title: "Your page is yours to publish.",
          body: "Nothing is public until you publish it, and you can take it down again from your dashboard without deleting your work.",
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Questions, answered.",
      items: [
        {
          q: "What works today?",
          a: "Public booking pages, live availability, ten-minute holds, confirmations, event capacity, and a private self-service link on every booking.",
        },
        {
          q: "Can I take registrations for a class or event?",
          a: "Yes. Events count confirmed and held spots against your capacity, so a class closes itself when it fills.",
        },
        {
          q: "Full-day bookings, not just appointments?",
          a: "Yes. Appointments, full days, and registrations share one page.",
        },
        {
          q: "Can bookings be added to a calendar?",
          a: "Yes. Every confirmation includes a calendar file. It also includes a private QR for opening or verifying the booking.",
        },
        {
          q: "What does it cost?",
          a: "Nothing during early access.",
        },
      ],
    },
    finalCta: {
      title: "One link. Then autopilot.",
      body: "Name your page and share it today.",
      ownerBody: "Your page is live. Share the link and let it run.",
      ctaPrimary: "Create your page",
      fineprint: "Free while in early access. No card.",
    },
    footer: {
      tagline: "One booking link. Protected availability. No client accounts.",
      productHeading: "Product",
      product: {
        how: "How it works",
        features: "Features",
        useCases: "Use cases",
        seeLivePage: "See it live",
      },
      companyHeading: "Company",
      company: {
        pricing: "Early access",
      },
      copyright: "© 2026 Haab Calendar. Early-access booking software.",
      createLink: "Create your page →",
    },
  },
};

export type Dict = (typeof translations)["en"];

export function normalizeLandingLang(value: unknown): Lang {
  return value === "es" ? "es" : "en";
}
