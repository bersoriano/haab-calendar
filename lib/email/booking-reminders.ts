import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createReminderManageToken } from "@/lib/email/reminder-link";
import { buildManagePath } from "@/lib/public-url";
import { getSiteOrigin } from "@/lib/site-url";
import type { VerticalId } from "@/lib/types";

type Reminder = {
  id: string;
  booking_id: string;
  provider_id: string;
  reminder_type: "primary" | "secondary";
  appointment_at: string;
  status: string;
  attempt_count: number;
  lease_token: string;
};

type Booking = {
  id: string;
  provider_id: string;
  service_id: string | null;
  service_name: string;
  booking_type: string;
  duration_minutes_snapshot: number | null;
  client_email: string;
  client_language: "en" | "es" | null;
  date: string;
  start_time: string | null;
  status: string;
};

type Provider = {
  id: string;
  business_name: string;
  email: string;
  slug: string;
  vertical: VerticalId;
  timezone: string;
  language: string | null;
  reminders_enabled: boolean;
  reminder_message: string;
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export function buildReminderEmail(input: {
  booking: Booking;
  provider: Provider;
  reminder: Reminder;
  manageUrl: string;
  fromAddress: string;
}) {
  const { booking, provider, reminder, manageUrl } = input;
  const es = (booking.client_language ?? provider.language) === "es";
  const date = new Intl.DateTimeFormat(es ? "es-MX" : "en-US", {
    timeZone: provider.timezone, weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).format(new Date(reminder.appointment_at));
  const time = booking.start_time
    ? new Intl.DateTimeFormat(es ? "es-MX" : "en-US", {
        timeZone: provider.timezone, hour: "numeric", minute: "2-digit",
      }).format(new Date(reminder.appointment_at))
    : (es ? "Todo el día" : "All day");
  const duration = booking.duration_minutes_snapshot
    ? `${booking.duration_minutes_snapshot} ${es ? "minutos" : "minutes"}`
    : (es ? "Todo el día" : "All day");
  const subject = es
    ? `Recordatorio de cita: ${booking.service_name}`
    : `Appointment reminder: ${booking.service_name}`;
  const fields = es
    ? [["Servicio", booking.service_name], ["Fecha", date], ["Hora", `${time} (${provider.timezone})`],
        ["Duración", duration], ["Negocio", provider.business_name]]
    : [["Service", booking.service_name], ["Date", date], ["Time", `${time} (${provider.timezone})`],
        ["Duration", duration], ["Business", provider.business_name]];
  const snippet = provider.reminder_message.trim();
  const intro = es ? "Tu cita se acerca." : "Your appointment is coming up.";
  const action = es ? "Reprogramar o cancelar" : "Reschedule or cancel";
  const text = [intro, "", ...fields.map(([label, value]) => `${label}: ${value}`),
    ...(snippet ? ["", snippet] : []), "", `${action}: ${manageUrl}`].join("\n");
  const html = `<!doctype html><html lang="${es ? "es" : "en"}"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f5f3ef;color:#24221e;font-family:Arial,sans-serif"><main style="max-width:560px;margin:0 auto;padding:24px 16px"><section style="background:#fff;border-radius:12px;padding:24px"><h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">${escapeHtml(intro)}</h1><table role="presentation" style="width:100%;border-collapse:collapse">${fields.map(([label, value]) => `<tr><th scope="row" style="text-align:left;vertical-align:top;padding:8px 12px 8px 0;font-size:14px">${escapeHtml(label)}</th><td style="padding:8px 0;font-size:14px">${escapeHtml(value)}</td></tr>`).join("")}</table>${snippet ? `<p style="white-space:pre-wrap;line-height:1.5">${escapeHtml(snippet)}</p>` : ""}<p style="margin:24px 0 0"><a href="${escapeHtml(manageUrl)}" style="display:inline-block;background:#253f37;color:#fff;text-decoration:none;border-radius:8px;padding:13px 18px;font-weight:600">${escapeHtml(action)}</a></p><p style="overflow-wrap:anywhere;font-size:12px;line-height:1.5">${escapeHtml(manageUrl)}</p></section></main></body></html>`;
  const fromName = provider.business_name.replace(/[\r\n<>"\\]/g, " ").trim().slice(0, 80);
  return {
    from: `${fromName} <${input.fromAddress}>`,
    to: [booking.client_email],
    reply_to: provider.email,
    subject,
    text,
    html,
  };
}

async function recordOutcome(reminder: Reminder, status: "sent" | "cancelled" | "failed" | "dead_letter", errorCode?: string) {
  const admin = createAdminClient();
  const backoffMinutes = Math.min(60, 2 ** Math.min(reminder.attempt_count, 6));
  const { data, error } = await admin.from("booking_email_reminders")
    .update({
      status,
      lease_token: null,
      lease_expires_at: null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      available_at: status === "failed" ? new Date(Date.now() + backoffMinutes * 60_000).toISOString() : new Date().toISOString(),
      last_error_code: errorCode ?? null,
    })
    .eq("id", reminder.id)
    .eq("status", "processing")
    .eq("lease_token", reminder.lease_token)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function deliver(reminder: Reminder, fetcher: typeof fetch): Promise<"sent" | "cancelled" | "failed"> {
  const admin = createAdminClient();
  const [{ data: booking, error: bookingError }, { data: provider, error: providerError }] = await Promise.all([
    admin.from("bookings").select("id, provider_id, service_id, service_name, booking_type, duration_minutes_snapshot, client_email, client_language, date, start_time, status")
      .eq("id", reminder.booking_id).maybeSingle<Booking>(),
    admin.from("providers").select("id, business_name, email, slug, vertical, timezone, language, reminders_enabled, reminder_message")
      .eq("id", reminder.provider_id).maybeSingle<Provider>(),
  ]);
  if (bookingError || providerError) throw bookingError ?? providerError;
  if (!booking || !provider || booking.provider_id !== provider.id ||
      !["confirmed", "rescheduled"].includes(booking.status) || !provider.reminders_enabled ||
      new Date(reminder.appointment_at).getTime() <= Date.now()) {
    await recordOutcome(reminder, "cancelled");
    return "cancelled";
  }
  const localParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: provider.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(reminder.appointment_at));
  const part = (name: string) => localParts.find((item) => item.type === name)?.value;
  const reminderDate = `${part("year")}-${part("month")}-${part("day")}`;
  const reminderTime = `${part("hour")}:${part("minute")}`;
  if (reminderDate !== booking.date || reminderTime !== (booking.start_time?.slice(0, 5) ?? "09:00")) {
    await recordOutcome(reminder, "cancelled");
    return "cancelled";
  }
  if (booking.service_id) {
    const { data: service, error } = await admin.from("services").select("reminders_enabled")
      .eq("id", booking.service_id).maybeSingle<{ reminders_enabled: boolean }>();
    if (error) throw error;
    if (service?.reminders_enabled === false) {
      await recordOutcome(reminder, "cancelled");
      return "cancelled";
    }
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const configuredSender = process.env.BOOKING_EMAIL_FROM?.trim();
  const fromAddress = configuredSender?.match(/<([^<>]+)>$/)?.[1] ?? configuredSender;
  if (!apiKey || !fromAddress) throw new Error("reminder_email_unconfigured");
  // A cancellation or reschedule can arrive while context is loading.
  const { data: current, error: currentError } = await admin.from("booking_email_reminders")
    .select("status, lease_token").eq("id", reminder.id).maybeSingle<{ status: string; lease_token: string | null }>();
  if (currentError) throw currentError;
  if (!current || current.status !== "processing" || current.lease_token !== reminder.lease_token) return "cancelled";
  const token = createReminderManageToken(booking.id);
  const manageUrl = `${getSiteOrigin()}${buildManagePath(provider.vertical, provider.slug, token)}?lang=${booking.client_language ?? (provider.language === "es" ? "es" : "en")}`;
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `booking-reminder/${reminder.id}`,
    },
    body: JSON.stringify(buildReminderEmail({ booking, provider, reminder, manageUrl, fromAddress })),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`resend_http_${response.status}`);
  const payload = (await response.json()) as { id?: string };
  if (!payload.id) throw new Error("resend_no_acknowledgement");
  await recordOutcome(reminder, "sent");
  return "sent";
}

/** Cron retries every due row; Resend's stable idempotency key covers ambiguous HTTP outcomes. */
export async function runBookingReminderWorker(fetcher: typeof fetch = fetch) {
  const { data, error } = await createAdminClient().rpc("claim_booking_email_reminders", { p_batch_size: 50 });
  if (error) throw error;
  const summary = { claimed: (data ?? []).length, sent: 0, cancelled: 0, failed: 0 };
  for (const reminder of (data ?? []) as Reminder[]) {
    try {
      const result = await deliver(reminder, fetcher);
      summary[result] += 1;
    } catch (cause) {
      const errorCode = cause instanceof Error && /^resend_http_\d+$/.test(cause.message)
        ? cause.message : "reminder_delivery_failed";
      console.error("booking_reminder_delivery_failed", { reminderId: reminder.id, errorCode });
      await recordOutcome(reminder, reminder.attempt_count >= 8 ? "dead_letter" : "failed", errorCode);
      summary.failed += 1;
    }
  }
  return summary;
}
