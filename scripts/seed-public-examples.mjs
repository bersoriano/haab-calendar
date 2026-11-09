import { createHash, randomBytes, randomUUID } from "node:crypto";
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

function daysFrom(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// The wedding demo's Saturday. Its Friday and Sunday events are derived from it.
const WEDDING_DAY = inWeeks(10, 6);

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
  {
    path: "/restaurants/casa-mirador",
    ownerKey: "restaurants",
    provider: {
      full_name: "Lucía Ferrer",
      business_name: "Casa Mirador",
      email: demoOwnerEmail("restaurants"),
      vertical: "restaurant",
      slug: "casa-mirador",
      custom_slug: "casa-mirador",
      plan_tier: "premium",
      language: "es",
      timezone: "Europe/Madrid",
      booking_window_days: 30,
      phone_number_1: "+34 91 555 0164",
      phone_number_2: "",
      address_1: "Calle de la Cava Baja 28, Madrid",
      address_2: "",
      hero_text: "Doce mesas por turno. Reserve la suya.",
      gallery_image_urls: [],
      // A weekday carries one open range, and every service draws its seatings
      // from it — so the dining room runs dinner on weeknights and a single
      // lunch service on Sunday, rather than both on the same day.
      availability: {
        sunday: openDay("13:30", "16:30"),
        monday: closedDay("20:00", "23:00"),
        tuesday: openDay("20:00", "23:00"),
        wednesday: openDay("20:00", "23:00"),
        thursday: openDay("20:00", "23:00"),
        friday: openDay("20:00", "23:00"),
        saturday: openDay("20:00", "23:00"),
      },
    },
    services: [
      {
        name: "Mesa del comedor",
        slug: "mesa-del-comedor",
        booking_type: "appointment",
        duration_minutes: 90,
        description:
          "Una mesa del comedor principal, reservada durante hora y media.",
        medical_specialty: null,
        capacity: "",
        cost: "Menú de temporada 48 €",
        notes: "Guardamos la mesa 15 minutos después de la hora reservada.",
        sort_order: 10,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: 12,
        capacity_scope: "slot",
        max_party_size: 8,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Mesa en la terraza",
        slug: "mesa-en-la-terraza",
        booking_type: "appointment",
        duration_minutes: 90,
        description:
          "Una mesa en la terraza, con su propio cupo: se llena aparte del comedor.",
        medical_specialty: null,
        capacity: "",
        cost: "Menú de temporada 48 €",
        notes: "La terraza se cubre si llueve.",
        sort_order: 20,
        occurrence_mode: "periodic",
        weekdays: [],
        max_spots: 6,
        capacity_scope: "slot",
        max_party_size: 6,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  // Events have one date and one same-day window, so a multi-day tour is stored
  // as its day-one welcome meeting and says how long it runs in its text. Those
  // meetings start after the day tours end: a booking on one event closes any
  // other event whose window overlaps it on that date.
  {
    path: "/events/ruta-cenote-tours",
    ownerKey: "tours",
    provider: {
      full_name: "Lucía Canul",
      business_name: "Ruta Cenote Tours",
      email: demoOwnerEmail("tours"),
      vertical: "events",
      slug: "ruta-cenote-tours",
      custom_slug: "ruta-cenote-tours",
      plan_tier: "premium",
      vocabulary: "tours",
      language: "en",
      timezone: "America/Mexico_City",
      booking_window_days: 180,
      phone_number_1: "+52 55 5555 0176",
      phone_number_2: "+52 998 555 0176",
      address_1: "Monumento a la Revolución, Mexico City",
      address_2: "Parque Las Palapas, Cancún",
      hero_text: "Small-group tours through the Mexico worth the trip.",
      gallery_image_urls: [],
      availability: {
        sunday: closedDay("07:00", "20:00"),
        monday: openDay("07:00", "20:00"),
        tuesday: openDay("07:00", "20:00"),
        wednesday: openDay("07:00", "20:00"),
        thursday: openDay("07:00", "20:00"),
        friday: openDay("07:00", "20:00"),
        saturday: openDay("07:00", "20:00"),
      },
    },
    services: [
      {
        name: "Teotihuacan sunrise day tour",
        slug: "teotihuacan-sunrise-day-tour",
        booking_type: "appointment",
        duration_minutes: 600,
        description:
          "Climb the pyramids with an archaeologist guide before the crowds arrive. Includes transport, entry fees, and lunch.",
        medical_specialty: null,
        capacity: "14 travelers",
        cost: "US$95 per person",
        notes: "Wear comfortable shoes and bring a hat and water. The bus leaves on time.",
        photo_urls: ["/demo/tours/teotihuacan.jpg"],
        cancellation_policy: "Free cancellation up to 48 hours before departure. No refund after that.",
        min_group_size: 4,
        traveler_fields: ["emergency_contact", "diet", "hotel_pickup"],
        sort_order: 10,
        occurrence_mode: "weekly",
        weekdays: ["saturday"],
        start_time: "07:00",
        end_time: "17:00",
        max_spots: 14,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Tulum and Cobá day tour",
        slug: "tulum-and-coba-day-tour",
        booking_type: "appointment",
        duration_minutes: 600,
        description:
          "Seaside ruins in the morning and a cenote swim in the afternoon. Includes transport, entry fees, and lunch.",
        medical_specialty: null,
        capacity: "16 travelers",
        cost: "US$120 per person",
        notes: "Bring swimwear and a towel. Only biodegradable sunscreen in the cenote. Starts at 7:30 AM Cancún time.",
        photo_urls: ["/demo/tours/coba.jpg"],
        cancellation_policy: "Free cancellation up to 48 hours before departure. No refund after that.",
        min_group_size: 4,
        traveler_fields: ["emergency_contact", "diet", "hotel_pickup"],
        sort_order: 20,
        occurrence_mode: "weekly",
        weekdays: ["tuesday"],
        start_time: "07:30",
        end_time: "17:30",
        max_spots: 16,
        linked_address_2: true,
        linked_phone_2: true,
      },
      {
        name: "Yucatán and Maya ruins · 8 days",
        slug: "yucatan-and-maya-ruins-8-days",
        booking_type: "appointment",
        duration_minutes: 60,
        description:
          "Cancún round trip through Chichén Itzá, Mérida, Uxmal, and Bacalar. Includes 7 hotel nights, transport, a guide, and breakfasts.",
        medical_specialty: null,
        capacity: "12 travelers",
        cost: "US$1,890 per person",
        notes: "The time shown is the day 1 welcome meeting, 6:00 PM Cancún time. Ends day 8 in Cancún. Priced for a double room.",
        photo_urls: ["/demo/tours/merida.jpg", "/demo/tours/uxmal.jpg"],
        cancellation_policy: "Free cancellation up to 45 days before departure. 50% refund from 45 to 15 days before. No refund after that.",
        min_group_size: 6,
        traveler_fields: ["passport", "emergency_contact", "diet"],
        sort_order: 30,
        occurrence_mode: "single",
        weekdays: [],
        occurrence_date: inWeeks(6, 1),
        start_time: "18:00",
        end_time: "19:00",
        max_spots: 12,
        linked_address_2: true,
        linked_phone_2: true,
      },
      {
        name: "Oaxaca food and markets · 6 days",
        slug: "oaxaca-food-and-markets-6-days",
        booking_type: "appointment",
        duration_minutes: 60,
        description:
          "Markets, Monte Albán, a mezcal workshop, and a home cooking class with a local family. Includes 5 hotel nights, a guide, and breakfasts.",
        medical_specialty: null,
        capacity: "10 travelers",
        cost: "US$1,240 per person",
        notes: "The time shown is the day 1 welcome meeting. Ends day 6 in Oaxaca. Flights not included.",
        photo_urls: ["/demo/tours/oaxaca.jpg"],
        cancellation_policy: "Free cancellation up to 45 days before departure. 50% refund from 45 to 15 days before. No refund after that.",
        min_group_size: 4,
        traveler_fields: ["emergency_contact", "diet"],
        sort_order: 40,
        occurrence_mode: "single",
        weekdays: [],
        occurrence_date: inWeeks(10, 3),
        start_time: "18:00",
        end_time: "19:00",
        max_spots: 10,
        custom_address: "Santo Domingo de Guzmán, Oaxaca",
        linked_phone_1: true,
      },
      {
        name: "Mexico City to Cancún · 15 days",
        slug: "mexico-city-to-cancun-15-days",
        booking_type: "appointment",
        duration_minutes: 60,
        description:
          "Teotihuacan, Oaxaca, San Cristóbal, Palenque, Mérida, and the Quintana Roo coast. Includes 14 hotel nights, transport, a guide, and breakfasts.",
        medical_specialty: null,
        capacity: "16 travelers",
        cost: "US$3,950 per person",
        notes: "The time shown is the day 1 welcome meeting. Ends day 15 in Cancún. Priced for a double room.",
        photo_urls: ["/demo/tours/teotihuacan.jpg", "/demo/tours/oaxaca.jpg", "/demo/tours/merida.jpg"],
        cancellation_policy: "Free cancellation up to 45 days before departure. 50% refund from 45 to 15 days before. No refund after that.",
        min_group_size: 6,
        traveler_fields: ["passport", "emergency_contact", "diet"],
        sort_order: 50,
        occurrence_mode: "single",
        weekdays: [],
        occurrence_date: inWeeks(14, 4),
        start_time: "18:00",
        end_time: "19:00",
        max_spots: 16,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
  // A wedding weekend run by a planner, invitation only: each moment of the
  // weekend is a dated event, and households answer through their own link
  // (see seedWeddingGuests below for the guest list, tables and the sample
  // invitation the landing card opens). The three days are derived from one
  // Saturday so they always stay in order.
  {
    path: "/events/boda-valeria-y-diego",
    ownerKey: "weddings",
    provider: {
      full_name: "Mariana Salgado",
      business_name: "Boda de Valeria & Diego",
      email: demoOwnerEmail("weddings"),
      vertical: "events",
      slug: "boda-valeria-y-diego",
      custom_slug: "boda-valeria-y-diego",
      plan_tier: "premium",
      language: "es",
      timezone: "America/Mexico_City",
      booking_window_days: 120,
      phone_number_1: "+52 777 555 0193",
      phone_number_2: "",
      address_1: "Jardín de la hacienda, Xochitepec, Morelos",
      address_2: "Centro histórico, Cuernavaca, Morelos",
      hero_text: "Nos elegimos, hoy y siempre.",
      vocabulary: "weddings",
      rsvp_mode: "invitations",
      default_invitation_seats: 2,
      // Answers close three weeks before, when the banquet needs its numbers.
      rsvp_deadline: daysFrom(WEDDING_DAY, -21),
      story:
        "Nos conocimos hablando hasta la madrugada y no dejamos de hacerlo. Seis años después, entre las nubes de Monteverde, Diego preguntó y Valeria dijo que sí. Queremos celebrarlo con ustedes en Xochitepec, a la sombra de un ahuehuete.",
      rsvp_questions: [
        {
          id: "menu",
          kind: "choice",
          label: "Menú",
          options: [
            { id: "res", label: "Res" },
            { id: "pescado", label: "Pescado" },
            { id: "vegetariano", label: "Vegetariano" },
          ],
          per: "guest",
          eventIds: [],
        },
        { id: "diet", kind: "text", label: "", options: [], per: "guest", eventIds: [] },
        { id: "shuttle", kind: "text", label: "", options: [], per: "invitation", eventIds: [] },
      ],
      seating_published: true,
      seating_published_at: new Date().toISOString(),
      gallery_image_urls: [],
      availability: {
        sunday: openDay("10:00", "15:00"),
        monday: closedDay("10:00", "15:00"),
        tuesday: closedDay("10:00", "15:00"),
        wednesday: closedDay("10:00", "15:00"),
        thursday: closedDay("10:00", "15:00"),
        friday: openDay("19:00", "23:00"),
        saturday: openDay("16:00", "23:30"),
      },
    },
    services: [
      {
        name: "Cena de bienvenida",
        slug: "cena-de-bienvenida",
        booking_type: "appointment",
        duration_minutes: 180,
        description:
          "La noche antes de la boda: cena, mezcal y música en una terraza del centro de Cuernavaca, para que las dos familias se conozcan.",
        medical_specialty: null,
        capacity: "90 invitados",
        cost: "Sin costo",
        notes: "Vestimenta casual elegante.",
        cancellation_policy: "Si sus planes cambian, cancele desde su enlace personal para liberar el lugar.",
        traveler_fields: [],
        sort_order: 10,
        occurrence_mode: "single",
        weekdays: [],
        occurrence_date: daysFrom(WEDDING_DAY, -1),
        start_time: "19:30",
        end_time: "22:30",
        max_spots: 90,
        linked_address_2: true,
        linked_phone_1: true,
      },
      {
        name: "Ceremonia y recepción",
        slug: "ceremonia-y-recepcion",
        booking_type: "appointment",
        duration_minutes: 420,
        description:
          "Ceremonia a la sombra del ahuehuete a las 4:30 p. m., cóctel en el jardín, cena de tres tiempos y baile hasta las 11:30 p. m.",
        medical_specialty: null,
        capacity: "180 invitados",
        cost: "Sin costo",
        notes:
          "Formal de jardín: la ceremonia es sobre pasto, se recomienda tacón ancho. Celebración solo para adultos. Hay transporte desde los hoteles de Cuernavaca.",
        cancellation_policy:
          "Si sus planes cambian, cancele desde su enlace personal a más tardar tres semanas antes, cuando cerramos mesas con el banquete.",
        traveler_fields: [],
        sort_order: 20,
        occurrence_mode: "single",
        weekdays: [],
        occurrence_date: WEDDING_DAY,
        start_time: "16:30",
        end_time: "23:30",
        max_spots: 180,
        linked_address_1: true,
        linked_phone_1: true,
      },
      {
        name: "Tornaboda",
        slug: "tornaboda",
        booking_type: "appointment",
        duration_minutes: 180,
        description:
          "Brunch tranquilo al día siguiente en el mismo jardín: chilaquiles, café de olla y la última foto juntos antes de volver a casa.",
        medical_specialty: null,
        capacity: "70 invitados",
        cost: "Sin costo",
        notes: "Vestimenta casual.",
        cancellation_policy: "Si sus planes cambian, cancele desde su enlace personal para liberar el lugar.",
        traveler_fields: [],
        sort_order: 30,
        occurrence_mode: "single",
        weekdays: [],
        occurrence_date: daysFrom(WEDDING_DAY, 1),
        start_time: "11:00",
        end_time: "14:00",
        max_spots: 70,
        linked_address_1: true,
        linked_phone_1: true,
      },
    ],
  },
];

// The wedding demo's guest list. Fictional households in every state a
// planner meets: answered, partly attending, declined, silent (some already
// reminded), plus the sample invitation the landing card opens, whose token
// lib/demo-pages.ts shares. Re-seeding resets all of it.
const SAMPLE_INVITATION_TOKEN = "DemoBodaValeriaYDiego-sample-invitation-001";

// [household, phone, seats, guests, answer, contacted]
// answer: "all" (every event), "main" (reception and brunch only), "reception"
// (reception only), "declined", or "none" (no answer yet).
const WEDDING_HOUSEHOLDS = [
  ["Familia Ortiz Salgado", "+52 777 555 0101", 4, ["Ana Ortiz", "Luis Ortiz", "Sofía Ortiz", "Mateo Ortiz"], "all", true],
  ["Familia Ruiz", "+52 777 555 0102", 2, ["Marta Ruiz", "Andrés Ruiz"], "all", true],
  ["Abuela Rosa", "+52 777 555 0103", 1, ["Rosa Herrera"], "reception", true],
  ["Familia Paz", "+52 777 555 0104", 3, ["Elena Paz", "Jorge Paz", ""], "main", true],
  ["Tío Ramón y Lupita", "+52 777 555 0105", 2, ["Ramón Castillo", "Guadalupe Ríos"], "all", true],
  ["Fernanda Gil", "+52 55 5555 0106", 2, ["Fernanda Gil", ""], "all", true],
  ["Familia Navarro", "+52 55 5555 0107", 4, ["Diana Navarro", "Pablo Navarro", "Lucía Navarro"], "main", true],
  ["Carlos Méndez", "+52 55 5555 0108", 1, ["Carlos Méndez"], "declined", true],
  ["Familia Torres", "+52 33 5555 0109", 3, ["Isabel Torres", "Raúl Torres", "Emilia Torres"], "all", true],
  ["Valentina Cruz", "+52 33 5555 0110", 2, ["Valentina Cruz", "Iván Soto"], "reception", true],
  ["Familia Domínguez", "+52 81 5555 0111", 2, ["Héctor Domínguez", "Claudia Peña"], "declined", true],
  ["Sebastián Vega", "+52 81 5555 0112", 2, ["Sebastián Vega", ""], "all", true],
  ["Familia Aguilar", "+52 777 555 0113", 4, ["Rocío Aguilar", "Tomás Aguilar", "Paula Aguilar", "Diego Aguilar"], "main", true],
  ["Mariana y Leo", "+52 777 555 0114", 2, ["Mariana León", "Leonardo Ibarra"], "all", true],
  ["Familia Herrera", "+52 777 555 0115", 3, ["Gabriela Herrera", "Óscar Herrera"], "all", true],
  ["Daniela Fuentes", "+52 55 5555 0116", 1, ["Daniela Fuentes"], "reception", true],
  ["Familia Rojas", "+52 55 5555 0117", 2, ["Patricia Rojas", "Manuel Rojas"], "declined", true],
  ["Natalia Ríos", "+52 55 5555 0118", 2, ["Natalia Ríos", "Bruno Lara"], "all", true],
  ["Familia Campos", "+52 222 555 0119", 4, ["Alejandra Campos", "Ricardo Campos", "Inés Campos"], "main", true],
  ["Javier Morales", "+52 222 555 0120", 2, ["Javier Morales", ""], "all", true],
  ["Familia Silva", "+52 222 555 0121", 3, ["Laura Silva", "Eduardo Silva", "Camila Silva"], "reception", true],
  ["Regina Flores", "+52 33 5555 0122", 2, ["Regina Flores", "Pedro Ávila"], "declined", true],
  ["Familia Luna", "+52 777 555 0123", 2, [], "none", true],
  ["Familia Sandoval", "+52 777 555 0124", 3, ["Verónica Sandoval"], "none", true],
  ["Arturo Peña", "+52 55 5555 0125", 1, [], "none", false],
  ["Familia Ibáñez", "+52 55 5555 0126", 4, [], "none", false],
  ["Clara y Emilio", "+52 81 5555 0127", 2, ["Clara Mejía", "Emilio Rangel"], "none", true],
  ["Familia Cortés", "", 3, [], "none", false],
  ["Renata Salas", "+52 33 5555 0129", 2, [], "none", false],
];

const MENU_PICKS = ["res", "pescado", "res", "vegetariano", "pescado", "res"];
const DIET_NOTES = { 2: "Sin gluten", 9: "Alergia a los mariscos", 17: "Vegana" };
const SHUTTLE_HOTELS = ["Hotel Casa Colonial", "", "Hotel Las Mañanitas", "", "Posada del Sol"];

function hashToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function insertRows(table, rows, columns) {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from(table).insert(rows).select(columns);
  if (error) throw error;
  return data;
}

async function seedWeddingGuests(providerId) {
  // Answers, seats and arrivals go with their invitations (cascade).
  for (const table of ["invitations", "seating_tables"]) {
    const { error } = await supabase.from(table).delete().eq("provider_id", providerId);
    if (error) throw error;
  }

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, slug")
    .eq("provider_id", providerId);
  if (servicesError) throw servicesError;
  const eventId = Object.fromEntries(services.map((service) => [service.slug, service.id]));
  const dinner = eventId["cena-de-bienvenida"];
  const reception = eventId["ceremonia-y-recepcion"];
  const brunch = eventId["tornaboda"];
  const attendsBy = {
    all: [dinner, reception, brunch],
    main: [reception, brunch],
    reception: [reception],
    declined: [],
    none: [],
  };

  const now = Date.now();
  const households = [
    ...WEDDING_HOUSEHOLDS.map(([name, phone, seats, guests, answer, contacted], index) => ({
      name,
      phone,
      seats,
      guests,
      answer,
      contacted,
      token: randomBytes(32).toString("base64url"),
      submittedAt: answer === "none" ? null : new Date(now - (index + 1) * 9 * 3_600_000).toISOString(),
      shuttle: answer !== "none" && answer !== "declined" ? SHUTTLE_HOTELS[index % SHUTTLE_HOTELS.length] : "",
    })),
    // The sample: unanswered, with two names and room for a plus-one.
    {
      name: "Familia Ejemplo",
      phone: "",
      seats: 3,
      guests: ["Andrea Ejemplo", "Rafael Ejemplo"],
      answer: "none",
      contacted: true,
      token: SAMPLE_INVITATION_TOKEN,
      submittedAt: null,
      shuttle: "",
    },
  ];

  const invitations = await insertRows(
    "invitations",
    households.map((household) => ({
      provider_id: providerId,
      display_name: household.name,
      contact_phone: household.phone,
      seat_limit: household.seats,
      token: household.token,
      token_hash: hashToken(household.token),
      submitted_at: household.submittedAt,
      last_contacted_at: household.contacted ? new Date(now - 14 * 86_400_000).toISOString() : null,
      answers: household.shuttle ? { shuttle: household.shuttle } : {},
    })),
    "id, token",
  );
  const invitationId = new Map(invitations.map((row) => [row.token, row.id]));

  await insertRows(
    "invitation_events",
    households.flatMap((household) =>
      [dinner, reception, brunch].map((serviceId) => ({
        invitation_id: invitationId.get(household.token),
        service_id: serviceId,
      })),
    ),
    "invitation_id",
  );

  let person = 0;
  const guestRows = households.flatMap((household) =>
    household.guests.map((name, position) => {
      const attending = attendsBy[household.answer].length > 0;
      const answers = {};
      if (attending) {
        answers.menu = MENU_PICKS[person % MENU_PICKS.length];
        if (DIET_NOTES[person]) answers.diet = DIET_NOTES[person];
      }
      person += 1;
      return { invitation_id: invitationId.get(household.token), name, position, answers };
    }),
  );
  const guests = await insertRows("invitation_guests", guestRows, "id, invitation_id, position");

  // Six round tables of ten for the reception, filled household by household;
  // the last two answered households wait unseated, as they would a week out.
  const tables = await insertRows(
    "seating_tables",
    Array.from({ length: 6 }, (_, index) => ({
      provider_id: providerId,
      service_id: reception,
      name: `Mesa ${index + 1}`,
      seat_count: 10,
      position: index,
    })),
    "id, position",
  );
  tables.sort((a, b) => a.position - b.position);
  const seated = households.filter((household) => attendsBy[household.answer].includes(reception)).slice(0, -2);
  const seatedTokens = new Set(seated.map((household) => household.token));

  let seat = 0;
  const attendance = [];
  for (const household of households) {
    if (household.answer === "none") continue;
    const id = invitationId.get(household.token);
    for (const guest of guests.filter((row) => row.invitation_id === id).sort((a, b) => a.position - b.position)) {
      for (const serviceId of [dinner, reception, brunch]) {
        const attending = attendsBy[household.answer].includes(serviceId);
        const atTable = attending && serviceId === reception && seatedTokens.has(household.token);
        attendance.push({
          guest_id: guest.id,
          service_id: serviceId,
          attending,
          table_id: atTable ? tables[Math.min(Math.floor(seat / 10), tables.length - 1)].id : null,
        });
        if (atTable) seat += 1;
      }
    }
  }
  await insertRows("guest_attendance", attendance, "guest_id");
}

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

// A full run overwrites whatever the super admin has edited on the demos, so
// `--only=<ownerKey>` publishes one demo and leaves the others alone.
const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const selected = only ? examples.filter((example) => example.ownerKey === only) : examples;
if (selected.length === 0) {
  throw new Error(`No example with the owner key "${only}".`);
}

for (const example of selected) {
  // Re-running re-parents an existing demo row to its own owner, which is how
  // demos seeded under a single shared account get migrated.
  const ownerUserId = await getOrCreateDemoOwner(demoOwnerEmail(example.ownerKey));

  const { error: publicationError } = await supabase
    .from("user_publication_settings")
    .upsert({ user_id: ownerUserId, publishing_enabled: true }, { onConflict: "user_id" });
  if (publicationError) throw publicationError;

  const providerId = await upsertProvider(ownerUserId, example);
  await upsertServices(providerId, example.services);
  if (example.ownerKey === "weddings") await seedWeddingGuests(providerId);
}

console.log("Published example booking pages:");
for (const example of selected) {
  console.log(`  ${example.path}`);
}
