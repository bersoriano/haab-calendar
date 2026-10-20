import type { Lang } from "./translations";

/**
 * Copy for the online booking page for doctors (lib/language/localized-routes.ts).
 * Every claim is something Haab ships today: no reminders, payments, reviews,
 * telemedicine or clinical records, and no certification. The Healthcare
 * preset it describes is config/verticals.ts.
 */
export const doctorsTranslations = {
  en: {
    seo: {
      title: "Online Booking for Doctors and Clinics",
      description:
        "Online booking for doctors and clinics. Patients book open times 24/7 without an account, get a confirmation by email, and reschedule from a private link. Free during early access.",
      keywords: [
        "online booking for doctors",
        "doctor appointment booking",
        "online scheduling for clinics",
        "patient self-scheduling",
        "medical appointment booking page",
      ],
      socialImageAlt: "Haab Calendar: online booking for doctors and clinics",
    },
    hero: {
      kicker: "Online booking for doctors",
      titleLines: ["Patients book", "at any hour.", "Fewer calls."],
      body: "A booking page for your practice with your hours, your services, and live availability. Patients pick an open time, book without an account, and change it themselves from a private link.",
      ctaPrimary: "Create your booking page",
      ctaSecondary: "See a doctor’s page",
      chips: ["24/7 online booking", "No patient accounts", "Google Calendar sync", "English and Spanish"],
      fineprint: "Free during early access. No card. Your patients never sign up.",
    },
    outcomes: {
      eyebrow: "At the front desk",
      title: "Less time on the phone. Fewer gaps in the agenda.",
      body: "Patients book, move, and cancel visits themselves, inside the hours you set.",
      items: [
        {
          title: "Bookings after hours",
          body: "Your page takes bookings at night and on weekends, when no one is there to answer the phone.",
        },
        {
          title: "Fewer calls to move a visit",
          body: "Every confirmation carries a private link. Patients reschedule or cancel on their own.",
        },
        {
          title: "No double bookings",
          body: "A time is held for 10 minutes while a patient finishes, and the server never gives one time to two patients.",
        },
        {
          title: "One agenda",
          body: "Connect Google Calendar and the times you’re already busy close on your page. Block a vacation where you already plan.",
        },
      ],
    },
    features: {
      eyebrow: "Built for a practice",
      title: "Set up for patients from the first visit.",
      body: "Pick Healthcare and your page starts with what a practice needs. Change any of it.",
      items: [
        {
          title: "New patient and follow-up visits",
          body: "Two services come filled in, with durations and prices you can edit, on weekday hours you can change.",
        },
        {
          title: "A specialty on each service",
          body: "Name the specialty, like family medicine or pediatrics, so patients pick the right visit.",
        },
        {
          title: "Written for patients",
          body: "Your page says patients, not customers, in English and in Spanish.",
        },
        {
          title: "No patient accounts",
          body: "Patients book with their name and contact details. No password to create, and none to reset.",
        },
        {
          title: "Confirmation by email",
          body: "Patients get a confirmation with a calendar file and a private QR code. You get an email for every new booking.",
        },
        {
          title: "Your own link",
          body: "Your page lives at haabcalendar.com/doctors/your-practice.",
        },
      ],
    },
    channels: {
      eyebrow: "One link, every channel",
      title: "Share it where patients already find you.",
      body: "One link and a QR code. Every channel books into the same agenda.",
      items: [
        { title: "Your website", body: "Point your “Book an appointment” button to your page." },
        { title: "Your Google Business Profile", body: "Add it as the booking link patients see when they search for you." },
        { title: "Instagram and Facebook", body: "Put it in your bio so a follower can book without a message." },
        { title: "WhatsApp and email", body: "Send the link instead of trading messages about times." },
        { title: "A QR code at the door", body: "Patients book their follow-up before they leave, or from the waiting room." },
      ],
    },
    steps: {
      eyebrow: "How it works",
      title: "From sign-up to the first booking.",
      items: [
        {
          title: "Pick Healthcare",
          body: "Services, hours, and prices come filled in for a practice. Change what doesn’t fit yours.",
        },
        {
          title: "Publish and share your link",
          body: "On your website, your Google profile, your bio, and a QR code at the door.",
        },
        {
          title: "Patients book themselves",
          body: "They see open times, book without an account, and reschedule from their private link.",
        },
      ],
    },
    examples: {
      eyebrow: "Live examples",
      title: "See it on a practice page.",
      body: "Sample practices with fictional data, running the real booking flow. Book one like a patient would.",
    },
    faq: {
      eyebrow: "FAQ",
      title: "What practices ask first.",
      aside: "The quickest answer is a real page. Book a sample practice like a patient would.",
      items: [
        {
          q: "Do patients need an account to book?",
          a: "No. They book with their name and contact details, and manage the visit from the private link in their confirmation.",
        },
        {
          q: "Can patients reschedule or cancel on their own?",
          a: "Yes, from the private link in every confirmation.",
        },
        {
          q: "Does it work with Google Calendar?",
          a: "Yes, if you connect it. Busy times on the calendars you choose close those times on your page, and each booking is added with the service name only. Patient names, emails, phone numbers, and notes stay in Haab.",
        },
        {
          q: "Can two patients book the same time?",
          a: "No. A time is held for 10 minutes while a patient finishes booking, and the server confirms it for one patient only.",
        },
        {
          q: "Do patients get a confirmation?",
          a: "Yes, by email, with a calendar file and a private QR code. You get an email for each new booking too.",
        },
        {
          q: "Does the page work in Spanish?",
          a: "Yes. Your page works in English and Spanish, and patients can switch between them.",
        },
        {
          q: "Does it keep clinical records?",
          a: "No. Haab Calendar handles scheduling only. Keep clinical notes in your clinical record system.",
        },
        {
          q: "What does it cost?",
          a: "Nothing during early access.",
        },
      ],
    },
    finalCta: {
      titleLines: ["Your hours.", "Their bookings."],
      body: "Create your practice’s page and share the link today.",
      fineprint: "Free while in early access. No card.",
    },
    link: "Online booking for doctors",
  },
  es: {
    seo: {
      title: "Agenda online para médicos y consultorios",
      description:
        "Agenda online para médicos y consultorios. Tus pacientes reservan 24/7 sin crear cuenta, reciben su confirmación por correo y reagendan desde un enlace privado. Gratis durante el acceso anticipado.",
      keywords: [
        "agenda online para médicos",
        "sistema de citas médicas",
        "citas en línea para consultorios",
        "página de reservas para doctores",
        "agenda médica en línea",
      ],
      socialImageAlt: "Haab Calendar: agenda online para médicos y consultorios",
    },
    hero: {
      kicker: "Agenda online para médicos",
      titleLines: ["Tus pacientes agendan", "a cualquier hora.", "Menos llamadas."],
      body: "Una página de citas para tu consultorio con tus horarios, tus servicios y disponibilidad en tiempo real. Tus pacientes eligen un horario libre, agendan sin crear cuenta y lo cambian ellos mismos desde un enlace privado.",
      ctaPrimary: "Crear mi página de citas",
      ctaSecondary: "Ver la página de una médica",
      chips: ["Citas en línea 24/7", "Sin cuentas para pacientes", "Sincroniza con Google Calendar", "Español e inglés"],
      fineprint: "Gratis durante el acceso anticipado. Sin tarjeta. Tus pacientes nunca se registran.",
    },
    outcomes: {
      eyebrow: "En recepción",
      title: "Menos tiempo al teléfono. Menos huecos en la agenda.",
      body: "Tus pacientes agendan, mueven y cancelan sus citas solos, dentro de los horarios que tú defines.",
      items: [
        {
          title: "Citas fuera de horario",
          body: "Tu página recibe citas en la noche y los fines de semana, cuando no hay nadie para contestar el teléfono.",
        },
        {
          title: "Menos llamadas para mover una cita",
          body: "Cada confirmación trae un enlace privado. Tus pacientes reagendan o cancelan solos.",
        },
        {
          title: "Sin citas duplicadas",
          body: "El horario se aparta 10 minutos mientras el paciente termina, y el servidor nunca le da un horario a dos pacientes.",
        },
        {
          title: "Una sola agenda",
          body: "Conecta Google Calendar y los horarios en que ya estás ocupado se cierran en tu página. Bloquea unas vacaciones donde ya planeas.",
        },
      ],
    },
    features: {
      eyebrow: "Hecha para consultorios",
      title: "Lista para pacientes desde la primera consulta.",
      body: "Elige Salud y tu página empieza con lo que necesita un consultorio. Cambia lo que quieras.",
      items: [
        {
          title: "Primera vez y seguimiento",
          body: "Dos servicios vienen listos, con duración y precio que puedes editar, en un horario entre semana que puedes cambiar.",
        },
        {
          title: "Una especialidad en cada servicio",
          body: "Nombra la especialidad, como medicina familiar o pediatría, para que tus pacientes elijan la consulta correcta.",
        },
        {
          title: "Escrita para pacientes",
          body: "Tu página habla de pacientes, no de clientes, en español y en inglés.",
        },
        {
          title: "Sin cuentas para pacientes",
          body: "Tus pacientes agendan con su nombre y datos de contacto. Sin contraseñas que crear ni que restablecer.",
        },
        {
          title: "Confirmación por correo",
          body: "Tus pacientes reciben una confirmación con archivo de calendario y un QR privado. Tú recibes un correo por cada cita nueva.",
        },
        {
          title: "Tu propio enlace",
          body: "Tu página vive en haabcalendar.com/doctors/tu-consultorio.",
        },
      ],
    },
    channels: {
      eyebrow: "Un enlace, todos los canales",
      title: "Compártela donde tus pacientes ya te encuentran.",
      body: "Un enlace y un código QR. Todos los canales llenan la misma agenda.",
      items: [
        { title: "Tu sitio web", body: "Lleva tu botón de “Agenda tu cita” a tu página." },
        { title: "Tu Perfil de Negocio de Google", body: "Agrégala como el enlace de citas que ven tus pacientes cuando te buscan." },
        { title: "Instagram y Facebook", body: "Ponla en tu bio y un seguidor puede agendar sin mandarte mensaje." },
        { title: "WhatsApp y correo", body: "Manda el enlace en vez de ir y venir con mensajes sobre horarios." },
        { title: "Un código QR en la puerta", body: "Tus pacientes agendan su seguimiento antes de irse, o desde la sala de espera." },
      ],
    },
    steps: {
      eyebrow: "Cómo funciona",
      title: "Del registro a la primera cita.",
      items: [
        {
          title: "Elige Salud",
          body: "Servicios, horarios y precios vienen listos para un consultorio. Cambia lo que no le quede al tuyo.",
        },
        {
          title: "Publica y comparte tu enlace",
          body: "En tu sitio web, tu Perfil de Negocio de Google, tu bio y un código QR en la puerta.",
        },
        {
          title: "Tus pacientes agendan solos",
          body: "Ven los horarios libres, agendan sin crear cuenta y reagendan desde su enlace privado.",
        },
      ],
    },
    examples: {
      eyebrow: "Ejemplos reales",
      title: "Mírala en la página de un consultorio.",
      body: "Consultorios de muestra con datos ficticios y el flujo de reservas real. Agenda en uno como lo haría un paciente.",
    },
    faq: {
      eyebrow: "Preguntas",
      title: "Lo primero que preguntan los consultorios.",
      aside: "La respuesta más rápida es una página real. Agenda en un consultorio de muestra como lo haría un paciente.",
      items: [
        {
          q: "¿Mis pacientes necesitan una cuenta para agendar?",
          a: "No. Agendan con su nombre y datos de contacto, y manejan la cita desde el enlace privado de su confirmación.",
        },
        {
          q: "¿Mis pacientes pueden reagendar o cancelar solos?",
          a: "Sí, desde el enlace privado de cada confirmación.",
        },
        {
          q: "¿Funciona con Google Calendar?",
          a: "Sí, si lo conectas. Los horarios ocupados en los calendarios que eliges se cierran en tu página, y cada cita se agrega solo con el nombre del servicio. Nombres, correos, teléfonos y notas de tus pacientes se quedan en Haab.",
        },
        {
          q: "¿Dos pacientes pueden agendar el mismo horario?",
          a: "No. El horario se aparta 10 minutos mientras el paciente termina, y el servidor lo confirma para un solo paciente.",
        },
        {
          q: "¿Mis pacientes reciben una confirmación?",
          a: "Sí, por correo, con archivo de calendario y un QR privado. Tú también recibes un correo por cada cita nueva.",
        },
        {
          q: "¿La página funciona en inglés?",
          a: "Sí. Tu página funciona en español y en inglés, y tus pacientes pueden cambiar de idioma.",
        },
        {
          q: "¿Guarda expedientes clínicos?",
          a: "No. Haab Calendar solo maneja las citas. Guarda tus notas clínicas en tu sistema de expediente clínico.",
        },
        {
          q: "¿Cuánto cuesta?",
          a: "Nada durante el acceso anticipado.",
        },
      ],
    },
    finalCta: {
      titleLines: ["Tus horarios.", "Sus citas."],
      body: "Crea la página de tu consultorio y comparte el enlace hoy.",
      fineprint: "Gratis durante el acceso anticipado. Sin tarjeta.",
    },
    link: "Agenda online para médicos",
  },
} satisfies Record<Lang, unknown>;

export type DoctorsDict = (typeof doctorsTranslations)["en"];
