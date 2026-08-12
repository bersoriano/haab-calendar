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
      badge: "Disponibilidad en vivo · Apartado de 10 minutos",
      title: "Un enlace. Sin cuentas para tus clientes. Sin reservas duplicadas.",
      body: "Comparte una sola página. Tus clientes ven disponibilidad real, reciben un apartado de 10 minutos mientras completan sus datos y reagendan solos. Nunca crean una cuenta.",
      proofs: [
        "Disponibilidad en vivo",
        "Apartado de 10 minutos",
        "Sin cuenta para el cliente",
      ],
      ctaPrimary: "Crear mi página →",
      ctaSecondary: "Verlo funcionar en 15 segundos",
      fineprint: "Gratis durante el acceso anticipado. Sin tarjeta.",
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
      body: "Seis páginas públicas funcionando ahora. Revisa disponibilidad, toma el apartado, confirma y luego reagenda tú mismo.",
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
      ],
      note: "No necesitas iniciar sesión. Las seis páginas usan el flujo público real de Haab.",
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
      title: "Publica una vez. Deja de contestar mensajes de reservas.",
      stepLabel: "Paso",
      steps: [
        {
          title: "Nombra tu página.",
          body: "Elige qué reservas. Servicios, horarios y precios llegan puestos: cambia lo que quieras.",
        },
        {
          title: "Comparte un enlace.",
          body: "Tu propia dirección, lista para tu bio, tus correos y un código QR en la puerta.",
        },
        {
          title: "Silencio.",
          body: "Tus clientes reservan, apartan, confirman y reagendan solos. Nada llega a tu bandeja.",
        },
      ],
      cta: "Crear mi página",
    },
    features: {
      eyebrow: "Por qué se siente diferente",
      title: "Cinco decisiones que borran el trabajo repetitivo.",
      items: [
        {
          title: "Tus clientes nunca se registran.",
          body: "Eligen, escriben sus datos, listo. Sin cuenta, sin contraseña, sin nada que recordar.",
          tag: "Menos fricción",
        },
        {
          title: "Cada selección se aparta 10 minutos.",
          body: "Una cuenta regresiva visible protege el horario. Dos personas van por el mismo lugar: el servidor confirma a una y rechaza a la otra.",
          tag: "Protección contra conflictos",
        },
        {
          title: "Citas, días completos y boletos.",
          body: "Una página hace las tres. Sin un segundo producto para tu evento o tu renta.",
          tag: "Tres modos, una página",
        },
        {
          title: "Habla como tu sector.",
          body: "Pacientes, huéspedes, clientes o asistentes: cada etiqueta y confirmación calza con lo que vendes.",
          tag: "Lenguaje específico",
        },
        {
          title: "Ellos arreglan sus cambios.",
          body: "Un enlace privado en cada confirmación reagenda o cancela. Sin ti.",
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
          a: "Nunca. Eligen un horario, escriben sus datos, listo. Sin registro, sin contraseña.",
        },
        {
          q: "¿Cómo se evitan las reservas duplicadas?",
          a: "Elegir un horario lo aparta 10 minutos. Al confirmar, el servidor vuelve a revisar reservas y apartados, y rechaza al perdedor de cualquier empate.",
        },
        {
          q: "¿Los clientes pueden reagendar o cancelar solos?",
          a: "Sí. Cada confirmación trae un enlace privado para reagendar o cancelar. Sin iniciar sesión y sin escribirte.",
        },
        {
          q: "¿Qué funciona hoy?",
          a: "Páginas públicas, disponibilidad en vivo, apartados, confirmaciones, cupo de eventos y enlaces de autoservicio. Haab está en acceso anticipado: pagos y sincronización con calendarios externos todavía no.",
        },
        {
          q: "¿Puedo aceptar registros para una clase o evento?",
          a: "Sí. Los eventos descuentan lugares confirmados y apartados de tu cupo. El cobro todavía no está incluido.",
        },
        {
          q: "¿Reservas de día completo, no solo citas?",
          a: "Sí. Citas, días completos y registros comparten una misma página.",
        },
        {
          q: "¿Las reservas se pueden agregar a un calendario?",
          a: "Sí. Cada confirmación incluye archivo de calendario y código QR. La sincronización bidireccional con calendarios externos aún no está disponible.",
        },
        {
          q: "¿Cuánto cuesta?",
          a: "Nada durante el acceso anticipado. Los planes de pago no están definidos.",
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
      title: "Un enlace. Después, silencio.",
      body: "Nombra tu página y compártela hoy. Tus clientes nunca crean una cuenta.",
      ctaPrimary: "Crear mi página →",
      ctaSecondary: "Verlo funcionar en 15 segundos",
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
      createLink: "Crear mi página →",
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
      badge: "Live availability · 10-minute hold",
      title: "One link. No client accounts. No double bookings.",
      body: "Share a single page. Clients see live availability, get a 10-minute hold while they fill in their details, and reschedule themselves. They never create an account.",
      proofs: [
        "Live availability",
        "10-minute hold",
        "No client account",
      ],
      ctaPrimary: "Create your page →",
      ctaSecondary: "See it working in 15 seconds",
      fineprint: "Free while in early access. No card.",
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
      body: "Six public pages, running right now. Check availability, take the hold, confirm, then reschedule yourself.",
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
      ],
      note: "No sign-in required. All six pages use Haab's real public booking flow.",
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
      title: "Publish once. Stop answering booking messages.",
      stepLabel: "Step",
      steps: [
        {
          title: "Name your page.",
          body: "Pick what you book. Your services, hours, and prices arrive pre-filled — change what you want.",
        },
        {
          title: "Share one link.",
          body: "Your own address, ready for your bio, your emails, a QR code on the door.",
        },
        {
          title: "Go quiet.",
          body: "Clients book, hold, confirm, and reschedule themselves. Nothing lands in your inbox.",
        },
      ],
      cta: "Create your page",
    },
    features: {
      eyebrow: "Why it feels different",
      title: "Five decisions that delete the busywork.",
      items: [
        {
          title: "Your clients never sign up.",
          body: "Pick, fill in, confirmed. No account, no password, nothing to remember.",
          tag: "Less friction",
        },
        {
          title: "Every pick is held for 10 minutes.",
          body: "A visible countdown protects the time. Two people reach for the same slot; the server confirms one and turns the other away.",
          tag: "Conflict protection",
        },
        {
          title: "Appointments, full days, and tickets.",
          body: "One page runs all three. No second product for your event or your rental.",
          tag: "Three modes, one page",
        },
        {
          title: "It speaks your industry.",
          body: "Patients, guests, clients, or attendees — every label and confirmation matches what you actually sell.",
          tag: "Industry-specific language",
        },
        {
          title: "They fix their own changes.",
          body: "A private link on every confirmation reschedules or cancels. Without you.",
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
          a: "Never. They pick a time, enter their details, done. No signup, no password.",
        },
        {
          q: "How are double-bookings prevented?",
          a: "Picking a time holds it for 10 minutes. The server re-checks bookings and holds at confirmation and rejects the loser of any race.",
        },
        {
          q: "Can clients reschedule or cancel themselves?",
          a: "Yes. Every confirmation carries a private link to reschedule or cancel. No login, no message to you.",
        },
        {
          q: "What works today?",
          a: "Public pages, live availability, holds, confirmations, event capacity, and self-service links. Haab is in early access — payments and external calendar sync are not in yet.",
        },
        {
          q: "Can I take registrations for a class or event?",
          a: "Yes. Events count confirmed and held spots against your capacity. Payment processing is not included yet.",
        },
        {
          q: "Full-day bookings, not just appointments?",
          a: "Yes. Appointments, full days, and registrations share one page.",
        },
        {
          q: "Can bookings be added to a calendar?",
          a: "Yes. Every confirmation includes a calendar file and a QR code. Two-way sync with external calendars is not available yet.",
        },
        {
          q: "What does it cost?",
          a: "Nothing during early access. Paid plans are not final.",
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
      title: "One link. Then silence.",
      body: "Name your page and share it today. Your clients never create an account.",
      ctaPrimary: "Create your page →",
      ctaSecondary: "See it working in 15 seconds",
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
      createLink: "Create your page →",
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
