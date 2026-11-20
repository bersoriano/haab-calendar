export type Lang = "es" | "en";

export const translations = {
  es: {
    nav: {
      brand: "Haab Calendar",
      links: {
        examples: "Ejemplos",
        how: "Cómo funciona",
        features: "Funciones",
        useCases: "Usos",
        doctors: "Médicos",
        faq: "Preguntas",
        blog: "Blog",
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
      guestDraftTitle: "Borrador guardado en este dispositivo",
      guestDraftBody:
        "Aún no hay nada en línea. Crea una cuenta para publicar tu página y conservarla.",
      guestDraftPublish: "Crear cuenta y publicar",
      accountDraftBody:
        "Aún no hay nada en línea. Publica tu página para ponerla en línea y guardarla en tu cuenta.",
      accountDraftPublish: "Publicar mi página",
      accountDraftPublishing: "Publicando…",
      accountDraftPublishFailed: "No se pudo publicar tu página. Inténtalo de nuevo.",
      setupDraftBody: "Aún no hay nada en línea. Termina la configuración para publicar tu página.",
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
        "Usa tu cuenta de administrador para configurar servicios, disponibilidad, reservas y la página pública de reservas.",
      panelTitle: "Acceso para administradores",
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
      userExists: "Ya existe una cuenta con este correo electrónico. Inicia sesión o usa “¿Olvidaste tu contraseña?” para restablecerla.",
      signupDisabled: "La creación de cuentas no está disponible en este momento.",
      emailInvalid: "Ingresa un correo electrónico válido.",
      emailConfirmed: "Correo confirmado. Inicia sesión para continuar.",
      accountCreated:
        "Cuenta creada. Enviamos un enlace de confirmación a tu correo. Confírmalo y después inicia sesión aquí.",
      forgotPassword: "¿Olvidaste tu contraseña?",
      resetTitle: "Restablecer tu contraseña",
      resetBody:
        "Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.",
      resetSubmit: "Enviar enlace",
      resetSending: "Enviando enlace...",
      resetBackToSignIn: "← Volver a iniciar sesión",
      resetEmailRequired: "Escribe el correo de tu cuenta.",
      resetEmailInvalid: "Escribe una dirección de correo válida.",
      resetSent:
        "Si existe una cuenta con ese correo, enviamos un enlace para restablecer la contraseña. Revisa tu bandeja de entrada.",
      newPasswordTitle: "Elige una contraseña nueva",
      newPasswordBody:
        "Ya verificamos tu enlace. Escribe la contraseña que usarás de ahora en adelante.",
      newPassword: "Contraseña nueva",
      newPasswordSubmit: "Guardar contraseña",
      newPasswordSaving: "Guardando...",
      newPasswordUpdated: "Contraseña actualizada. Ya puedes iniciar sesión.",
      newPasswordNoSession:
        "Ese enlace expiró o ya se usó. Solicita uno nuevo para restablecer tu contraseña.",
      newPasswordFailed: "No se pudo actualizar la contraseña.",
      confirmationExpired:
        "El enlace de confirmación venció o ya fue utilizado. Intenta iniciar sesión; si no funciona, crea la cuenta de nuevo.",
    },
    // What search engines and link previews say about the landing page. The
    // title also leads the hero's H1 (`hero.kicker`), so the words a search
    // matched are the first words a visitor reads.
    seo: {
      title: "Página de reservas en línea para negocios",
      description:
        "Publica tu página de reservas en minutos. Tus clientes ven tus horarios en tiempo real y reservan sin crear cuenta. Ningún horario se reserva dos veces.",
      socialImageAlt:
        "Haab Calendar: un enlace, sin registrarse, sin reservas duplicadas. Una página de reservas con horarios en vivo y un apartado de 10 minutos.",
    },
    hero: {
      kicker: "Página de reservas en línea para negocios",
      titleLines: ["Un enlace.", "Sin registrarse.", "Sin reservas duplicadas."],
      title: "Un enlace. Sin registrarse. Sin reservas duplicadas.",
      body: "Tus clientes ven tu disponibilidad en tiempo real, el horario que eligen queda apartado diez minutos mientras llenan sus datos y reciben un enlace privado para reagendar. Nadie tiene que crear una cuenta y tú ya no confirmas citas a mano.",
      chips: ["Disponibilidad en vivo", "Apartado de 10 minutos", "Enlace privado para reagendar"],
      ctaPrimary: "Crear mi página",
      ctaSecondary: "Ver una página real",
      fineprint: "Sin instalar nada.",
      returningPrompt: "¿Ya tienes una página?",
      returningCta: "Inicia sesión",
      previewCaption: "Esta es la página real de la Dra. Maya Rivera. Pruébala, está en vivo.",
    },
    facts: [
      { value: "10 min", caption: "de apartado en cada horario mientras el cliente escribe" },
      { value: "0", caption: "cuentas o contraseñas de clientes que administrar" },
      { value: "{n}", caption: "páginas de demostración públicas funcionando ahora" },
      { value: "ES · EN", caption: "cada etiqueta y confirmación, en español y en inglés" },
    ],
    startDialog: {
      eyebrow: "Toma unos 20 segundos",
      title: "Aparta tu enlace.",
      stepVertical: "¿Qué reservas?",
      stepName: "Nombra tu página",
      namePlaceholder: "Consultorio Rivera",
      submit: "Quiero este enlace →",
      submitDisabled: "Elige qué reservas",
      fineprint: "No necesitas tarjeta de crédito. Tus clientes no tienen que registrarse.",
      close: "Cerrar",
    },
    demoDialog: {
      title: "Haz una reserva tú mismo. Toma 15 segundos.",
      steps: ["Elige un servicio", "Elige un horario", "Mira cómo corre el apartado de 10 minutos"],
      frameTitle: "Página pública de reservas de la Dra. Maya Rivera",
      disclaimer: "Es una página real con un apartado real. Sin cuenta y sin instalar nada.",
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
      takenNote: "Alguien acaba de reservar un horario y ya no aparece en la lista.",
      holdLabel: "Apartado de la reserva",
      holdIdle: "Elige un horario para apartarlo",
      holdHelper: "El horario queda protegido mientras el cliente completa sus datos.",
      holdExpired: "El apartado venció",
      holdExpiredHelper: "El horario quedó libre otra vez para todos.",
      confirmCta: "Confirmar reserva",
      noAccountNote: "Sin crear cuenta",
      restart: "Repetir la demo",
    },
    liveExamples: {
      eyebrow: "Páginas de demostración en vivo",
      title: "Abre una y resérvala como lo haría un cliente.",
      body: "{n} páginas públicas que puedes usar ahora mismo. Revisa la disponibilidad, aparta un horario, confirma y luego prueba reagendar.",
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
          proof: "Una cancha techada que se renta por hora. Cuando alguien reserva un horario, nadie más puede tomarlo.",
          cta: "Reservar la cancha",
        },
        {
          vertical: "Servicios profesionales",
          title: "Northstar Strategy",
          proof: "Sesiones de consultoría con confirmación por correo y un enlace privado para administrarlas.",
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
          proof: "Limpiezas y urgencias dentales, con hora de comida y un solo consultorio.",
          cta: "Agendar una limpieza",
        },
        {
          vertical: "Veterinaria",
          title: "Clínica Veterinaria Patitas",
          proof: "Consultas, vacunas y limpieza dental para mascotas, con precios a la vista.",
          cta: "Agendar una consulta",
        },
        {
          vertical: "Estética",
          title: "Copperline Hair Studio",
          proof: "Corte, color y peinado en una sola silla. Cada cita ocupa su propio horario.",
          cta: "Reservar una silla",
        },
        {
          vertical: "Taller mecánico",
          title: "Northgate Auto Service",
          proof: "Cambio de aceite, frenos y llantas, con un solo lugar en el taller y un auto por turno.",
          cta: "Agendar un servicio",
        },
        {
          vertical: "Entrenamiento de golf",
          title: "Fairway Lab Golf",
          proof: "Clases de golf individuales por la mañana, con precio según la duración.",
          cta: "Reservar una clase",
        },
        {
          vertical: "Restaurante",
          title: "Casa Mirador",
          proof: "Doce mesas por turno. Cada reservación ocupa una mesa, no el horario completo.",
          cta: "Reservar una mesa",
        },
        {
          vertical: "Tours guiados",
          title: "Ruta Cenote Tours",
          proof: "Tours por México con salidas fechadas, cupo por grupo y precio por persona.",
          cta: "Apartar un lugar",
        },
        {
          vertical: "Bodas",
          title: "Boda de Valeria & Diego",
          proof: "Solo por invitación: un enlace por familia, acompañantes, menú, mesas y registro con QR en la entrada.",
          cta: "Abrir una invitación",
        },
      ],
      seeAll: "Ver las {n} demos →",
      note: "No necesitas iniciar sesión. Las {n} páginas usan el mismo flujo de reservas que verían tus clientes.",
    },
    gallery: {
      eyebrow: "Todas las demos",
      title: "Cada página de ejemplo, en vivo.",
      body: "{n} negocios distintos sobre el mismo motor de reservas. Abre cualquiera y resérvala como lo haría un cliente.",
      back: "← Volver al inicio",
      note: "Ninguna pide cuenta. Todas usan el mismo flujo de reservas que verían tus clientes.",
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
          title: "Y listo.",
          body: "Tus clientes reservan y reagendan solos. Tú solo ves la cita en tu calendario.",
        },
      ],
      cta: "Crear mi página",
      visual: {
        urlPrefix: "haabcalendar.com/",
        slug: "tu-nombre",
        chips: ["Servicios", "Horarios", "Precios"],
        share: ["Tu bio", "Tus correos", "QR en la puerta"],
        eventDay: "MAR",
        eventDate: "29",
        eventTitle: "Consulta para pacientes nuevos",
        eventMeta: "9:00 – 9:30 · Reservado por el cliente",
        added: "Se agrega a tu calendario, sin mensajes de ida y vuelta",
      },
    },
    demoVideo: {
      eyebrow: "Míralo en acción",
      title: "Un minuto. Una reserva, de principio a fin.",
      body: "Tu cliente elige un servicio, escoge un horario libre y reserva sin crear una cuenta. Es el flujo real de Haab en una página de demostración con un paciente ficticio.",
      videoLabel: "Demo de Haab Calendar: así reserva un cliente",
      note: "Narrado en inglés, con subtítulos en español e inglés.",
      download: "Descargar el video (MP4)",
    },
    features: {
      eyebrow: "Lo que la hace diferente",
      title: "Una sola página que se adapta a tu forma de trabajar.",
      modes: [
        { label: "Hora de consultoría", pill: "Cita" },
        { label: "Salón para un sábado", pill: "Día completo" },
        { label: "Cuarenta lugares en una clase", pill: "Boletos" },
      ],
      words: ["Pacientes", "Invitados", "Clientes", "Asistentes", "Comensales"],
      wordsExample: "“Patient” · “Paciente”",
      selfService: {
        lock: "Recordatorio por correo · enlace privado",
        when: "mar 29 sep · 9:00",
        reschedule: "Reagendar",
        cancel: "Cancelar",
      },
      items: [
        {
          title: "Citas, días completos y boletos en una página.",
          body: "Una hora de consultoría, un salón para el sábado y cuarenta lugares en una clase viven en la misma página, con el mismo enlace. No necesitas otra herramienta para tus eventos.",
          tag: "Tres modos, una página",
        },
        {
          title: "Habla como tu negocio.",
          body: "Pacientes, invitados, clientes, asistentes o comensales: cada etiqueta, confirmación y mensaje de error usa la palabra que le queda a tu negocio, en español o en inglés.",
          tag: "Lenguaje específico",
        },
        {
          title: "Recordatorios que permiten actuar.",
          body: "Envía un recordatorio por correo 24 horas antes de la cita y, si quieres, otro más cerca de la hora. Cada uno incluye un enlace privado para reagendar o cancelar. Tú eliges cuándo enviarlos o los desactivas.",
          tag: "Recordatorios y autoservicio",
        },
      ],
    },
    featureList: {
      eyebrow: "Funciones",
      title: "Todo lo que hace tu página de reservas.",
      body: "Lo más importante de Haab Calendar, en un solo lugar.",
      items: [
        {
          title: "Disponibilidad en tiempo real",
          body: "Tus clientes solo ven horarios libres. El horario que eligen queda apartado diez minutos mientras llenan sus datos, y nadie puede reservar la misma hora dos veces.",
        },
        {
          title: "Reservar sin crear cuenta",
          body: "Nadie se registra ni recuerda contraseñas. Cada reserva trae un enlace privado para reagendar o cancelar sin escribirte.",
        },
        {
          title: "Confirmaciones y recordatorios",
          body: "Cada confirmación llega por correo con un archivo de calendario y un código QR. Los recordatorios salen 24 horas antes, con un segundo aviso opcional, en el idioma del cliente.",
        },
        {
          title: "Citas, días completos y eventos",
          body: "Consultas por minuto, rentas por día y registros con cupo conviven en una página. Una clase se cierra sola cuando se llena.",
        },
        {
          title: "Invitaciones con confirmación",
          body: "Para bodas y eventos privados: lista de invitados, fecha límite, preguntas propias, mesas asignadas y envío por WhatsApp o correo. En la puerta, registra la entrada con QR, incluso sin conexión.",
        },
        {
          title: "Depósitos bancarios",
          body: "Pide un depósito en los servicios que elijas. El cliente sube su comprobante antes de reservar y tú confirmas el pago al revisar tu cuenta.",
        },
        {
          title: "Sincronización con Google Calendar",
          body: "Las reservas confirmadas aparecen en tu calendario y lo que ya tienes ahí bloquea esos horarios. Los datos de tus clientes se quedan en Haab.",
        },
        {
          title: "Español e inglés",
          body: "Toda la página, las confirmaciones y los correos están en los dos idiomas, con la palabra de tu negocio: pacientes, invitados, clientes o comensales.",
        },
        {
          title: "Con el estilo de tu negocio",
          body: "Elige entre seis temas para tu página pública y cámbialo cuando quieras desde tu panel, sin tocar código.",
        },
      ],
    },
    useCases: {
      eyebrow: "Casos de uso",
      title: "Elige qué reservas. Tu página ya viene configurada.",
      body:
        "Servicios, horarios y reglas ya vienen listos para tu giro. Cambia lo que quieras.",
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
          body: "Registros únicos o recurrentes con fecha, lugar, precio y cupo real. La página lleva la cuenta de los lugares disponibles por ti.",
        },
      ],
      note:
        "Elige el más parecido. Todo se puede cambiar durante la configuración.",
      cta: "Crear mi página",
      healthBadge: "Nuestro sector principal",
      healthLanguage: "Tus pacientes leen “pacientes”, no “clientes”.",
      prefilled: "Precargado para ti",
      addOwn: "+ Agrega los tuyos · Editable",
      startShort: "Empezar →",
    },
    googleIntegration: {
      eyebrow: "Google Calendar",
      title: "Tus reservas, en el calendario que ya usas.",
      purpose:
        "Haab Calendar es software de reservas para negocios pequeños. Publicas una página de reservas, tus clientes reservan en ella sin crear una cuenta, y las reservas confirmadas pueden aparecer en tu propio Google Calendar.",
      items: [
        {
          title: "Conectar es opcional.",
          body: "No se solicita nada a Google hasta que conectas una cuenta, y puedes desconectarla cuando quieras desde tu configuración, lo que revoca el acceso de inmediato.",
        },
        {
          title: "Las reservas salen; los tiempos ocupados regresan.",
          body: "Haab escribe un evento por cada reserva confirmada y lee los tiempos ocupados de los calendarios que elijas, para que un compromiso que ya tienes bloquee ese horario en tu página.",
        },
        {
          title: "Los datos de tus clientes nunca salen de Haab.",
          body: "Los eventos llevan el nombre del servicio y nada más. El nombre, correo, teléfono y notas de un cliente nunca se escriben en Google. Los calendarios se suelen compartir, y Haab no puede controlar quién ve el tuyo.",
        },
      ],
      visual: {
        calendar: "Tu Google Calendar",
        day: "Mar 29",
        hours: ["8:00", "9:00", "10:00", "11:00"],
        busy: "Ocupado: ya está en tu calendario",
        event: "Consulta para pacientes nuevos",
        eventNote: "Solo el nombre del servicio",
        stays: "Se queda en Haab",
        fields: ["Nombre del cliente", "Correo", "Teléfono", "Notas"],
      },
      privacyLink: "Cómo tratamos los datos de Google →",
    },
    trust: {
      eyebrow: "Confianza y privacidad",
      title: "Hecho para un calendario del que depende tu negocio.",
      intro: "Y más cuando es un consultorio y quienes reservan son pacientes.",
      items: [
        {
          title: "Sin reservas duplicadas, ni al mismo segundo.",
          body: "Cada apartado se registra en nuestro servidor, no en el navegador de alguien. Si dos personas van por el mismo horario, una se lo queda y a la otra se le avisa de inmediato.",
        },
        {
          title: "Sin cuentas, no hay contraseñas que se filtren.",
          body: "Tus clientes nunca se registran, así que no hay contraseñas que guardar, filtrar ni restablecer. Entran a su reserva con un enlace privado que guardamos cifrado, nunca en texto plano.",
        },
        {
          title: "Nada se publica hasta que tú lo decidas.",
          body: "Tu página es privada hasta que la publicas, y puedes quitarla desde tu panel cuando quieras sin perder tu trabajo.",
        },
      ],
    },
    featuredPost: {
      eyebrow: "Del blog",
      title: "Deja de contestar “¿Cuándo tienes un espacio?”",
      body: "Una cita puede llevar cuatro o cinco mensajes, y te siguen hasta la casa. Esto es lo que de verdad cuesta ese ir y venir, y cómo lo reemplaza un solo enlace con un apartado de 10 minutos en cada horario.",
      cta: "Leer el artículo",
      chat: {
        time: "9:40 de la noche",
        asks: "¡Hola! ¿Tienes algo para el jueves?",
        offer: "Puedo a las 3:00.",
        counter: "A las 3 no puedo. ¿Algo en la mañana?",
      },
    },
    faq: {
      eyebrow: "Preguntas",
      title: "Preguntas frecuentes",
      aside: "¿Todavía con dudas? Reserva en una de las páginas de demostración como lo haría un cliente.",
      items: [
        {
          q: "¿Qué incluye?",
          a: "Páginas públicas de reservas, disponibilidad en tiempo real, apartados de diez minutos, confirmaciones por correo, cupo para eventos, sincronización con Google Calendar y un enlace privado en cada reserva para que tus clientes la administren solos.",
        },
        {
          q: "¿Puedo aceptar registros para una clase o evento?",
          a: "Sí. Los lugares confirmados y apartados se descuentan de tu cupo, así que la clase se cierra sola cuando se llena.",
        },
        {
          q: "¿Reservas de día completo, no solo citas?",
          a: "Sí. Citas, días completos y registros comparten una misma página.",
        },
        {
          q: "¿Las reservas se pueden agregar a un calendario?",
          a: "Sí. Cada confirmación trae un archivo de calendario y un código QR privado para abrir o verificar la reserva.",
        },
      ],
    },
    finalCta: {
      title: "Comparte un enlace. Deja que reserven solos.",
      titleLines: ["Comparte un enlace.", "Deja que reserven solos."],
      body: "Arma tu página y manda el enlace hoy mismo.",
      ownerBody: "Tu página ya está en línea. Comparte el enlace y deja que trabaje por ti.",
      ctaPrimary: "Crear mi página",
      fineprint: "No necesitas tarjeta de crédito.",
    },
    footer: {
      tagline: "Un enlace de reservas para tu negocio. Sin reservas duplicadas y sin cuentas para tus clientes.",
      getStarted: "Empieza",
      productHeading: "Producto",
      product: {
        how: "Cómo funciona",
        features: "Funciones",
        useCases: "Casos de uso",
        seeLivePage: "Verlo en vivo",
      },
      companyHeading: "Empresa",
      company: {
        blog: "Blog",
        privacy: "Aviso de privacidad",
        terms: "Términos de servicio",
      },
      copyright: "Haab Calendar. Reservas en línea para negocios. Desarrollado por",
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
        doctors: "For doctors",
        faq: "FAQ",
        blog: "Blog",
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
      guestDraftTitle: "Draft saved on this device",
      guestDraftBody:
        "Nothing is online yet. Create an account to publish your page and keep it.",
      guestDraftPublish: "Create account to publish",
      accountDraftBody:
        "Nothing is online yet. Publish your page to put it online and keep it in your account.",
      accountDraftPublish: "Publish my page",
      accountDraftPublishing: "Publishing…",
      accountDraftPublishFailed: "Could not publish your page. Please try again.",
      setupDraftBody: "Nothing is online yet. Finish setup to publish your page.",
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
      userExists: "An account already exists for this email address. Sign in, or use “Forgot your password?” to reset your password.",
      signupDisabled: "Account creation is not available right now.",
      emailInvalid: "Enter a valid email address.",
      emailConfirmed: "Email confirmed. Sign in to continue.",
      accountCreated:
        "Account created. We sent a confirmation link to your email. Confirm it, then sign in here.",
      forgotPassword: "Forgot your password?",
      resetTitle: "Reset your password",
      resetBody:
        "Enter your account email and we will send you a link to choose a new password.",
      resetSubmit: "Send link",
      resetSending: "Sending link...",
      resetBackToSignIn: "← Back to sign in",
      resetEmailRequired: "Enter your account email.",
      resetEmailInvalid: "Enter a valid email address.",
      // Identical whether or not the account exists: a different answer would
      // turn this form into a way to find out who holds an account here.
      resetSent:
        "If an account exists for that email, we sent a link to reset the password. Check your inbox.",
      newPasswordTitle: "Choose a new password",
      newPasswordBody:
        "Your link is verified. Enter the password you will use from now on.",
      newPassword: "New password",
      newPasswordSubmit: "Save password",
      newPasswordSaving: "Saving...",
      newPasswordUpdated: "Password updated. You can sign in now.",
      newPasswordNoSession:
        "That link is expired or has already been used. Request a new one to reset your password.",
      newPasswordFailed: "Could not update the password.",
      confirmationExpired:
        "That confirmation link is expired or has already been used. Try signing in below; if it does not work, create the account again.",
    },
    // What search engines and link previews say about the landing page. The
    // title also leads the hero's H1 (`hero.kicker`), so the words a search
    // matched are the first words a visitor reads.
    seo: {
      title: "Online booking page for small businesses",
      description:
        "Publish an online booking page in minutes. Clients see real-time availability and book without an account, and no time ever gets booked twice.",
      socialImageAlt:
        "Haab Calendar: one link, no sign-up, no double bookings. A booking page with live times and a 10-minute hold.",
    },
    hero: {
      kicker: "Online booking page for small businesses",
      titleLines: ["One link.", "No sign-up.", "No double bookings."],
      title: "One link. No sign-up. No double bookings.",
      body: "Clients see your real-time availability, the time they pick is held for ten minutes while they fill in their details, and they get a private link to reschedule. Nobody has to make an account, and you never confirm a time by hand.",
      chips: ["Live availability", "10-minute hold", "Private reschedule link"],
      ctaPrimary: "Create your page",
      ctaSecondary: "See a real page",
      fineprint: "Nothing to install.",
      returningPrompt: "Already have a page?",
      returningCta: "Log in",
      previewCaption: "This is Dr. Maya Rivera's actual booking page. Go ahead and try it.",
    },
    facts: [
      { value: "10 min", caption: "hold on every slot while a client types" },
      { value: "0", caption: "client accounts or passwords to manage" },
      { value: "{n}", caption: "public demo pages running right now" },
      { value: "EN · ES", caption: "every label and confirmation, in English and Spanish" },
    ],
    startDialog: {
      eyebrow: "Takes about 20 seconds",
      title: "Claim your booking link.",
      stepVertical: "What do you book?",
      stepName: "Name your page",
      namePlaceholder: "Rivera Family Medicine",
      submit: "Claim this link →",
      submitDisabled: "Pick what you book",
      fineprint: "No credit card needed. Your clients never have to sign up.",
      close: "Close",
    },
    demoDialog: {
      title: "Try booking it yourself. It takes 15 seconds.",
      steps: ["Pick a service", "Pick a time", "Watch the 10-minute hold start"],
      frameTitle: "Live public booking page for Dr. Maya Rivera",
      disclaimer: "This is a real page with a real hold. No account, nothing to install.",
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
      takenNote: "Someone just booked a time, so it's gone from the list.",
      holdLabel: "Booking hold",
      holdIdle: "Pick a time to hold it",
      holdHelper: "The time stays protected while the client fills in their details.",
      holdExpired: "Hold expired",
      holdExpiredHelper: "The time is open again for everyone.",
      confirmCta: "Confirm booking",
      noAccountNote: "No account needed",
      restart: "Run the demo again",
    },
    liveExamples: {
      eyebrow: "Live demo pages",
      title: "Open one and book it like a client would.",
      body: "{n} public pages you can use right now. Check availability, hold a time, confirm, then try rescheduling.",
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
          proof: "One indoor court rented by the hour. Once someone books a time, nobody else can take it.",
          cta: "Book the court",
        },
        {
          vertical: "Professional services",
          title: "Northstar Strategy",
          proof: "Consulting sessions with an email confirmation and a private link to manage them.",
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
          proof: "Pet check-ups, vaccines, and dental cleanings, with prices shown up front.",
          cta: "Book a check-up",
        },
        {
          vertical: "Hair salon",
          title: "Copperline Hair Studio",
          proof: "Cut, color, and blowout in one chair. Each booking gets its own time slot.",
          cta: "Book the chair",
        },
        {
          vertical: "Auto service",
          title: "Northgate Auto Service",
          proof: "Oil changes, brakes, and tires, with one service bay and one car per slot.",
          cta: "Book the bay",
        },
        {
          vertical: "Golf coaching",
          title: "Fairway Lab Golf",
          proof: "One-on-one golf lessons in the morning, priced by session length.",
          cta: "Book a lesson",
        },
        {
          vertical: "Restaurant",
          title: "Casa Mirador",
          proof: "Twelve tables per seating. Each reservation takes one table, not the whole hour.",
          cta: "Reserve a table",
        },
        {
          vertical: "Guided tours",
          title: "Ruta Cenote Tours",
          proof: "Tours around Mexico with dated departures, small-group caps, and per-person prices.",
          cta: "Save a spot",
        },
        {
          vertical: "Weddings",
          title: "Boda de Valeria & Diego",
          proof: "Invitation only: one link per household, plus-ones, menu choices, tables and QR check-in at the door.",
          cta: "Open an invitation",
        },
      ],
      seeAll: "See all {n} demos →",
      note: "No sign-in required. All {n} pages use the same booking flow your clients would see.",
    },
    gallery: {
      eyebrow: "Every demo",
      title: "Every example page, live.",
      body: "{n} different businesses on one booking engine. Open any of them and book it the way a client would.",
      back: "← Back to home",
      note: "None of them need an account. All of them use the same booking flow your clients would see.",
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
          title: "Let it run.",
          body: "Clients book and reschedule on their own. You see it on your calendar.",
        },
      ],
      cta: "Create your page",
      visual: {
        urlPrefix: "haabcalendar.com/",
        slug: "your-name",
        chips: ["Services", "Hours", "Prices"],
        share: ["Your bio", "Your emails", "Door QR code"],
        eventDay: "TUE",
        eventDate: "29",
        eventTitle: "New patient consultation",
        eventMeta: "9:00 – 9:30 AM · Booked by the client",
        added: "Added to your calendar, no back-and-forth",
      },
    },
    demoVideo: {
      eyebrow: "See it in action",
      title: "One minute. One booking, start to finish.",
      body: "Your client picks a service, chooses an open time, and books without creating an account. It's Haab's real booking flow on a demo page with a fictional patient.",
      videoLabel: "Haab Calendar demo: how a client books",
      note: "Narrated in English, with English and Spanish captions.",
      download: "Download the video (MP4)",
    },
    features: {
      eyebrow: "What makes it different",
      title: "One page that fits the way you work.",
      modes: [
        { label: "Consulting hour", pill: "Appointment" },
        { label: "Venue for a Saturday", pill: "Full day" },
        { label: "Forty seats at a class", pill: "Tickets" },
      ],
      words: ["Patients", "Guests", "Clients", "Attendees", "Diners"],
      wordsExample: "“Patient” · “Paciente”",
      selfService: {
        lock: "Email reminder · private link",
        when: "Tue, Sep 29 · 9:00 AM",
        reschedule: "Reschedule",
        cancel: "Cancel",
      },
      items: [
        {
          title: "Appointments, full days, and tickets on one page.",
          body: "A consulting hour, a venue for a Saturday, and forty seats at a class all live on the same page, under the same link. You don't need a separate tool for events.",
          tag: "Three modes, one page",
        },
        {
          title: "Uses the words your business uses.",
          body: "Patients, guests, clients, attendees, or diners: every label, confirmation, and error message uses the word that fits your business, in English or Spanish.",
          tag: "Industry-specific language",
        },
        {
          title: "Reminders clients can act on.",
          body: "Send an email reminder 24 hours before an appointment, with an optional second reminder closer to the time. Each includes a private link to reschedule or cancel. Set the timing or turn reminders off.",
          tag: "Reminders and self-service",
        },
      ],
    },
    featureList: {
      eyebrow: "Features",
      title: "Everything your booking page does.",
      body: "The most important parts of Haab Calendar, in one place.",
      items: [
        {
          title: "Real-time availability",
          body: "Clients only see open times. The time they pick is held for ten minutes while they fill in their details, and no time can be booked twice.",
        },
        {
          title: "Booking without an account",
          body: "Nobody signs up or remembers a password. Every booking comes with a private link to reschedule or cancel without messaging you.",
        },
        {
          title: "Confirmations and reminders",
          body: "Every confirmation arrives by email with a calendar file and a QR code. Reminders go out 24 hours before, with an optional second one, in the client's language.",
        },
        {
          title: "Appointments, full days, and events",
          body: "Timed appointments, full-day rentals, and registrations with a headcount share one page. A class closes on its own once it's full.",
        },
        {
          title: "Invitation-only RSVPs",
          body: "For weddings and private events: a guest list, an RSVP deadline, your own questions, table seating, and invitations sent by WhatsApp or email. At the door, check guests in by QR, even offline.",
        },
        {
          title: "Bank deposits",
          body: "Ask for a deposit on the services you choose. Clients upload their receipt before booking, and you confirm payment after checking your bank account.",
        },
        {
          title: "Google Calendar sync",
          body: "Confirmed bookings show up on your calendar, and anything already there blocks that time on your page. Your clients' details stay in Haab.",
        },
        {
          title: "English and Spanish",
          body: "The whole page, every confirmation, and every email come in both languages, using your business's word: patients, guests, clients, or diners.",
        },
        {
          title: "A look that fits your business",
          body: "Pick one of six themes for your public page and change it anytime from your dashboard. No code needed.",
        },
      ],
    },
    useCases: {
      eyebrow: "Use cases",
      title: "Pick what you book. Your page comes set up.",
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
          body: "One-time or recurring registrations with a date, location, price, and a real headcount. The page keeps track of open spots for you.",
        },
      ],
      note:
        "Pick the closest match. You can change everything during setup.",
      cta: "Create your page",
      healthBadge: "Our core industry",
      healthLanguage: "Patients see “patients,” not “customers.”",
      prefilled: "Pre-filled for you",
      addOwn: "+ Add your own · Editable",
      startShort: "Start →",
    },
    googleIntegration: {
      eyebrow: "Google Calendar",
      title: "Your bookings, on the calendar you already keep.",
      purpose:
        "Haab Calendar is booking software for small businesses. You publish a booking page, your clients book on it without creating an account, and confirmed bookings can appear on your own Google Calendar.",
      items: [
        {
          title: "Connecting is optional.",
          body: "Nothing is requested from Google until you connect an account, and you can disconnect at any time from your settings, which revokes the access immediately.",
        },
        {
          title: "Bookings go out; busy times come back.",
          body: "Haab writes one event per confirmed booking and reads busy times from the calendars you pick, so anything already on your calendar blocks that time on your page.",
        },
        {
          title: "Your clients' details never leave Haab.",
          body: "Events carry the service name and nothing else. A client's name, email, phone, and notes are never written to Google. Calendars often get shared, and Haab can't control who sees yours.",
        },
      ],
      visual: {
        calendar: "Your Google Calendar",
        day: "Tue 29",
        hours: ["8 AM", "9 AM", "10 AM", "11 AM"],
        busy: "Busy: already on your calendar",
        event: "New patient consultation",
        eventNote: "Service name only",
        stays: "Stays in Haab",
        fields: ["Client name", "Email", "Phone", "Notes"],
      },
      privacyLink: "How we handle Google data →",
    },
    trust: {
      eyebrow: "Trust & privacy",
      title: "Built for a calendar your business depends on.",
      intro: "That matters even more when it's a clinic and the people booking are patients.",
      items: [
        {
          title: "No double bookings, even at the same second.",
          body: "Every hold is placed on our server, not in someone's browser. If two people go for the same time, one gets it and the other is told right away.",
        },
        {
          title: "No client accounts, no passwords to leak.",
          body: "Your clients never sign up, so there's no password to store, leak, or reset. They get to their booking through a private link, which we store hashed, never in plain text.",
        },
        {
          title: "Nothing goes live until you say so.",
          body: "Your page stays private until you publish it, and you can take it down from your dashboard anytime without losing your work.",
        },
      ],
    },
    featuredPost: {
      eyebrow: "From the blog",
      title: "Stop answering “When are you free?”",
      body: "One appointment can take four or five messages, and they follow you home. Here's what that back-and-forth really costs, and how one link with a 10-minute hold on every slot replaces it.",
      cta: "Read the article",
      chat: {
        time: "9:40 at night",
        asks: "Hi! Do you have anything Thursday?",
        offer: "I can do 3:00.",
        counter: "Can't do 3. Anything in the morning?",
      },
    },
    faq: {
      eyebrow: "FAQ",
      title: "Common questions",
      aside: "Still not sure? Book one of the demo pages the way a client would.",
      items: [
        {
          q: "What's included?",
          a: "Public booking pages, real-time availability, ten-minute holds, email confirmations, event capacity, Google Calendar sync, and a private link on every booking so clients can manage it themselves.",
        },
        {
          q: "Can I take registrations for a class or event?",
          a: "Yes. Confirmed and held spots count against your capacity, so a class closes on its own once it's full.",
        },
        {
          q: "Full-day bookings, not just appointments?",
          a: "Yes. Appointments, full days, and registrations share one page.",
        },
        {
          q: "Can bookings be added to a calendar?",
          a: "Yes. Every confirmation comes with a calendar file and a private QR code for opening or checking the booking.",
        },
      ],
    },
    finalCta: {
      title: "Share one link. Let clients book themselves.",
      titleLines: ["Share one link.", "Let clients book themselves."],
      body: "Set up your page and send out the link today.",
      ownerBody: "Your page is live. Share the link and let it do the work.",
      ctaPrimary: "Create your page",
      fineprint: "No credit card needed.",
    },
    footer: {
      tagline: "One booking link for your business. No double bookings, and no accounts for your clients.",
      getStarted: "Get started",
      productHeading: "Product",
      product: {
        how: "How it works",
        features: "Features",
        useCases: "Use cases",
        seeLivePage: "See it live",
      },
      companyHeading: "Company",
      company: {
        blog: "Blog",
        privacy: "Privacy notice",
        terms: "Terms of service",
      },
      copyright: "Haab Calendar. Online booking for small businesses. Built by",
      createLink: "Create your page →",
    },
  },
};

export type Dict = (typeof translations)["en"];

export function normalizeLandingLang(value: unknown): Lang {
  return value === "es" ? "es" : "en";
}
