import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildReminderEmail } from "@/lib/email/booking-reminders";
import { bookingIdFromReminderManageToken, createReminderManageToken } from "@/lib/email/reminder-link";

const bookingId = "00000000-0000-4000-8000-000000000123";
const reminder = {
  id: "reminder-1", booking_id: bookingId, provider_id: "provider-1",
  reminder_type: "primary" as const, appointment_at: "2026-12-02T15:00:00.000Z",
  status: "processing", attempt_count: 1, lease_token: "lease-1",
};
const booking = {
  id: bookingId, provider_id: "provider-1", service_id: "service-1",
  service_name: "Consultation", booking_type: "appointment", duration_minutes_snapshot: 30,
  client_email: "guest@example.com", client_language: null, date: "2026-12-02", start_time: "09:00:00", status: "confirmed",
};
const provider = {
  id: "provider-1", business_name: "Clinic", email: "clinic@example.com",
  slug: "clinic", vertical: "healthcare" as const, timezone: "America/Mexico_City",
  language: "en", reminders_enabled: true, reminder_message: "Please arrive early.",
};

describe("booking reminder email", () => {
  it("includes required details and self-service link without client notes", () => {
    const email = buildReminderEmail({ booking, provider, reminder,
      manageUrl: "https://haabcalendar.com/doctors/clinic/manage/private", fromAddress: "booking@example.com" });
    expect(email.subject).toBe("Appointment reminder: Consultation");
    expect(email.text).toContain("Duration: 30 minutes");
    expect(email.text).toContain("Time: 9:00 AM (America/Mexico_City)");
    expect(email.text).toContain("Reschedule or cancel: https://haabcalendar.com/");
    expect(email.html).toContain("<meta name=\"viewport\"");
    expect(email.reply_to).toBe("clinic@example.com");
    expect(email.from).toBe("Clinic <booking@example.com>");
    expect(email.text).not.toContain("guest@example.com");
  });

  it("localizes Spanish and escapes owner message in HTML", () => {
    const email = buildReminderEmail({ booking: { ...booking, client_language: "es" }, provider: {
      ...provider, reminder_message: "<script>alert('x')</script>",
    }, reminder, manageUrl: "https://example.com/manage", fromAddress: "booking@example.com" });
    expect(email.subject).toBe("Recordatorio de cita: Consultation");
    expect(email.text).toContain("Duración: 30 minutos");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("reminder management links", () => {
  it("uses stable signatures and rejects tampering", () => {
    vi.stubEnv("REMINDER_LINK_SECRET", "a-secret-longer-than-thirty-two-characters");
    const token = createReminderManageToken(bookingId);
    expect(createReminderManageToken(bookingId)).toBe(token);
    expect(bookingIdFromReminderManageToken(token)).toBe(bookingId);
    expect(bookingIdFromReminderManageToken(`${token.slice(0, -1)}x`)).toBeNull();
    vi.unstubAllEnvs();
  });
});
