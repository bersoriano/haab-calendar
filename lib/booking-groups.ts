import { addDays, getDateKey, parseDateKey } from "@/lib/date";

export type BookingDateGroup<T> = {
  dateKey: string;
  /** "today"/"tomorrow" relative to the given day; null for any other date. */
  relative: "today" | "tomorrow" | null;
  items: T[];
};

/**
 * Splits an already-sorted list into one group per date, keeping the list's
 * order inside and across groups. A date that reappears later joins the group
 * it first appeared in, so a list is never shown with the same day twice.
 */
export function groupBookingsByDate<T extends { dateKey: string }>(
  items: T[],
  todayKey: string,
): BookingDateGroup<T>[] {
  const tomorrowKey = getDateKey(addDays(parseDateKey(todayKey), 1));
  const groups = new Map<string, BookingDateGroup<T>>();

  for (const item of items) {
    let group = groups.get(item.dateKey);

    if (!group) {
      group = {
        dateKey: item.dateKey,
        relative:
          item.dateKey === todayKey ? "today" : item.dateKey === tomorrowKey ? "tomorrow" : null,
        items: [],
      };
      groups.set(item.dateKey, group);
    }

    group.items.push(item);
  }

  return [...groups.values()];
}
