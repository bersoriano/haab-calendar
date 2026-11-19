export function managedBookingCalendarLabel(status: string, serviceName: string, paymentStatus?: string | null) {
  const pending = status === "pending_payment_verification" || status === "payment_action_required";
  if (pending) return { summary: `Pending payment · ${serviceName}`,
    visibility: "private" as const, transparency: "opaque" as const };
  if (paymentStatus) return { summary: serviceName,
    visibility: "default" as const, transparency: "opaque" as const };
  return { summary: serviceName };
}
