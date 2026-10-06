import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  IntegrationOutboxEvent,
  IntegrationOutboxHandler,
} from "@/lib/integrations/outbox/types";

export type BookingEmailContext = {
  booking: {
    id: string;
    provider_id: string;
    service_name: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    location_snapshot: string | null;
    status: string;
  };
  provider: {
    id: string;
    business_name: string;
    email: string;
    timezone: string;
    language: string | null;
  };
};

type EmailMessage = {
  from: string;
  to: string[];
  subject: string;
  text: string;
};

type EmailConfig = { apiKey: string; from: string };

function appointmentTime(context: BookingEmailContext, spanish: boolean) {
  const { start_time: start, end_time: end } = context.booking;
  if (!start) return spanish ? "Todo el día" : "All day";
  return `${start.slice(0, 5)}${end ? `–${end.slice(0, 5)}` : ""} (${context.provider.timezone})`;
}

export function buildBookingEmails(
  context: BookingEmailContext,
  from: string,
): [EmailMessage, EmailMessage] {
  const { booking, provider } = context;
  const spanish = provider.language === "es";
  const cancelled = booking.status === "cancelled";
  const time = appointmentTime(context, spanish);
  const location = booking.location_snapshot?.trim();

  const customer: EmailMessage = {
    from,
    to: [booking.client_email],
    subject: spanish
      ? `${cancelled ? "Cita cancelada" : "Cita confirmada"}: ${booking.service_name}`
      : `${cancelled ? "Appointment cancelled" : "Appointment confirmed"}: ${booking.service_name}`,
    text: spanish
      ? [
          `Hola ${booking.client_name},`,
          "",
          cancelled ? "Tu cita fue cancelada." : "Tu cita está confirmada.",
          `Servicio: ${booking.service_name}`,
          `Proveedor: ${provider.business_name}`,
          `Fecha: ${booking.date}`,
          `Hora: ${time}`,
          ...(location ? [`Lugar: ${location}`] : []),
        ].join("\n")
      : [
          `Hello ${booking.client_name},`,
          "",
          cancelled ? "Your appointment was cancelled." : "Your appointment is confirmed.",
          `Service: ${booking.service_name}`,
          `Provider: ${provider.business_name}`,
          `Date: ${booking.date}`,
          `Time: ${time}`,
          ...(location ? [`Location: ${location}`] : []),
        ].join("\n"),
  };

  const owner: EmailMessage = {
    from,
    to: [provider.email],
    subject: spanish
      ? `${cancelled ? "Cita cancelada" : "Nueva reserva"}: ${booking.service_name}`
      : `${cancelled ? "Appointment cancelled" : "New booking"}: ${booking.service_name}`,
    text: spanish
      ? [
          cancelled ? "Esta cita fue cancelada." : "Recibiste una nueva reserva.",
          `Servicio: ${booking.service_name}`,
          `Fecha: ${booking.date}`,
          `Hora: ${time}`,
          ...(location ? [`Lugar: ${location}`] : []),
          `Cliente: ${booking.client_name}`,
          `Correo: ${booking.client_email}`,
          `Teléfono: ${booking.client_phone}`,
        ].join("\n")
      : [
          cancelled ? "This appointment was cancelled." : "You received a new booking.",
          `Service: ${booking.service_name}`,
          `Date: ${booking.date}`,
          `Time: ${time}`,
          ...(location ? [`Location: ${location}`] : []),
          `Customer: ${booking.client_name}`,
          `Email: ${booking.client_email}`,
          `Phone: ${booking.client_phone}`,
        ].join("\n"),
  };

  return [customer, owner];
}

async function loadBookingEmailContext(
  event: IntegrationOutboxEvent,
): Promise<BookingEmailContext | null> {
  const admin = createAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, provider_id, service_name, client_name, client_email, client_phone, date, start_time, end_time, location_snapshot, status")
    .eq("id", event.bookingId)
    .eq("provider_id", event.providerId)
    .maybeSingle<BookingEmailContext["booking"]>();

  if (bookingError) throw bookingError;
  if (!booking) return null;

  const { data: provider, error: providerError } = await admin
    .from("providers")
    .select("id, business_name, email, timezone, language")
    .eq("id", event.providerId)
    .maybeSingle<BookingEmailContext["provider"]>();

  if (providerError) throw providerError;
  if (!provider) return null;
  return { booking, provider };
}

export async function sendBookingEmailBatch(input: {
  context: BookingEmailContext;
  apiKey: string;
  from: string;
  fetcher?: typeof fetch;
}) {
  const response = await (input.fetcher ?? fetch)("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `booking-created/${input.context.booking.id}`,
    },
    body: JSON.stringify(buildBookingEmails(input.context, input.from)),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}.`);
  const result = (await response.json()) as { data?: Array<{ id?: string }> };
  if (result.data?.length !== 2 || result.data.some((item) => !item.id)) {
    throw new Error("Resend did not acknowledge both booking emails.");
  }
}

type HandlerDeps = {
  load?: (event: IntegrationOutboxEvent) => Promise<BookingEmailContext | null>;
  send?: typeof sendBookingEmailBatch;
  config?: () => EmailConfig;
};

export function createBookingEmailHandler(deps: HandlerDeps = {}): IntegrationOutboxHandler {
  return {
    key: "booking_email",
    supports: (event) => event.eventType === "booking.created",
    async deliver(event) {
      const config = deps.config?.() ?? {
        apiKey: process.env.RESEND_API_KEY?.trim() ?? "",
        from: process.env.BOOKING_EMAIL_FROM?.trim() ?? "",
      };
      if (!config.apiKey || !config.from) {
        return { outcome: "retryable_failure", errorCode: "email_unconfigured" };
      }

      let context: BookingEmailContext | null;
      try {
        context = await (deps.load ?? loadBookingEmailContext)(event);
      } catch {
        return { outcome: "retryable_failure", errorCode: "email_booking_read_failed" };
      }
      if (!context) return { outcome: "skipped", reasonCode: "email_booking_gone" };

      try {
        await (deps.send ?? sendBookingEmailBatch)({ context, ...config });
        return { outcome: "succeeded" };
      } catch {
        return { outcome: "retryable_failure", errorCode: "email_send_failed" };
      }
    },
  };
}
