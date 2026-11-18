-- Provider writes use an explicit column allowlist (20260815192227).
grant insert (
  reminders_enabled,
  reminder_primary_minutes,
  reminder_secondary_minutes,
  reminder_message
) on public.providers to authenticated;

grant update (
  reminders_enabled,
  reminder_primary_minutes,
  reminder_secondary_minutes,
  reminder_message
) on public.providers to authenticated;
