export type Lang = "es" | "en";

export const translations = {
  es: {
    nav: {
      brand: "Haab Calendar",
      links: {
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
    hero: {
      badge: "Páginas de reservas para quienes odian el software de citas",
      title: "Deja de perseguir reservas. Manda un solo enlace.",
      body: "Haab Calendar te da una página de reservas limpia y compartible donde tus clientes eligen un horario realmente libre, lo apartan y confirman — con archivos de calendario, confirmaciones listas para recordatorios y reagendado autoservicio. Sin cuentas para tus clientes. Sin reservas duplicadas. Sin idas y vueltas.",
      ctaPrimary: "Crea tu página de reservas",
      ctaSecondary: "Ver una página de reservas en vivo →",
      fineprint: "Gratis en acceso anticipado · Sin tarjeta · Tu primer servicio toma unos 2 minutos.",
      chips: [
        "Sin inicios de sesión para clientes",
        "Citas, día completo y boletos",
        "Agregar al calendario integrado",
        "Enlace propio para tu negocio",
      ],
    },
    socialProof: {
      badge: "Nuevo · Acceso anticipado",
      earlyAccess: "Sé una de las primeras páginas de reservas en Haab.",
      stats: [
        { value: "10 min", label: "Apartado en cada reserva, sin choques" },
        { value: "0", label: "Reservas duplicadas, por diseño" },
        { value: "~2 min", label: "Para publicar tu primer servicio" },
      ],
      heading: "Hecho para estos negocios de servicios",
      customers: [
        { name: "Consultorios médicos", detail: "Salud" },
        { name: "Canchas y clubes", detail: "Espacios" },
        { name: "Asesores y consultores", detail: "Servicios pro" },
        { name: "Salones de eventos", detail: "Espacios" },
        { name: "Coworking y oficinas", detail: "Espacios" },
        { name: "Talleres y clases", detail: "Eventos" },
      ],
      footer:
        "Diseñado para la realidad desordenada de los equipos pequeños: llamadas, clientes que llegan sin cita, mala señal y gente que solo quiere un horario que les funcione.",
    },
    problem: {
      eyebrow: "La realidad de hoy",
      title: "Reservar no debería costarte el trabajo de un día en trámites.",
      body: "La mayoría de los profesionales agenda desde mensajes directos, un teléfono y un calendario compartido sostenido con esperanza. Los clientes preguntan «¿qué tienes el jueves?», les mandas captura de tu semana, eligen un horario que ya se ocupó, lo rehaces. Alguien duplica una reserva. Una ausencia te come una hora que no puedes recuperar.",
      pains: [
        "Quince mensajes de ida y vuelta para cerrar una sola cita.",
        "Reservas duplicadas porque dos personas tomaron el «mismo» horario libre.",
        "Una ausencia te come una hora que no puedes recuperar.",
        "Reagendados y cancelaciones que terminan todos en tus manos.",
        "Cupos de clases y eventos que sigues contando en una hoja de papel.",
      ],
      closing: "Haab Calendar cierra cada uno de esos huecos.",
    },
    how: {
      eyebrow: "Cómo funciona",
      title: "De cero a una página de reservas compartible en tres pasos.",
      stepLabel: "Paso",
      steps: [
        {
          title: "Agrega lo que ofreces.",
          body: "Elige una plantilla — consulta, renta de cancha, sesión de estrategia, salón de día completo, oficina por día — o empieza en blanco. Define duración, capacidad, precio y tu horario semanal. Listo en minutos.",
        },
        {
          title: "Comparte un solo enlace.",
          body: "Obtienes una página pública de reservas limpia con tu propia dirección. Ponla en tu bio, tus correos, un código QR en la puerta. Los clientes se agendan solos.",
        },
        {
          title: "Déjalo correr.",
          body: "Los clientes eligen un horario realmente libre, el sistema lo aparta mientras terminan y reciben un archivo para agregar al calendario más un enlace autoservicio para reagendar o cancelar. Tu calendario se llena solo.",
        },
      ],
      cta: "Crea tu página de reservas",
    },
    features: {
      eyebrow: "Funciones",
      title: "Todo lo que una página de reservas necesita — y nada de lo que no.",
      items: [
        {
          title: "Solo aparecen horarios realmente libres.",
          body: "La disponibilidad se calcula en vivo desde tu horario y tus reservas existentes, así que los clientes solo pueden elegir horarios que de verdad están libres.",
          tag: "Motor de disponibilidad en tiempo real",
        },
        {
          title: "Se acabaron las reservas duplicadas.",
          body: "En el instante en que un cliente elige un horario, se aparta 10 minutos con una cuenta regresiva visible. Dos personas no pueden tomar el mismo horario.",
          tag: "Apartado de reservas",
        },
        {
          title: "Reserva escribiéndolo.",
          body: "Los clientes pueden escribir «el próximo lunes a las 2pm» o «mañana en la mañana» y la página lo entiende.",
          tag: "Agendado en lenguaje natural",
        },
        {
          title: "Confirmaciones que no se olvidan.",
          body: "Cada reserva genera un archivo para agregar al calendario y un código QR para escanear directo al teléfono — para que aterrice en un calendario, no en una bandeja olvidada.",
          tag: "Exportar a calendario + QR",
        },
        {
          title: "Los clientes se administran solos.",
          body: "Cada reserva incluye un enlace privado para reagendar o cancelar — sin cuenta, sin inicio de sesión, sin mensajes para ti.",
          tag: "Autoservicio con token",
        },
        {
          title: "Citas o días completos.",
          body: "Vende horarios de 30 minutos o reservas de día completo — canchas, salones, oficinas — desde la misma página.",
          tag: "Modos de cita y día completo",
        },
        {
          title: "Vende boletos, no solo horarios.",
          body: "Para clases, talleres y eventos, define un cupo real y la página cuenta los lugares disponibles y deja de vender en cuanto se llena.",
          tag: "Boletos y cupo por evento",
        },
        {
          title: "Habla el idioma de tu sector, no el de un software genérico.",
          body: "Elige salud, espacios, servicios profesionales o eventos y toda la página se reescribe sola — pacientes, huéspedes, asistentes o clientes; reservas, registros o sesiones — para que se lea como hecha para tu negocio.",
          tag: "Copia adaptada a tu sector",
        },
      ],
    },
    differentiators: {
      eyebrow: "Lo que lo hace diferente",
      title: "Lo que un agendador genérico no hace.",
      blocks: [
        {
          tag: "Apartado de reservas",
          heading: "El horario es suyo en cuanto lo tocan.",
          body: "Un apartado de 10 minutos con cuenta regresiva en vivo bloquea el horario mientras el cliente ingresa sus datos. Verde a ámbar a rojo, un aviso de expiración y una liberación elegante si se va. Nadie más puede tomar un horario apartado. Los conflictos simplemente no pueden pasar.",
        },
        {
          tag: "Reservas en lenguaje natural",
          heading: "Reservan como piensan.",
          body: "«El próximo viernes.» «Mañana a las 3:30.» «15 de mayo en la mañana.» La página interpreta el lenguaje sencillo y lo convierte en un horario real y disponible — luego lo confirma para que no haya ambigüedad. Menos campos, reservas más rápidas, menos abandono.",
        },
        {
          tag: "Autoservicio sin cuenta",
          heading: "Reagendan y cancelan sin escribirte una sola vez.",
          body: "Cada confirmación trae un enlace privado de administración — sin cuenta, sin contraseña. El cliente reagenda o cancela él mismo y tu calendario se actualiza al instante. Tu bandeja de entrada deja de ser el centro de operaciones.",
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
          title: "Eventos — talleres, clases y reuniones",
          body: "Admisiones con boleto y cupo real más pases de día completo — la página lleva la cuenta de los lugares por ti.",
        },
      ],
      note: "¿Tu giro es otro? Empieza en blanco — toma dos minutos.",
      cta: "Crea tu página de reservas",
    },
    mobile: {
      eyebrow: "Hecho primero para el teléfono",
      title: "La mayoría de tus clientes reserva en el teléfono. Por eso lo construimos primero para el teléfono.",
      body: "Fechas de calendario cuadradas y cómodas para el pulgar. Un botón de confirmar que te sigue por la pantalla para que nunca lo busques. Horarios en una rejilla limpia de dos columnas. Una cuenta regresiva imposible de no ver. La página de reservas se siente como una app nativa, no como un sitio web encogido.",
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
          a: "Elegir un horario lo aparta 10 minutos con una cuenta regresiva en vivo. La disponibilidad se calcula en vivo, así los horarios ocupados o apartados nunca se muestran como libres.",
        },
        {
          q: "¿Los clientes pueden reagendar o cancelar solos?",
          a: "Sí — cada reserva incluye un enlace privado de administración para reagendar o cancelar, sin inicio de sesión.",
        },
        {
          q: "¿Puedo vender boletos para una clase o evento?",
          a: "Sí. Los eventos admiten admisiones con boleto y un cupo real — la página cuenta los lugares y deja de vender en cuanto se llena.",
        },
        {
          q: "¿Puedo vender reservas de día completo, no solo citas?",
          a: "Sí — las citas y las reservas de día completo viven en la misma página.",
        },
        {
          q: "¿Las reservas aterrizan en mi calendario?",
          a: "Cada confirmación incluye un archivo para agregar al calendario y un código QR escaneable.",
        },
        {
          q: "¿Cuánto toma la configuración?",
          a: "Tu primer servicio toma unos dos minutos.",
        },
        {
          q: "¿Cuánto cuesta?",
          a: "Puedes empezar sin tarjeta de crédito. Mantén simple tu primera página de reservas y mejora el plan cuando necesites más servicios, miembros de equipo o ubicaciones.",
        },
      ],
    },
    testimonials: {
      eyebrow: "Lo que cambia",
      title: "Lo que dejas de perseguir con Haab.",
      items: [
        {
          quote: "Las idas y vueltas de recepción caen prácticamente a cero.",
          name: "Consultorio médico",
          role: "Ejemplo de uso",
        },
        {
          quote: "Sin canchas duplicadas, incluso en horas pico.",
          name: "Club deportivo",
          role: "Ejemplo de uso",
        },
        {
          quote: "Los clientes se reagendan solos; tú solo te presentas.",
          name: "Asesor independiente",
          role: "Ejemplo de uso",
        },
      ],
      note: "Escenarios ilustrativos basados en el flujo del producto, no testimonios de clientes reales.",
    },
    pricing: {
      eyebrow: "Acceso anticipado",
      title: "Gratis mientras estamos en acceso anticipado.",
      body: "Publica tu página de reservas sin costo y sin tarjeta. Cuando lleguen los planes de pago, los usuarios de acceso anticipado se enteran primero — sin sorpresas, cancela cuando quieras.",
      startFree: "Empieza gratis",
      viewPricing: "Ver una página en vivo",
      features: [
        "Una página pública de reservas",
        "Apartados y confirmaciones de reservas",
        "Archivo de calendario y código QR",
        "Enlaces de autoservicio para clientes",
      ],
    },
    finalCta: {
      title: "Dale a tus clientes un solo enlace. Recupera tu calendario.",
      body: "Configura tu primer servicio en unos dos minutos — gratis, sin tarjeta de crédito.",
      ctaPrimary: "Crea tu página de reservas",
      ctaSecondary: "Ver una página de reservas en vivo →",
    },
    footer: {
      tagline: "Páginas de reservas que simplemente funcionan.",
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
        pricing: "Precios",
      },
      legalHeading: "Legal",
      legal: {
        privacy: "Privacidad",
        terms: "Términos",
      },
      copyright: "© 2026 Haab Calendar. Páginas de reservas que simplemente funcionan.",
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
        setupTime: "2 min de config.",
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
      natural: {
        typeATime: "Escribe un horario",
        example: "el próximo viernes a las 2pm",
        matched: "Coincide con un horario realmente libre",
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
        events: ["Boleto · $25", "Quedan 50 lugares", "Pase día completo"],
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
    hero: {
      badge: "Booking pages for people who hate booking software",
      title: "Stop chasing bookings. Send one link.",
      body: "Haab Calendar gives you a clean, shareable booking page where clients pick a real open slot, hold it, and confirm — with calendar files, reminder-ready confirmations, and self-service rescheduling. No accounts for your clients. No double-bookings. No back-and-forth.",
      ctaPrimary: "Create your booking page",
      ctaSecondary: "See a live booking page →",
      fineprint: "Free in early access · No credit card · Your first service takes about 2 minutes.",
      chips: [
        "No client logins",
        "Appointments, full-day & tickets",
        "Add-to-calendar built in",
        "Your own branded link",
      ],
    },
    socialProof: {
      badge: "New · Early access",
      earlyAccess: "Be one of the first booking pages on Haab.",
      stats: [
        { value: "10 min", label: "Hold on every booking, no clashes" },
        { value: "0", label: "Double-bookings, by design" },
        { value: "~2 min", label: "To publish your first service" },
      ],
      heading: "Built for these service businesses",
      customers: [
        { name: "Clinics & practices", detail: "Healthcare" },
        { name: "Courts & clubs", detail: "Spaces" },
        { name: "Advisors & consultants", detail: "Professional" },
        { name: "Event venues", detail: "Spaces" },
        { name: "Coworking & offices", detail: "Spaces" },
        { name: "Workshops & classes", detail: "Events" },
      ],
      footer:
        "Designed around the messy reality of small teams: calls, walk-ins, bad signal, and clients who just want a time that works.",
    },
    problem: {
      eyebrow: "The reality today",
      title: "Booking shouldn't cost you a job's worth of admin.",
      body: "Most providers run scheduling out of DMs, a phone, and a shared calendar held together by hope. Clients ask “what've you got Thursday?”, you screenshot your week, they pick a slot that's already gone, you redo it. Someone double-books. A no-show eats an hour you can't refill.",
      pains: [
        "Fifteen back-and-forth messages just to land one appointment.",
        "Double-bookings because two people grabbed the “same” open slot.",
        "One no-show eats an hour you can't refill.",
        "Reschedules and cancellations that all land back on you.",
        "Class and event spots you still count on a paper sign-up sheet.",
      ],
      closing: "Haab Calendar closes every one of those gaps.",
    },
    how: {
      eyebrow: "How it works",
      title: "From zero to a shareable booking page in three steps.",
      stepLabel: "Step",
      steps: [
        {
          title: "Add what you offer.",
          body: "Pick a template — consult, court rental, strategy session, full-day venue, day office — or start blank. Set duration, capacity, price, and your weekly hours. Done in minutes.",
        },
        {
          title: "Share one link.",
          body: "You get a clean public booking page at your own address. Drop it in your bio, your emails, a QR code on the door. Clients book themselves.",
        },
        {
          title: "Let it run.",
          body: "Clients pick a genuinely open slot, the system holds it while they finish, and they get an add-to-calendar file plus a self-service link to reschedule or cancel. Your calendar fills itself.",
        },
      ],
      cta: "Create your booking page",
    },
    features: {
      eyebrow: "Features",
      title: "Everything a booking page needs — and nothing it doesn't.",
      items: [
        {
          title: "Only real open slots show.",
          body: "Availability is computed live from your hours and existing bookings, so clients can only pick times that are actually free.",
          tag: "Real-time availability engine",
        },
        {
          title: "No more double-bookings.",
          body: "The instant a client selects a time, it's held for them for 10 minutes with a visible countdown. Two people can't grab the same slot.",
          tag: "Booking holds",
        },
        {
          title: "Book by typing it.",
          body: "Clients can type “next Monday at 2pm” or “tomorrow morning” and the page understands it.",
          tag: "Natural-language scheduling",
        },
        {
          title: "Confirmations that stick.",
          body: "Every booking produces an add-to-calendar file and a QR code to scan straight onto a phone — so it lands in a calendar, not a forgotten inbox.",
          tag: "Calendar export + QR",
        },
        {
          title: "Clients manage themselves.",
          body: "Each booking comes with a private link to reschedule or cancel — no account, no login, no message to you.",
          tag: "Token-based self-service",
        },
        {
          title: "Appointments or whole days.",
          body: "Sell 30-minute slots or full-day reservations — courts, venues, offices — from the same page.",
          tag: "Appointment & full-day modes",
        },
        {
          title: "Sell tickets, not just slots.",
          body: "For classes, workshops, and events, set a real capacity and the page tracks spots left — and stops selling the moment it's full.",
          tag: "Ticketed events & capacity",
        },
        {
          title: "It speaks your industry, not generic SaaS.",
          body: "Pick healthcare, spaces, professional services, or events and the whole page re-labels itself — patients, guests, attendees, or clients; reservations, registrations, or sessions — so it reads like it was built for your business.",
          tag: "Industry-aware copy",
        },
      ],
    },
    differentiators: {
      eyebrow: "What makes it different",
      title: "What a generic scheduler can't do.",
      blocks: [
        {
          tag: "Booking holds",
          heading: "The slot is theirs the moment they tap it.",
          body: "A 10-minute hold with a live countdown locks the time while the client enters their details. Green to amber to red, an expiry warning, and a graceful release if they walk away. No other booker can take a held slot. Conflicts simply can't happen.",
        },
        {
          tag: "Natural-language booking",
          heading: "They book the way they think.",
          body: "“Next Friday.” “Tomorrow at 3:30.” “May 15 morning.” The page parses plain language into a real, available slot — then confirms it back so there's no ambiguity. Fewer fields, faster bookings, less drop-off.",
        },
        {
          tag: "No-login self-service",
          heading: "They reschedule and cancel without ever messaging you.",
          body: "Every confirmation carries a private management link — no account, no password. Clients reschedule or cancel themselves and your calendar updates instantly. Your inbox stops being the control room for your schedule.",
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
          title: "Events — workshops, classes & gatherings",
          body: "Ticketed admissions with real capacity plus full-day passes — the page tracks spots left for you.",
        },
      ],
      note: "Different line of work? Start from blank — it takes two minutes.",
      cta: "Create your booking page",
    },
    mobile: {
      eyebrow: "Built phone-first",
      title: "Most of your clients book on a phone. So we built for the phone first.",
      body: "Square, thumb-friendly calendar dates. A confirm button that follows you up the screen so you never hunt for it. Time slots in a clean two-up grid. A countdown that's impossible to miss. The booking page feels like a native app, not a shrunk-down website.",
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
          a: "Selecting a slot holds it for 10 minutes with a live countdown. Availability is computed live, so taken and held times never show as open.",
        },
        {
          q: "Can clients reschedule or cancel themselves?",
          a: "Yes — every booking includes a private management link to reschedule or cancel, with no login.",
        },
        {
          q: "Can I sell tickets to a class or event?",
          a: "Yes. Events support ticketed admissions with a real capacity — the page counts spots and stops selling once it's full.",
        },
        {
          q: "Can I sell full-day bookings, not just appointments?",
          a: "Yes — appointments and full-day reservations live on the same page.",
        },
        {
          q: "Will bookings land in my calendar?",
          a: "Every confirmation includes an add-to-calendar file and a scannable QR code.",
        },
        {
          q: "How long does setup take?",
          a: "Your first service takes about two minutes.",
        },
        {
          q: "What does it cost?",
          a: "You can start without a credit card. Keep the first booking page simple, then upgrade when you need more services, team members, or locations.",
        },
      ],
    },
    testimonials: {
      eyebrow: "What changes",
      title: "What you stop chasing with Haab.",
      items: [
        {
          quote: "Front-desk back-and-forth drops to basically zero.",
          name: "Medical practice",
          role: "Example scenario",
        },
        {
          quote: "No double-booked courts, even at peak hours.",
          name: "Sports club",
          role: "Example scenario",
        },
        {
          quote: "Clients reschedule themselves; you just show up.",
          name: "Independent advisor",
          role: "Example scenario",
        },
      ],
      note: "Illustrative scenarios based on the product flow, not quotes from real customers.",
    },
    pricing: {
      eyebrow: "Early access",
      title: "Free while we're in early access.",
      body: "Publish your booking page at no cost, no card. When paid plans arrive, early-access users hear first — no surprises, cancel anytime.",
      startFree: "Start free",
      viewPricing: "See a live page",
      features: [
        "One public booking page",
        "Booking holds and confirmations",
        "Calendar file and QR code",
        "Client self-service links",
      ],
    },
    finalCta: {
      title: "Give your clients one link. Get your calendar back.",
      body: "Set up your first service in about two minutes — free, no credit card.",
      ctaPrimary: "Create your booking page",
      ctaSecondary: "See a live booking page →",
    },
    footer: {
      tagline: "Booking pages that just work.",
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
        pricing: "Pricing",
      },
      legalHeading: "Legal",
      legal: {
        privacy: "Privacy",
        terms: "Terms",
      },
      copyright: "© 2026 Haab Calendar. Booking pages that just work.",
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
        setupTime: "2 min setup",
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
      natural: {
        typeATime: "Type a time",
        example: "next Friday at 2pm",
        matched: "Matched to a real open slot",
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
        events: ["Ticket · $25", "50 spots left", "Full-day pass"],
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
