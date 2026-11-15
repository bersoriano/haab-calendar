import "server-only";

/**
 * Invitation and reminder emails, sent through Resend like booking emails. The
 * planner is the Reply-To, so a household's reply reaches them, not Haab.
 */

export type InvitationEmail = { to: string; subject: string; text: string };

export type InvitationEmailConfig = { apiKey: string; from: string };

/** Resend accepts at most this many messages per batch request. */
const BATCH_SIZE = 100;

/** Null when this server cannot send email: no key or no sender address. */
export function invitationEmailConfig(): InvitationEmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.BOOKING_EMAIL_FROM?.trim() ?? "";
  return apiKey && from ? { apiKey, from } : null;
}

/**
 * Sends every message, in batches of 100, and returns how many Resend
 * accepted. Each batch carries its own idempotency key, so a retried request
 * does not send twice.
 */
export async function sendInvitationEmails(input: {
  messages: InvitationEmail[];
  config: InvitationEmailConfig;
  replyTo?: string;
  idempotencyKey: string;
  fetcher?: typeof fetch;
}): Promise<number> {
  let accepted = 0;

  for (let start = 0; start < input.messages.length; start += BATCH_SIZE) {
    const batch = input.messages.slice(start, start + BATCH_SIZE);
    const response = await (input.fetcher ?? fetch)("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${input.idempotencyKey}/${start / BATCH_SIZE}`,
      },
      body: JSON.stringify(
        batch.map((message) => ({
          from: input.config.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        })),
      ),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}.`);
    const result = (await response.json()) as { data?: Array<{ id?: string }> };
    accepted += (result.data ?? []).filter((item) => item.id).length;
  }

  return accepted;
}
