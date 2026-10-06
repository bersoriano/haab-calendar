import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildBookingEmails,
  createBookingEmailHandler,
  sendBookingEmailImmediately,
  sendBookingEmailBatch,
  type BookingEmailContext,
} from "@/lib/email/booking-created";
import type { IntegrationOutboxEvent } from "@/lib/integrations/outbox/types";

const context: BookingEmailContext = {
  booking: {
    id: "booking-1",
    provider_id: "provider-1",
    service_name: "Consultation",
    client_name: "Ada Lovelace",
    client_email: "ada@example.com",
    client_phone: "+525512345678",
    date: "2026-10-12",
    start_time: "14:30:00",
    end_time: "15:00:00",
    location_snapshot: "Main office",
    status: "confirmed",
  },
  provider: {
    id: "provider-1",
    business_name: "Clinica Sol",
    email: "doctor@example.com",
    timezone: "America/Mexico_City",
    language: "en",
  },
};

const event = {
  id: "event-1",
  providerId: "provider-1",
  bookingId: "booking-1",
  eventType: "booking.created",
  aggregateVersion: 1,
  payloadSchemaVersion: 1,
  payload: {
    bookingId: "booking-1",
    providerId: "provider-1",
    aggregateVersion: 1,
    change: "booking.created",
  },
  attemptCount: 1,
  leaseToken: "lease-1",
} satisfies IntegrationOutboxEvent;

describe("booking creation email", () => {
  it("builds separate customer and provider messages with appointment details", () => {
    const messages = buildBookingEmails(context, "Haab <bookings@example.com>");

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      to: ["ada@example.com"],
      subject: "Appointment confirmed: Consultation",
    });
    expect(messages[0].text).toContain("Clinica Sol");
    expect(messages[0].text).toContain("2026-10-12");
    expect(messages[0].text).toContain("14:30");
    expect(messages[0].text).toContain("America/Mexico_City");
    expect(messages[1]).toMatchObject({
      to: ["doctor@example.com"],
      subject: "New booking: Consultation",
    });
    expect(messages[1].text).toContain("Ada Lovelace");
    expect(messages[1].text).toContain("ada@example.com");
    expect(messages[1].text).toContain("14:30");
  });

  it("uses Spanish copy and all-day wording when provider language is Spanish", () => {
    const messages = buildBookingEmails(
      {
        booking: { ...context.booking, start_time: null, end_time: null },
        provider: { ...context.provider, language: "es" },
      },
      "Haab <bookings@example.com>",
    );

    expect(messages[0].subject).toBe("Cita confirmada: Consultation");
    expect(messages[0].text).toContain("Todo el día");
  });

  it("sends both emails in one idempotent batch", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "mail-1" }, { id: "mail-2" }] }), {
        status: 200,
      }),
    );

    await sendBookingEmailBatch({
      context,
      apiKey: "test-key",
      from: "Haab <bookings@example.com>",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails/batch");
    expect(init.headers).toMatchObject({ "Idempotency-Key": "booking-created/booking-1" });
    expect(JSON.parse(init.body as string)).toHaveLength(2);
  });

  it("retries send failure and only supports created events", async () => {
    const handler = createBookingEmailHandler({
      load: async () => context,
      send: async () => { throw new Error("network failed"); },
      config: () => ({ apiKey: "test-key", from: "Haab <bookings@example.com>" }),
    });

    expect(handler.supports(event)).toBe(true);
    expect(handler.supports({ ...event, eventType: "booking.updated" })).toBe(false);
    expect(await handler.deliver(event)).toEqual({
      outcome: "retryable_failure",
      errorCode: "email_send_failed",
    });
  });

  it("retries while email credentials are missing", async () => {
    const load = vi.fn(async () => context);
    const handler = createBookingEmailHandler({
      load,
      config: () => ({ apiKey: "", from: "" }),
    });

    expect(await handler.deliver(event)).toEqual({
      outcome: "retryable_failure",
      errorCode: "email_unconfigured",
    });
    expect(load).not.toHaveBeenCalled();
  });

  it("retries when Resend does not acknowledge both messages", async () => {
    await expect(
      sendBookingEmailBatch({
        context,
        apiKey: "test-key",
        from: "Haab <bookings@example.com>",
        fetcher: async () =>
          new Response(JSON.stringify({ data: [{ id: "mail-1" }] }), { status: 200 }),
      }),
    ).rejects.toThrow("both booking emails");
  });

  it("sends immediately after booking creation and records delivery for outbox replay", async () => {
    const send = vi.fn(async () => undefined);
    const markDelivered = vi.fn(async () => undefined);

    const result = await sendBookingEmailImmediately(
      { bookingId: event.bookingId, providerId: event.providerId },
      {
        findCreatedEvent: async () => event,
        load: async () => context,
        send,
        markDelivered,
        config: () => ({ apiKey: "test-key", from: "Haab <bookings@example.com>" }),
      },
    );

    expect(result).toEqual({ outcome: "succeeded" });
    expect(send).toHaveBeenCalledOnce();
    expect(markDelivered).toHaveBeenCalledWith(event);
  });

  it("does not resend a booking already marked delivered", async () => {
    const send = vi.fn(async () => undefined);
    const handler = createBookingEmailHandler({
      send,
      config: () => ({ apiKey: "", from: "" }),
    });

    expect(
      await handler.deliver({
        ...event,
        payload: { ...event.payload, bookingEmailAcceptedAt: "2026-10-06T05:00:00Z" },
      }),
    ).toEqual({ outcome: "succeeded" });
    expect(send).not.toHaveBeenCalled();
  });

  it("retries when delivery receipt cannot be saved", async () => {
    const handler = createBookingEmailHandler({
      load: async () => context,
      send: async () => undefined,
      markDelivered: async () => { throw new Error("database unavailable"); },
      config: () => ({ apiKey: "test-key", from: "Haab <bookings@example.com>" }),
    });

    expect(await handler.deliver(event)).toEqual({
      outcome: "retryable_failure",
      errorCode: "email_receipt_write_failed",
    });
  });
});
