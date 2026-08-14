import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// One synthetic owner per example page. The dashboard loads and saves a
// provider through its owner account, so separate owners are what let the
// super admin edit each demo with the normal editor (see lib/demo-pages.ts —
// the owner emails and slugs here must match that list).
function demoOwnerEmail(ownerKey) {
  return `public-examples+${ownerKey}@haab-calendar.invalid`;
}

// Single-occurrence events are dated relative to the seed run, so re-seeding
// always leaves the demo races in the future.
function inWeeks(weeks, weekday = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  date.setUTCDate(date.getUTCDate() + ((weekday - date.getUTCDay() + 7) % 7));
  return date.toISOString().slice(0, 10);
}

const closedDay = (startTime, endTime) => ({ enabled: false, startTime, endTime });
const openDay = (startTime, endTime, blockedWindows = []) => ({
  enabled: true,
  startTime,
  endTime,
  blockedWindows,
});

const examples = [
  {
    path: "/doctors/dr-maya-rivera",
    ownerKey: "doctors",
    provider: {
      full_name: "Dr. Maya Rivera",
      business_name: "Rivera Family Medicine",
      email: demoOwnerEmail("doctors"),
      vertical: "healthcare",
      slug: "dr-maya-rivera",
      custom_slug: "dr-maya-rivera",
      plan_tier: "premium",
      language: "en",
      timezone: "America/New_York",
      booking_window_days: 60,
      phone_number_1: "+1 212 555 0142",
      phone_number_2: "",
      address_1: "245 West 29th Street, New York, NY",
      address_2: "",
      hero_text: "Thoughtful primary care, on your schedule.",
      gallery_image_urls: [],
      availability: {
        sunday: closedDay("09:00", "17:00"),
        monday: openDay("09:00", "17:00", [{ startTime: "12:00", endTime: "13:00" }]),
        tuesday: openDay("09:00", "17:00", [{ startTime: "12:00", endTime: "13:00" }]),
        wednesday: openDay("10:00", "18:00", [{ startTime: "13:00", endTime: "14:00" }]),
        thursday: openDay("09:00", "17:00", [{ startTime: "12:00", endTime: "13:00" }]),
        friday: openDay("09:00", "15:00"),
        saturday: closedDay("09:00", "17:00"),
      },
    },
    services: [
      {
        name: "New patient consultation",
        slug: "new-patient-consultation",
        booking_type: "appointment",
        duration_minutes: 30,
        description: "A comprehensive first visit to review your health history and priorities.",
        medical_specialty: "Family medicine",
        capacity: "1 patient",
        cost: "$95",
        notes: "Please bring a photo ID and your current medication list.",
        sort_order: 10,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Follow-up visit",
        slug: "follow-up-visit",
        booking_type: "appointment",
        duration_minutes: 20,
        description: "Review progress, results, and any updates to your care plan.",
        medical_specialty: "Family medicine",
        capacity: "1 patient",
        cost: "$65",
        notes: "For existing patients.",
        sort_order: 20,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  {
    path: "/spaces/riverside-padel-club",
    ownerKey: "spaces",
    provider: {
      full_name: "Alex Morgan",
      business_name: "Riverside Padel Club",
      email: demoOwnerEmail("spaces"),
      vertical: "spaces",
      slug: "riverside-padel-club",
      custom_slug: "riverside-padel-club",
      plan_tier: "premium",
      language: "en",
      timezone: "America/Los_Angeles",
      booking_window_days: 45,
      phone_number_1: "+1 415 555 0168",
      phone_number_2: "",
      address_1: "88 Embarcadero Way, San Francisco, CA",
      address_2: "",
      hero_text: "One indoor court. Book it by the hour.",
      gallery_image_urls: [],
      availability: {
        sunday: openDay("08:00", "20:00"),
        monday: openDay("07:00", "22:00", [{ startTime: "15:00", endTime: "16:00" }]),
        tuesday: openDay("07:00", "22:00", [{ startTime: "15:00", endTime: "16:00" }]),
        wednesday: openDay("07:00", "22:00", [{ startTime: "15:00", endTime: "16:00" }]),
        thursday: openDay("07:00", "22:00", [{ startTime: "15:00", endTime: "16:00" }]),
        friday: openDay("07:00", "23:00"),
        saturday: openDay("08:00", "23:00"),
      },
    },
    services: [
      {
        name: "Indoor padel court",
        slug: "indoor-padel-court",
        booking_type: "appointment",
        duration_minutes: 60,
        description:
          "An hour on our single climate-controlled show court, with rackets and match balls available.",
        medical_specialty: null,
        capacity: "Up to 4 players",
        cost: "$48 / hour",
        notes: "Arrive 10 minutes early for check-in. The court hosts one group at a time.",
        sort_order: 10,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Private coaching court",
        slug: "private-coaching-court",
        booking_type: "appointment",
        duration_minutes: 90,
        description:
          "The same show court for 90 minutes, plus a one-on-one session with a club coach.",
        medical_specialty: null,
        capacity: "1–2 players",
        cost: "$120 / session",
        notes: "Equipment is included. Booking this takes the court off the hourly grid.",
        sort_order: 20,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  {
    path: "/professionals/northstar-strategy",
    ownerKey: "professionals",
    provider: {
      full_name: "Jordan Lee",
      business_name: "Northstar Strategy",
      email: demoOwnerEmail("professionals"),
      vertical: "professional",
      slug: "northstar-strategy",
      custom_slug: "northstar-strategy",
      plan_tier: "premium",
      language: "en",
      timezone: "Europe/London",
      booking_window_days: 60,
      phone_number_1: "+44 20 7946 0184",
      phone_number_2: "",
      address_1: "Remote consultation",
      address_2: "",
      hero_text: "Turn the next big decision into a clear plan.",
      gallery_image_urls: [],
      availability: {
        sunday: closedDay("09:00", "17:00"),
        monday: openDay("10:00", "18:00", [{ startTime: "13:00", endTime: "14:00" }]),
        tuesday: openDay("10:00", "18:00", [{ startTime: "13:00", endTime: "14:00" }]),
        wednesday: openDay("10:00", "18:00", [{ startTime: "13:00", endTime: "14:00" }]),
        thursday: openDay("10:00", "18:00", [{ startTime: "13:00", endTime: "14:00" }]),
        friday: openDay("10:00", "16:00"),
        saturday: closedDay("09:00", "17:00"),
      },
    },
    services: [
      {
        name: "Growth strategy session",
        slug: "growth-strategy-session",
        booking_type: "appointment",
        duration_minutes: 60,
        description: "A structured working session on positioning, priorities, and execution.",
        medical_specialty: null,
        capacity: "1 client",
        cost: "£220",
        notes: "A video-call link is sent after confirmation.",
        sort_order: 10,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Focused advisory call",
        slug: "focused-advisory-call",
        booking_type: "appointment",
        duration_minutes: 30,
        description: "Bring one decision or obstacle and leave with concrete next steps.",
        medical_specialty: null,
        capacity: "1 client",
        cost: "£110",
        notes: "Ideal for a specific question or quick review.",
        sort_order: 20,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  {
    path: "/events/makers-workshop",
    ownerKey: "events",
    provider: {
      full_name: "Samira Chen",
      business_name: "Makers Workshop",
      email: demoOwnerEmail("events"),
      vertical: "events",
      slug: "makers-workshop",
      custom_slug: "makers-workshop",
      plan_tier: "premium",
      language: "en",
      timezone: "Asia/Bangkok",
      booking_window_days: 90,
      phone_number_1: "+66 2 555 0182",
      phone_number_2: "",
      address_1: "41 Charoen Krung Road, Bangkok",
      address_2: "",
      hero_text: "Small-group classes for curious hands.",
      gallery_image_urls: [],
      availability: {
        sunday: openDay("09:00", "18:00"),
        monday: closedDay("09:00", "18:00"),
        tuesday: closedDay("09:00", "18:00"),
        wednesday: openDay("09:00", "18:00"),
        thursday: openDay("09:00", "21:00"),
        friday: openDay("09:00", "18:00"),
        saturday: openDay("09:00", "18:00"),
      },
    },
    services: [
      {
        name: "Saturday pottery workshop",
        slug: "saturday-pottery-workshop",
        booking_type: "appointment",
        duration_minutes: 120,
        description: "A guided wheel-throwing class for beginners, including clay and firing.",
        medical_specialty: null,
        capacity: "18 attendees",
        cost: "฿1,400 / attendee",
        notes: "Aprons and materials are provided. Ages 14+.",
        sort_order: 10,
        occurrence_mode: "weekly",
        weekdays: ["saturday"],
        start_time: "10:00",
        end_time: "12:00",
        max_spots: 18,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Evening figure drawing",
        slug: "evening-figure-drawing",
        booking_type: "appointment",
        duration_minutes: 120,
        description: "A relaxed weekly studio class with guided warm-ups and a live model.",
        medical_specialty: null,
        capacity: "24 attendees",
        cost: "฿650 / attendee",
        notes: "Bring your preferred drawing materials; easels are available.",
        sort_order: 20,
        occurrence_mode: "weekly",
        weekdays: ["thursday"],
        start_time: "18:30",
        end_time: "20:30",
        max_spots: 24,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  {
    path: "/events/kilometro-cero-running",
    ownerKey: "runners",
    provider: {
      full_name: "Daniela Ortiz",
      business_name: "Kilómetro Cero Running",
      email: demoOwnerEmail("runners"),
      vertical: "events",
      slug: "kilometro-cero-running",
      custom_slug: "kilometro-cero-running",
      plan_tier: "premium",
      language: "es",
      timezone: "America/Mexico_City",
      booking_window_days: 120,
      phone_number_1: "+52 55 5555 0148",
      phone_number_2: "",
      address_1: "Bosque de Chapultepec, Ciudad de México",
      address_2: "",
      hero_text: "Tu siguiente distancia empieza aquí.",
      gallery_image_urls: [],
      availability: {
        sunday: openDay("06:00", "12:00"),
        monday: closedDay("06:00", "20:00"),
        tuesday: openDay("06:00", "20:00"),
        wednesday: closedDay("06:00", "20:00"),
        thursday: openDay("06:00", "20:00"),
        friday: closedDay("06:00", "20:00"),
        saturday: openDay("06:00", "12:00"),
      },
    },
    services: [
      {
        name: "Carrera 10K Ruta Reforma",
        slug: "carrera-10k-ruta-reforma",
        booking_type: "appointment",
        duration_minutes: 120,
        description:
          "Carrera de 10 kilómetros por Paseo de la Reforma, con hidratación en ruta y medalla al finalizar.",
        medical_specialty: null,
        capacity: "600 corredores",
        cost: "$650 MXN por corredor",
        notes: "Entrega de kit el día previo. Incluye playera, número y chip.",
        sort_order: 10,
        occurrence_mode: "single",
        weekdays: [],
        occurrence_date: inWeeks(8, 0),
        start_time: "07:00",
        end_time: "09:00",
        max_spots: 600,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Medio maratón 21K Chapultepec",
        slug: "medio-maraton-21k-chapultepec",
        booking_type: "appointment",
        duration_minutes: 180,
        description:
          "Medio maratón con circuito certificado, tres puntos de abastecimiento y tiempo oficial por chip.",
        medical_specialty: null,
        capacity: "1,200 corredores",
        cost: "$980 MXN por corredor",
        notes: "Cupo limitado. Se solicita certificado médico vigente.",
        sort_order: 20,
        occurrence_mode: "single",
        weekdays: [],
        occurrence_date: inWeeks(16, 0),
        start_time: "06:30",
        end_time: "09:30",
        max_spots: 1200,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Entrenamiento grupal 5K",
        slug: "entrenamiento-grupal-5k",
        booking_type: "appointment",
        duration_minutes: 90,
        description:
          "Sesión guiada de técnica y ritmo para quienes preparan su primer 5K, con entrenador certificado.",
        medical_specialty: null,
        capacity: "30 corredores",
        cost: "$180 MXN por sesión",
        notes: "Llega 15 minutos antes para el calentamiento.",
        sort_order: 30,
        occurrence_mode: "weekly",
        weekdays: ["tuesday", "thursday"],
        start_time: "06:30",
        end_time: "08:00",
        max_spots: 30,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  {
    path: "/professionals/nube-rosa-nail-studio",
    ownerKey: "nails",
    provider: {
      full_name: "Valeria Cruz",
      business_name: "Nube Rosa Nail Studio",
      email: demoOwnerEmail("nails"),
      vertical: "professional",
      slug: "nube-rosa-nail-studio",
      custom_slug: "nube-rosa-nail-studio",
      plan_tier: "premium",
      language: "es",
      timezone: "America/Mexico_City",
      booking_window_days: 45,
      phone_number_1: "+52 55 5555 0173",
      phone_number_2: "",
      address_1: "Colonia Roma Norte, Ciudad de México",
      address_2: "",
      hero_text: "Manos listas, sin esperas ni mensajes.",
      gallery_image_urls: [],
      availability: {
        sunday: closedDay("10:00", "19:00"),
        monday: closedDay("10:00", "19:00"),
        tuesday: openDay("10:00", "19:00", [{ startTime: "14:00", endTime: "15:00" }]),
        wednesday: openDay("10:00", "19:00", [{ startTime: "14:00", endTime: "15:00" }]),
        thursday: openDay("10:00", "20:00", [{ startTime: "14:00", endTime: "15:00" }]),
        friday: openDay("10:00", "20:00"),
        saturday: openDay("09:00", "17:00"),
      },
    },
    services: [
      {
        name: "Manicure en gel",
        slug: "manicure-en-gel",
        booking_type: "appointment",
        duration_minutes: 60,
        description:
          "Limpieza de cutícula, hidratación y esmaltado en gel con acabado profesional.",
        medical_specialty: null,
        capacity: "1 persona",
        cost: "$450 MXN",
        notes: "Incluye retiro de esmaltado previo.",
        sort_order: 10,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Uñas acrílicas con diseño",
        slug: "unas-acrilicas-con-diseno",
        booking_type: "appointment",
        duration_minutes: 120,
        description:
          "Aplicación de acrílico a medida con diseño personalizado y encapsulado opcional.",
        medical_specialty: null,
        capacity: "1 persona",
        cost: "$780 MXN",
        notes: "El diseño se acuerda al inicio de la cita.",
        sort_order: 20,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Pedicure spa",
        slug: "pedicure-spa",
        booking_type: "appointment",
        duration_minutes: 75,
        description:
          "Exfoliación, masaje y esmaltado en gel para pies, con tratamiento de hidratación.",
        medical_specialty: null,
        capacity: "1 persona",
        cost: "$520 MXN",
        notes: "",
        sort_order: 30,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Extensiones de pestañas volumen ruso",
        slug: "extensiones-de-pestanas-volumen-ruso",
        booking_type: "appointment",
        duration_minutes: 150,
        description:
          "Aplicación pelo a pelo en volumen ruso, con asesoría de curvatura y longitud.",
        medical_specialty: null,
        capacity: "1 persona",
        cost: "$850 MXN",
        notes: "Llega sin maquillaje en los ojos.",
        sort_order: 40,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  {
    path: "/doctors/brightpoint-dental",
    ownerKey: "dentists",
    provider: {
      full_name: "Dr. Priya Raman",
      business_name: "Brightpoint Dental",
      email: demoOwnerEmail("dentists"),
      vertical: "healthcare",
      slug: "brightpoint-dental",
      custom_slug: "brightpoint-dental",
      plan_tier: "premium",
      language: "en",
      timezone: "America/Chicago",
      booking_window_days: 60,
      phone_number_1: "+1 312 555 0119",
      phone_number_2: "",
      address_1: "1204 North Wells Street, Chicago, IL",
      address_2: "",
      hero_text: "Dental care that runs on time.",
      gallery_image_urls: [],
      availability: {
        sunday: closedDay("08:00", "17:00"),
        monday: openDay("08:00", "17:00", [{ startTime: "12:30", endTime: "13:30" }]),
        tuesday: openDay("08:00", "17:00", [{ startTime: "12:30", endTime: "13:30" }]),
        wednesday: openDay("08:00", "17:00", [{ startTime: "12:30", endTime: "13:30" }]),
        thursday: openDay("10:00", "19:00", [{ startTime: "13:30", endTime: "14:30" }]),
        friday: openDay("08:00", "13:00"),
        saturday: closedDay("08:00", "17:00"),
      },
    },
    services: [
      {
        name: "New patient exam and cleaning",
        slug: "new-patient-exam-and-cleaning",
        booking_type: "appointment",
        duration_minutes: 60,
        description:
          "A full first visit: digital X-rays, gum assessment, and a hygienist cleaning.",
        medical_specialty: "General dentistry",
        capacity: "1 patient",
        cost: "$180",
        notes: "Bring your insurance card. Please arrive 10 minutes early for paperwork.",
        sort_order: 10,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Routine cleaning",
        slug: "routine-cleaning",
        booking_type: "appointment",
        duration_minutes: 45,
        description: "Scaling, polishing, and a short check of anything you have flagged.",
        medical_specialty: "General dentistry",
        capacity: "1 patient",
        cost: "$110",
        notes: "Recommended every six months for existing patients.",
        sort_order: 20,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Emergency toothache visit",
        slug: "emergency-toothache-visit",
        booking_type: "appointment",
        duration_minutes: 30,
        description:
          "A same-week slot to diagnose pain, sensitivity, or a broken filling and relieve it.",
        medical_specialty: "General dentistry",
        capacity: "1 patient",
        cost: "$95",
        notes: "Treatment beyond the assessment is quoted before anything starts.",
        sort_order: 30,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  {
    path: "/doctors/clinica-veterinaria-patitas",
    ownerKey: "vets",
    provider: {
      full_name: "MVZ Andrés Salas",
      business_name: "Clínica Veterinaria Patitas",
      email: demoOwnerEmail("vets"),
      vertical: "healthcare",
      slug: "clinica-veterinaria-patitas",
      custom_slug: "clinica-veterinaria-patitas",
      plan_tier: "premium",
      language: "es",
      timezone: "America/Mexico_City",
      booking_window_days: 45,
      phone_number_1: "+52 55 5555 0126",
      phone_number_2: "",
      address_1: "Avenida Coyoacán 1450, Ciudad de México",
      address_2: "",
      hero_text: "Un consultorio, una mascota a la vez.",
      gallery_image_urls: [],
      availability: {
        sunday: closedDay("09:00", "18:00"),
        monday: openDay("09:00", "19:00", [{ startTime: "14:00", endTime: "15:00" }]),
        tuesday: openDay("09:00", "19:00", [{ startTime: "14:00", endTime: "15:00" }]),
        wednesday: openDay("09:00", "19:00", [{ startTime: "14:00", endTime: "15:00" }]),
        thursday: openDay("09:00", "19:00", [{ startTime: "14:00", endTime: "15:00" }]),
        friday: openDay("09:00", "19:00", [{ startTime: "14:00", endTime: "15:00" }]),
        saturday: openDay("09:00", "14:00"),
      },
    },
    services: [
      {
        name: "Consulta general",
        slug: "consulta-general",
        booking_type: "appointment",
        duration_minutes: 30,
        description:
          "Revisión completa de tu perro o gato, con diagnóstico y plan de tratamiento por escrito.",
        medical_specialty: "Medicina veterinaria",
        capacity: "1 paciente",
        cost: "$450 MXN",
        notes: "Trae la cartilla de vacunación si es la primera visita.",
        sort_order: 10,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Vacunación y desparasitación",
        slug: "vacunacion-y-desparasitacion",
        booking_type: "appointment",
        duration_minutes: 20,
        description:
          "Aplicación de refuerzos según el esquema de tu mascota y desparasitación interna.",
        medical_specialty: "Medicina veterinaria",
        capacity: "1 paciente",
        cost: "$380 MXN",
        notes: "El precio varía según el peso y la vacuna aplicada.",
        sort_order: 20,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Limpieza dental con anestesia",
        slug: "limpieza-dental-con-anestesia",
        booking_type: "appointment",
        duration_minutes: 120,
        description:
          "Profilaxis dental con monitoreo anestésico, pulido y revisión de piezas dañadas.",
        medical_specialty: "Medicina veterinaria",
        capacity: "1 paciente",
        cost: "$1,900 MXN",
        notes: "Ayuno de 8 horas. Se requiere estudio preanestésico previo.",
        sort_order: 30,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  {
    path: "/professionals/copperline-hair-studio",
    ownerKey: "salons",
    provider: {
      full_name: "Ines Brandt",
      business_name: "Copperline Hair Studio",
      email: demoOwnerEmail("salons"),
      vertical: "professional",
      slug: "copperline-hair-studio",
      custom_slug: "copperline-hair-studio",
      plan_tier: "premium",
      language: "en",
      timezone: "Europe/Berlin",
      booking_window_days: 45,
      phone_number_1: "+49 30 5555 0147",
      phone_number_2: "",
      address_1: "Oderberger Straße 22, Berlin",
      address_2: "",
      hero_text: "One chair, one client, no waiting room.",
      gallery_image_urls: [],
      availability: {
        sunday: closedDay("10:00", "19:00"),
        monday: closedDay("10:00", "19:00"),
        tuesday: openDay("10:00", "19:00", [{ startTime: "13:00", endTime: "14:00" }]),
        wednesday: openDay("10:00", "19:00", [{ startTime: "13:00", endTime: "14:00" }]),
        thursday: openDay("11:00", "20:00", [{ startTime: "14:00", endTime: "15:00" }]),
        friday: openDay("10:00", "19:00"),
        saturday: openDay("09:00", "16:00"),
      },
    },
    services: [
      {
        name: "Cut and finish",
        slug: "cut-and-finish",
        booking_type: "appointment",
        duration_minutes: 60,
        description:
          "A consultation, precision cut, and a finish styled the way you will wear it at home.",
        medical_specialty: null,
        capacity: "1 client",
        cost: "€55",
        notes: "Wash and blow-dry are included.",
        sort_order: 10,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Colour and gloss",
        slug: "colour-and-gloss",
        booking_type: "appointment",
        duration_minutes: 120,
        description:
          "Full-colour or root refresh with a shine-gloss finish, matched to your natural tone.",
        medical_specialty: null,
        capacity: "1 client",
        cost: "€120",
        notes: "First-time colour includes a patch test 48 hours before.",
        sort_order: 20,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Wash and blow-dry",
        slug: "wash-and-blow-dry",
        booking_type: "appointment",
        duration_minutes: 45,
        description: "A wash, scalp massage, and a styled blow-dry for an event or a reset.",
        medical_specialty: null,
        capacity: "1 client",
        cost: "€38",
        notes: "",
        sort_order: 30,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  {
    path: "/professionals/northgate-auto-service",
    ownerKey: "autoshops",
    provider: {
      full_name: "Marcus Deel",
      business_name: "Northgate Auto Service",
      email: demoOwnerEmail("autoshops"),
      vertical: "professional",
      slug: "northgate-auto-service",
      custom_slug: "northgate-auto-service",
      plan_tier: "premium",
      language: "en",
      timezone: "America/Denver",
      booking_window_days: 30,
      phone_number_1: "+1 303 555 0193",
      phone_number_2: "",
      address_1: "2170 North Federal Boulevard, Denver, CO",
      address_2: "",
      hero_text: "Book the bay, skip the queue.",
      gallery_image_urls: [],
      availability: {
        sunday: closedDay("08:00", "17:00"),
        monday: openDay("08:00", "17:00", [{ startTime: "12:00", endTime: "13:00" }]),
        tuesday: openDay("08:00", "17:00", [{ startTime: "12:00", endTime: "13:00" }]),
        wednesday: openDay("08:00", "17:00", [{ startTime: "12:00", endTime: "13:00" }]),
        thursday: openDay("08:00", "17:00", [{ startTime: "12:00", endTime: "13:00" }]),
        friday: openDay("08:00", "16:00"),
        saturday: openDay("09:00", "13:00"),
      },
    },
    services: [
      {
        name: "Oil change and multi-point check",
        slug: "oil-change-and-multi-point-check",
        booking_type: "appointment",
        duration_minutes: 45,
        description:
          "Full synthetic oil and filter, fluid top-up, and a 21-point inspection with photos.",
        medical_specialty: null,
        capacity: "1 vehicle",
        cost: "$79",
        notes: "One service bay, one vehicle per slot. Wait on site or drop the keys.",
        sort_order: 10,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Brake inspection and pad replacement",
        slug: "brake-inspection-and-pad-replacement",
        booking_type: "appointment",
        duration_minutes: 120,
        description:
          "Pad and rotor measurement on all four corners, with front or rear pads replaced.",
        medical_specialty: null,
        capacity: "1 vehicle",
        cost: "From $260",
        notes: "Rotor machining or replacement is quoted before any work starts.",
        sort_order: 20,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Seasonal tire swap and balance",
        slug: "seasonal-tire-swap-and-balance",
        booking_type: "appointment",
        duration_minutes: 60,
        description:
          "Swap to your winter or summer set, road-force balance, and a pressure reset.",
        medical_specialty: null,
        capacity: "1 vehicle",
        cost: "$110",
        notes: "Bring your second set of wheels, or ask about seasonal storage.",
        sort_order: 30,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  {
    path: "/professionals/fairway-lab-golf",
    ownerKey: "golf",
    provider: {
      full_name: "Tess Okafor",
      business_name: "Fairway Lab Golf",
      email: demoOwnerEmail("golf"),
      vertical: "professional",
      slug: "fairway-lab-golf",
      custom_slug: "fairway-lab-golf",
      plan_tier: "premium",
      language: "en",
      timezone: "America/Phoenix",
      booking_window_days: 60,
      phone_number_1: "+1 480 555 0158",
      phone_number_2: "",
      address_1: "7400 East Camelback Road, Scottsdale, AZ",
      address_2: "",
      hero_text: "One coach, one player, every session.",
      gallery_image_urls: [],
      availability: {
        sunday: openDay("07:00", "12:00"),
        monday: openDay("06:00", "12:00"),
        tuesday: openDay("06:00", "12:00"),
        wednesday: openDay("06:00", "12:00"),
        thursday: openDay("06:00", "12:00"),
        friday: openDay("06:00", "11:00"),
        saturday: openDay("06:00", "13:00"),
      },
    },
    services: [
      {
        name: "Private lesson",
        slug: "private-lesson",
        booking_type: "appointment",
        duration_minutes: 60,
        description:
          "One-on-one coaching on full swing, with video review and drills to take home.",
        medical_specialty: null,
        capacity: "1 player",
        cost: "$95",
        notes: "Clubs are available if you would rather not travel with yours.",
        sort_order: 10,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Swing analysis with launch monitor",
        slug: "swing-analysis-with-launch-monitor",
        booking_type: "appointment",
        duration_minutes: 90,
        description:
          "Tracked ball flight and club data across every iron, with a written gapping report.",
        medical_specialty: null,
        capacity: "1 player",
        cost: "$150",
        notes: "The report is emailed within 24 hours of the session.",
        sort_order: 20,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Putting and short-game session",
        slug: "putting-and-short-game-session",
        booking_type: "appointment",
        duration_minutes: 45,
        description:
          "Focused work inside 50 yards: chipping contact, bunker technique, and start line.",
        medical_specialty: null,
        capacity: "1 player",
        cost: "$70",
        notes: "Bring your wedges and putter.",
        sort_order: 30,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: null,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
];

async function getOrCreateDemoOwner(email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const existing = data.users.find((user) => user.email === email);
    if (existing) return existing.id;
    if (data.users.length < 100) break;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: `${randomUUID()}-Haab!`,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function upsertProvider(ownerUserId, example) {
  const { data: existing, error: lookupError } = await supabase
    .from("providers")
    .select("id")
    .eq("vertical", example.provider.vertical)
    .eq("slug", example.provider.slug)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const provider = {
    ...example.provider,
    owner_user_id: ownerUserId,
    setup_complete: true,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("providers")
      .update(provider)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  const { data, error } = await supabase
    .from("providers")
    .insert(provider)
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertServices(providerId, services) {
  const { data: existingServices, error: lookupError } = await supabase
    .from("services")
    .select("id,name")
    .eq("provider_id", providerId);
  if (lookupError) throw lookupError;

  const existingServiceIdByName = new Map(
    (existingServices ?? []).map((service) => [service.name, service.id]),
  );

  for (const [index, service] of services.entries()) {
    const record = {
      provider_id: providerId,
      occurrence_date: null,
      start_time: null,
      end_time: null,
      location_prices: {},
      linked_address_1: false,
      linked_address_2: false,
      linked_phone_1: false,
      linked_phone_2: false,
      custom_address: null,
      custom_phone: null,
      ...service,
      sort_order: service.sort_order ?? (index + 1) * 10,
    };

    const existingServiceId = existingServiceIdByName.get(service.name);
    const query = existingServiceId
      ? supabase.from("services").update(record).eq("id", existingServiceId)
      : supabase.from("services").insert(record);
    const { error } = await query;
    if (error) throw error;
  }
}

for (const example of examples) {
  // Re-running re-parents an existing demo row to its own owner, which is how
  // demos seeded under a single shared account get migrated.
  const ownerUserId = await getOrCreateDemoOwner(demoOwnerEmail(example.ownerKey));

  const { error: publicationError } = await supabase
    .from("user_publication_settings")
    .upsert({ user_id: ownerUserId, publishing_enabled: true }, { onConflict: "user_id" });
  if (publicationError) throw publicationError;

  const providerId = await upsertProvider(ownerUserId, example);
  await upsertServices(providerId, example.services);
}

console.log("Published example booking pages:");
for (const example of examples) {
  console.log(`  ${example.path}`);
}
