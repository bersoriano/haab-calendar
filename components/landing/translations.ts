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
      seeLivePage: "Ver una página real",
      createPageShort: "Crear página",
      createPageLong: "Crea tu página de reservas",
      openMenu: "Abrir menú",
    },
    home: {
      backToHome: "← Volver al inicio",
      signedInAs: "Sesión iniciada como",
      signedIn: "Sesión iniciada",
      bookingPageReady: "Tu página de reservas está lista",
      dashboardBody:
        "Administra disponibilidad, servicios y reservas entrantes desde tu panel.",
      goToDashboard: "Ir a tu panel →",
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
      },
    },
    auth: {
      languageSelector: "Idioma de inicio de sesión",
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
      badge: "Disponibilidad en vivo · Apartado de 10 minutos",
      title: "Un enlace. Sin cuentas para tus clientes. Sin reservas duplicadas.",
      body: "Comparte una sola página. Tus clientes ven disponibilidad real, reciben un apartado de 10 minutos mientras completan sus datos y reagendan solos. Nunca crean una cuenta.",
      proofs: [
        "Disponibilidad en vivo",
        "Apartado de 10 minutos",
        "Sin cuenta para el cliente",
      ],
      ctaPrimary: "Probar una reserva real →",
      ctaSecondary: "Crear mi página",
      fineprint: "Sin cuenta para el cliente · Citas, días completos y registros con cupo.",
      previewCaption: "Esta es la página pública real de Dra. Maya Rivera. Tócala: es interactiva.",
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
      title: "Elige un ejemplo y completa el flujo como cliente.",
      body: "Estas páginas son públicas y funcionales. Abre una, consulta disponibilidad real y comprueba el apartado, la confirmación y el autoservicio.",
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
          proof: "Reservas de cancha por horario con capacidad y reglas claras.",
          cta: "Reservar una cancha",
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
      ],
      note: "No necesitas iniciar sesión. Las cuatro páginas usan el flujo público real de Haab.",
    },
    socialProof: {
      badge: "Producto en acceso anticipado",
      earlyAccess: "El flujo público principal funciona hoy; seguimos ampliando el producto.",
      stats: [
        { value: "0", label: "Cuentas que un cliente necesita crear" },
        { value: "10 min", label: "Apartado mientras completa sus datos" },
        { value: "3", label: "Modos: citas, día completo y boletos" },
      ],
      heading: "Casos de uso que puedes gestionar hoy",
      customers: [
        { name: "Consultorios médicos", detail: "Salud" },
        { name: "Canchas y clubes", detail: "Espacios" },
        { name: "Asesores y consultores", detail: "Servicios pro" },
        { name: "Salones de eventos", detail: "Espacios" },
        { name: "Coworking y oficinas", detail: "Espacios" },
        { name: "Carreras y eventos comunitarios", detail: "Eventos" },
      ],
      footer:
        "Haab está en acceso anticipado: reservas, apartados, confirmaciones y autoservicio ya funcionan; todavía estamos construyendo más integraciones y herramientas de administración.",
    },
    problem: {
      eyebrow: "La realidad de hoy",
      title: "Reservar se complica cuando cada cambio se vuelve una conversación.",
      body: "Disponibilidad por mensajes, capturas de calendario y cambios manuales funcionan hasta que dos personas quieren el mismo horario o un cliente necesita reagendar. Haab convierte ese proceso en un enlace público con reglas claras.",
      pains: [
        "Mensajes de ida y vuelta para cerrar una sola cita.",
        "Reservas duplicadas porque dos personas tomaron el «mismo» horario libre.",
        "Confirmaciones que se pierden fuera del calendario del cliente.",
        "Reagendados y cancelaciones que terminan todos en tus manos.",
        "Cupos de clases y eventos que tienes que contar a mano.",
      ],
      closing: "Haab reemplaza esa coordinación con disponibilidad en vivo y autoservicio.",
    },
    how: {
      eyebrow: "Cómo funciona",
      title: "Publica una página y deja que tus clientes resuelvan lo rutinario.",
      stepLabel: "Paso",
      steps: [
        {
          title: "Agrega lo que ofreces.",
          body: "Elige salud, espacios, servicios profesionales o eventos. Después ajusta servicios, duración, capacidad, precio y disponibilidad semanal.",
        },
        {
          title: "Comparte un solo enlace.",
          body: "Obtienes una página pública de reservas limpia con tu propia dirección. Ponla en tu bio, tus correos, un código QR en la puerta. Los clientes se agendan solos.",
        },
        {
          title: "Saca los cambios de tu bandeja de entrada.",
          body: "Los clientes eligen disponibilidad real, reciben un apartado de 10 minutos y confirman. Después usan su enlace privado para reagendar o cancelar por su cuenta.",
        },
      ],
      cta: "Crea tu página de reservas",
    },
    features: {
      eyebrow: "Por qué se siente diferente",
      title: "Cinco decisiones que eliminan el trabajo rutinario.",
      items: [
        {
          title: "Cero cuentas para tus clientes.",
          body: "Eligen, ingresan sus datos y confirman. No necesitan registro, contraseña ni iniciar sesión.",
          tag: "Menos fricción",
        },
        {
          title: "Cada selección recibe un apartado de 10 minutos.",
          body: "La cuenta regresiva hace visible el tiempo restante y la protección del servidor rechaza confirmaciones que entren en conflicto dentro del flujo de Haab.",
          tag: "Protección contra conflictos",
        },
        {
          title: "Tres modos en una sola página.",
          body: "Combina citas por horario, reservas de día completo y registros con cupo sin cambiar de producto.",
          tag: "Citas, días y boletos",
        },
        {
          title: "Habla como tu sector.",
          body: "Pacientes, huéspedes, clientes o asistentes ven términos y confirmaciones adecuados para lo que están reservando.",
          tag: "Lenguaje específico",
        },
        {
          title: "Los clientes gestionan sus cambios.",
          body: "Cada confirmación incluye un enlace privado para reagendar o cancelar sin cuenta y sin volver a escribirte.",
          tag: "Autoservicio privado",
        },
      ],
    },
    differentiators: {
      eyebrow: "Lo que lo hace diferente",
      title: "Diferencias concretas que puedes probar hoy.",
      blocks: [
        {
          tag: "Apartado de reservas",
          heading: "El horario queda protegido mientras terminan.",
          body: "Un apartado de 10 minutos reserva la selección mientras el cliente ingresa sus datos. El contador muestra el tiempo restante, los apartados vencidos se liberan y las validaciones del servidor protegen la misma disponibilidad antes de confirmar.",
        },
        {
          tag: "Autoservicio sin cuenta",
          heading: "Pueden reagendar o cancelar sin crear una cuenta.",
          body: "Cada confirmación trae un enlace privado de administración. El cliente puede abrirlo más tarde para cambiar la fecha o cancelar; Haab actualiza esa reserva y vuelve a calcular la disponibilidad.",
        },
      ],
    },
    industryLanguage: {
      eyebrow: "Adaptado a tu sector",
      title: "La misma página, en el idioma de tu negocio.",
      body: "Elige tu sector y todo se reescribe solo: lo que se reserva, cómo se llaman tus clientes y cada confirmación. Sin sonar a software genérico.",
      verticals: [
        { label: "Salud", client: "Pacientes", booking: "Citas" },
        { label: "Espacios", client: "Huéspedes", booking: "Reservas" },
        { label: "Servicios pro", client: "Clientes", booking: "Sesiones" },
        { label: "Eventos", client: "Asistentes", booking: "Registros" },
      ],
    },
    useCases: {
      eyebrow: "Casos de uso",
      title: "Una página, moldeada a tu negocio.",
      body:
        "Selecciona un flujo a continuación para comenzar con los servicios, la disponibilidad y la configuración de reservas adecuados.",
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
        "Elige el flujo más parecido a tu negocio. Podrás ajustar sus servicios y disponibilidad durante la configuración.",
      cta: "Crea tu página de reservas",
    },
    mobile: {
      eyebrow: "Hecho primero para el teléfono",
      title: "Diseñado para completar una reserva desde el teléfono.",
      body: "Fechas cómodas para tocar, horarios legibles, acciones de confirmación visibles y una cuenta regresiva clara. El mismo flujo se adapta desde una pantalla pequeña hasta un escritorio.",
    },
    faq: {
      eyebrow: "Preguntas",
      title: "Preguntas, respondidas.",
      items: [
        {
          q: "¿Mis clientes necesitan una cuenta?",
          a: "No. Eligen un horario, ingresan sus datos y quedan reservados. Sin registros, sin contraseñas.",
        },
        {
          q: "¿Cómo se evitan las reservas duplicadas?",
          a: "Dentro de Haab, elegir un horario crea un apartado de 10 minutos. Las reservas y apartados se validan de nuevo en el servidor antes de confirmar, y los conflictos se rechazan.",
        },
        {
          q: "¿Los clientes pueden reagendar o cancelar solos?",
          a: "Sí — cada reserva incluye un enlace privado de administración para reagendar o cancelar, sin inicio de sesión.",
        },
        {
          q: "¿Puedo aceptar registros con boleto para una clase o evento?",
          a: "Sí. Los eventos admiten registros con cupo y Haab cuenta los lugares confirmados y apartados. El procesamiento de pagos todavía no está incluido.",
        },
        {
          q: "¿Puedo ofrecer reservas de día completo, no solo citas?",
          a: "Sí — las citas y las reservas de día completo viven en la misma página.",
        },
        {
          q: "¿Las reservas se pueden agregar a un calendario?",
          a: "Sí. Cada confirmación incluye un archivo ICS y un código QR. Haab todavía no promete sincronización bidireccional con calendarios externos.",
        },
        {
          q: "¿Qué está disponible hoy?",
          a: "Las páginas públicas, disponibilidad, apartados, confirmaciones, cupo de eventos y enlaces para reagendar o cancelar ya funcionan. Haab sigue en acceso anticipado.",
        },
        {
          q: "¿Cuánto cuesta?",
          a: "Haab es gratis durante el acceso anticipado actual. Los planes y límites de pago todavía no están definidos.",
        },
      ],
    },
    testimonials: {
      eyebrow: "Disponible hoy",
      title: "Lo que puedes verificar en los ejemplos en vivo.",
      items: [
        {
          quote: "Un cliente completa la reserva sin registrarse ni crear contraseña.",
          name: "Reserva sin cuenta",
          role: "Comportamiento real del producto",
        },
        {
          quote: "Un apartado activo reduce la disponibilidad antes de la confirmación.",
          name: "Apartado de 10 minutos",
          role: "Comportamiento real del producto",
        },
        {
          quote: "Cada confirmación incluye una ruta privada para reagendar o cancelar.",
          name: "Autoservicio",
          role: "Comportamiento real del producto",
        },
      ],
      note: "Estas son capacidades verificables del producto, no testimonios ni métricas de clientes.",
    },
    pricing: {
      eyebrow: "Acceso anticipado",
      title: "Usa el flujo principal mientras seguimos construyendo.",
      body: "Haab está en acceso anticipado. Las páginas públicas, apartados, confirmaciones, cupo y autoservicio funcionan hoy. Los precios y algunas integraciones todavía se están definiendo.",
      startFree: "Crear una página de acceso anticipado",
      viewPricing: "Ver una página en vivo",
      features: [
        "Una página pública de reservas",
        "Apartados y confirmaciones de reservas",
        "Archivo de calendario y código QR",
        "Enlaces de autoservicio para clientes",
      ],
    },
    finalCta: {
      title: "Dales un enlace y una forma de administrar su propia reserva.",
      body: "Crea una página de acceso anticipado para citas, reservas de día completo o eventos con cupo. Tus clientes no necesitan una cuenta.",
      ctaPrimary: "Crea tu página de reservas",
      ctaSecondary: "Ver una página de reservas en vivo →",
    },
    footer: {
      tagline: "Reservas en acceso anticipado con disponibilidad protegida y sin cuentas para clientes.",
      productHeading: "Producto",
      product: {
        how: "Cómo funciona",
        features: "Funciones",
        useCases: "Casos de uso",
        seeLivePage: "Ver una página real",
      },
      companyHeading: "Empresa",
      company: {
        about: "Acerca de",
        contact: "Contacto",
        pricing: "Acceso anticipado",
      },
      legalHeading: "Legal",
      legal: {
        privacy: "Privacidad",
        terms: "Términos",
      },
      copyright: "© 2026 Haab Calendar. Software de reservas en acceso anticipado.",
      createLink: "Crea tu página de reservas →",
    },
    visuals: {
      weekdays: ["D", "L", "M", "M", "J", "V", "S"],
      serviceSetup: {
        steps: ["Servicio", "Horario", "Reglas", "Publicar"],
        serviceLabel: "Servicio",
        serviceValue: "Consulta de estrategia",
        durationLabel: "Duración",
        durationValue: "45 minutos",
        capacityLabel: "Capacidad",
        capacityValue: "1 cliente",
        modeLabel: "Modo",
        modeValue: "Citas",
        readyToPublish: "Listo para publicar",
        setupTime: "Configuración principal",
      },
      shareLink: {
        yourPage: "Tu página de reservas",
        chips: ["Bio", "Correo", "QR", "Sitio web"],
      },
      automation: {
        confirmedAt: "Confirmado a las 2:00 PM",
        cards: [
          ["Horario apartado", "Protegido por 10 minutos"],
          ["Archivo de calendario", "Listo para el cliente"],
          ["Enlace autoservicio", "Reagenda sin correos de ida y vuelta"],
        ],
      },
      hold: {
        expires: "El apartado expira en 8:42",
        protected: "Horario protegido",
      },
      selfService: [
        ["Enlace de administración", "En cada confirmación, sin cuenta"],
        ["El cliente reagenda", "Tu calendario se actualiza al instante"],
      ],
      useCaseBadge: "Reservable",
      useCaseLines: {
        healthcare: ["Primera vez · $120", "Seguimiento · $60", "30 y 15 min"],
        spaces: ["Cancha · $40/hr", "Salón día completo", "Hasta 100"],
        professional: ["Estrategia · $200", "Consulta · $90", "1 cliente"],
        events: ["Carrera · $590", "Quedan 50 lugares", "Evento con fecha"],
      },
      mobile: {
        calendar: { name: "Sarah Chen", service: "Consulta de marketing", cta: "Elige un horario" },
        slots: { date: "11 de marzo", openings: "4 disponibles", held: "Apartado por 8:42", cta: "Revisar y reservar" },
        confirm: { title: "Confirmado", when: "Lun, 11 mar · 2:00 PM", cta: "Agregar al calendario" },
      },
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
      seeLivePage: "See a live page",
      createPageShort: "Create page",
      createPageLong: "Create your booking page",
      openMenu: "Open menu",
    },
    home: {
      backToHome: "← Back to home",
      signedInAs: "Signed in as",
      signedIn: "You're signed in",
      bookingPageReady: "Your booking page is ready",
      dashboardBody:
        "Manage availability, services, and incoming bookings from your dashboard.",
      goToDashboard: "Go to your dashboard →",
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
      },
    },
    auth: {
      languageSelector: "Login language",
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
      badge: "Live availability · 10-minute hold",
      title: "One link. No client accounts. No double bookings.",
      body: "Share a single page. Clients see live availability, get a 10-minute hold while they fill in their details, and reschedule themselves. They never create an account.",
      proofs: [
        "Live availability",
        "10-minute hold",
        "No client account",
      ],
      ctaPrimary: "Try a real booking →",
      ctaSecondary: "Create your page",
      fineprint: "No client account · Appointments, full days, and capacity-based registration.",
      previewCaption: "This is Dr. Maya Rivera's real public page. Touch it — it's interactive.",
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
      title: "Choose an example and complete the flow as a client.",
      body: "These pages are public and functional. Open one, check real availability, and verify the hold, confirmation, and self-service flow yourself.",
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
          proof: "Time-based court reservations with capacity and clear rules.",
          cta: "Book a court",
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
      ],
      note: "No sign-in required. All four pages use Haab's real public booking flow.",
    },
    socialProof: {
      badge: "Early-access product",
      earlyAccess: "The core public booking flow works today; the product is still expanding.",
      stats: [
        { value: "0", label: "Accounts a client needs to create" },
        { value: "10 min", label: "Soft hold while details are completed" },
        { value: "3", label: "Modes: appointments, full-day, and tickets" },
      ],
      heading: "Use cases you can manage today",
      customers: [
        { name: "Clinics & practices", detail: "Healthcare" },
        { name: "Courts & clubs", detail: "Spaces" },
        { name: "Advisors & consultants", detail: "Professional" },
        { name: "Event venues", detail: "Spaces" },
        { name: "Coworking & offices", detail: "Spaces" },
        { name: "Races & community events", detail: "Events" },
      ],
      footer:
        "Haab is in early access: booking, holds, confirmation, and self-service work today; more integrations and administration tools are still being built.",
    },
    problem: {
      eyebrow: "The reality today",
      title: "Booking gets messy when every change becomes a conversation.",
      body: "Sharing availability through messages, calendar screenshots, and manual updates works until two people want the same time or a client needs to reschedule. Haab turns that process into one public link with clear booking rules.",
      pains: [
        "Back-and-forth messages just to land one appointment.",
        "Double-bookings because two people grabbed the “same” open slot.",
        "Confirmations that never reach the client's calendar.",
        "Reschedules and cancellations that all land back on you.",
        "Class and event capacity you still count by hand.",
      ],
      closing: "Haab replaces that coordination with live availability and self-service.",
    },
    how: {
      eyebrow: "How it works",
      title: "Publish one page, then let clients handle the routine.",
      stepLabel: "Step",
      steps: [
        {
          title: "Add what you offer.",
          body: "Choose healthcare, spaces, professional services, or events. Then set your services, duration, capacity, price, and weekly availability.",
        },
        {
          title: "Share one link.",
          body: "You get a clean public booking page at your own address. Drop it in your bio, your emails, a QR code on the door. Clients book themselves.",
        },
        {
          title: "Keep changes out of your inbox.",
          body: "Clients choose live availability, receive a 10-minute hold, and confirm. Afterward, their private link lets them reschedule or cancel on their own.",
        },
      ],
      cta: "Create your booking page",
    },
    features: {
      eyebrow: "Why it feels different",
      title: "Five decisions that remove routine booking work.",
      items: [
        {
          title: "Zero accounts for your clients.",
          body: "They choose, enter their details, and confirm. No signup, password, or login is required.",
          tag: "Less friction",
        },
        {
          title: "Every selection gets a 10-minute soft hold.",
          body: "The countdown makes the remaining time clear, while server-side conflict protection rejects competing confirmations within Haab's booking flow.",
          tag: "Conflict protection",
        },
        {
          title: "Three modes on one page.",
          body: "Combine timed appointments, full-day reservations, and capacity-based registration without changing products.",
          tag: "Appointments, days, and tickets",
        },
        {
          title: "It speaks your industry's language.",
          body: "Patients, guests, clients, or attendees see terms and confirmations shaped around what they are booking.",
          tag: "Industry-specific language",
        },
        {
          title: "Clients manage their own changes.",
          body: "Every confirmation includes a private link to reschedule or cancel without an account or another message to you.",
          tag: "Private self-service",
        },
      ],
    },
    differentiators: {
      eyebrow: "What makes it different",
      title: "Concrete differences you can try today.",
      blocks: [
        {
          tag: "Booking holds",
          heading: "The slot stays protected while they finish.",
          body: "A 10-minute hold reserves the selection while the client enters their details. The countdown shows the remaining time, expired holds are released, and server checks protect the same availability again before confirmation.",
        },
        {
          tag: "No-login self-service",
          heading: "They can reschedule or cancel without creating an account.",
          body: "Every confirmation carries a private management link. Clients can return later to change the date or cancel; Haab updates the booking and recalculates availability.",
        },
      ],
    },
    industryLanguage: {
      eyebrow: "Shaped to your industry",
      title: "The same page, in your business's language.",
      body: "Pick your industry and everything re-labels itself: what gets booked, what your clients are called, and every confirmation. No generic-software feel.",
      verticals: [
        { label: "Healthcare", client: "Patients", booking: "Appointments" },
        { label: "Spaces", client: "Guests", booking: "Reservations" },
        { label: "Professional", client: "Clients", booking: "Sessions" },
        { label: "Events", client: "Attendees", booking: "Registrations" },
      ],
    },
    useCases: {
      eyebrow: "Use cases",
      title: "One page, shaped to your business.",
      body:
        "Select a workflow below to start with the right services, availability, and booking settings.",
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
        "Choose the workflow closest to your business. You can adjust its services and availability during setup.",
      cta: "Create your booking page",
    },
    mobile: {
      eyebrow: "Built phone-first",
      title: "Designed to complete a booking on a phone.",
      body: "Tap-friendly dates, readable time slots, visible confirmation actions, and a clear countdown. The same booking flow adapts from a small screen to a desktop.",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Questions, answered.",
      items: [
        {
          q: "Do my clients need an account?",
          a: "No. They pick a slot, enter their details, and they're booked. No signups, no passwords.",
        },
        {
          q: "How are double-bookings prevented?",
          a: "Within Haab, selecting a time creates a 10-minute hold. Bookings and holds are checked again on the server before confirmation, and conflicting writes are rejected.",
        },
        {
          q: "Can clients reschedule or cancel themselves?",
          a: "Yes — every booking includes a private management link to reschedule or cancel, with no login.",
        },
        {
          q: "Can I take ticket registrations for a class or event?",
          a: "Yes. Events support capacity-based registrations, and Haab counts confirmed and held spots. Payment processing is not included yet.",
        },
        {
          q: "Can I offer full-day bookings, not just appointments?",
          a: "Yes — appointments and full-day reservations live on the same page.",
        },
        {
          q: "Can bookings be added to a calendar?",
          a: "Yes. Every confirmation includes an ICS calendar file and a scannable QR code. Haab does not yet promise two-way external calendar sync.",
        },
        {
          q: "What is available today?",
          a: "Public pages, availability, holds, confirmations, event capacity, and self-service reschedule or cancel links are working now. Haab remains in early access.",
        },
        {
          q: "What does it cost?",
          a: "Haab is free during the current early-access period. Paid plans and limits have not been finalized.",
        },
      ],
    },
    testimonials: {
      eyebrow: "Available today",
      title: "What you can verify in the live examples.",
      items: [
        {
          quote: "A client completes a booking without signing up or creating a password.",
          name: "No-account booking",
          role: "Live product behavior",
        },
        {
          quote: "An active hold reduces availability before the booking is confirmed.",
          name: "10-minute soft hold",
          role: "Live product behavior",
        },
        {
          quote: "Every confirmation includes a private route to reschedule or cancel.",
          name: "Self-service management",
          role: "Live product behavior",
        },
      ],
      note: "These are verifiable product capabilities, not customer testimonials or performance metrics.",
    },
    pricing: {
      eyebrow: "Early access",
      title: "Use the core booking flow while we keep building.",
      body: "Haab is in early access. Public pages, holds, confirmations, capacity, and self-service work today. Pricing and some integrations are still being defined.",
      startFree: "Create an early-access page",
      viewPricing: "See a live page",
      features: [
        "One public booking page",
        "Booking holds and confirmations",
        "Calendar file and QR code",
        "Client self-service links",
      ],
    },
    finalCta: {
      title: "Give clients one link — and a way to manage their own booking.",
      body: "Create an early-access page for appointments, full-day reservations, or capacity-based events. Your clients do not need an account.",
      ctaPrimary: "Create your booking page",
      ctaSecondary: "See a live booking page →",
    },
    footer: {
      tagline: "Early-access booking pages with protected availability and no client accounts.",
      productHeading: "Product",
      product: {
        how: "How it works",
        features: "Features",
        useCases: "Use cases",
        seeLivePage: "See a live page",
      },
      companyHeading: "Company",
      company: {
        about: "About",
        contact: "Contact",
        pricing: "Early access",
      },
      legalHeading: "Legal",
      legal: {
        privacy: "Privacy",
        terms: "Terms",
      },
      copyright: "© 2026 Haab Calendar. Early-access booking software.",
      createLink: "Create your booking page →",
    },
    visuals: {
      weekdays: ["S", "M", "T", "W", "T", "F", "S"],
      serviceSetup: {
        steps: ["Service", "Hours", "Rules", "Publish"],
        serviceLabel: "Service",
        serviceValue: "Strategy consult",
        durationLabel: "Duration",
        durationValue: "45 minutes",
        capacityLabel: "Capacity",
        capacityValue: "1 client",
        modeLabel: "Mode",
        modeValue: "Appointments",
        readyToPublish: "Ready to publish",
        setupTime: "Core setup",
      },
      shareLink: {
        yourPage: "Your booking page",
        chips: ["Bio", "Email", "QR", "Website"],
      },
      automation: {
        confirmedAt: "Confirmed at 2:00 PM",
        cards: [
          ["Slot held", "Protected for 10 minutes"],
          ["Calendar file", "Ready for the client"],
          ["Self-service link", "Reschedule without inbox ping-pong"],
        ],
      },
      hold: {
        expires: "Hold expires in 8:42",
        protected: "Slot protected",
      },
      selfService: [
        ["Management link", "In every confirmation, no account"],
        ["Client reschedules", "Your calendar updates instantly"],
      ],
      useCaseBadge: "Bookable",
      useCaseLines: {
        healthcare: ["New patient · $120", "Follow-up · $60", "30 & 15 min"],
        spaces: ["Court · $40/hr", "Full-day venue", "Up to 100"],
        professional: ["Strategy · $200", "Quick consult · $90", "1 client"],
        events: ["Race · $590", "50 spots left", "Dated event"],
      },
      mobile: {
        calendar: { name: "Sarah Chen", service: "Marketing Consult", cta: "Pick a time" },
        slots: { date: "March 11", openings: "4 openings", held: "Held for 8:42", cta: "Review & book" },
        confirm: { title: "Confirmed", when: "Mon, Mar 11 · 2:00 PM", cta: "Add to calendar" },
      },
    },
  },
};

export type Dict = (typeof translations)["en"];

export function normalizeLandingLang(value: unknown): Lang {
  return value === "en" ? "en" : "es";
}
