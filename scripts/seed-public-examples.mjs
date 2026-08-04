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

const demoOwnerEmail = "public-examples@haab-calendar.invalid";

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
    provider: {
      full_name: "Dr. Maya Rivera",
      business_name: "Rivera Family Medicine",
      email: demoOwnerEmail,
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
    provider: {
      full_name: "Alex Morgan",
      business_name: "Riverside Padel Club",
      email: demoOwnerEmail,
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
      hero_text: "Your court is ready when you are.",
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
        description: "A climate-controlled court with rackets and match balls available.",
        medical_specialty: null,
        capacity: "Up to 4 players",
        cost: "$48 / hour",
        notes: "Arrive 10 minutes early for check-in.",
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
        description: "Court time plus a one-on-one session with a club coach.",
        medical_specialty: null,
        capacity: "1–2 players",
        cost: "$120 / session",
        notes: "Equipment is included.",
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
    provider: {
      full_name: "Jordan Lee",
      business_name: "Northstar Strategy",
      email: demoOwnerEmail,
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
    provider: {
      full_name: "Samira Chen",
      business_name: "Makers Workshop",
      email: demoOwnerEmail,
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
];

async function getOrCreateDemoOwner() {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const existing = data.users.find((user) => user.email === demoOwnerEmail);
    if (existing) return existing.id;
    if (data.users.length < 100) break;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: demoOwnerEmail,
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

const ownerUserId = await getOrCreateDemoOwner();

const { error: publicationError } = await supabase
  .from("user_publication_settings")
  .upsert({ user_id: ownerUserId, publishing_enabled: true }, { onConflict: "user_id" });
if (publicationError) throw publicationError;

for (const example of examples) {
  const providerId = await upsertProvider(ownerUserId, example);
  await upsertServices(providerId, example.services);
}

console.log("Published example booking pages:");
for (const example of examples) {
  console.log(`  ${example.path}`);
}
