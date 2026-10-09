import { addDays, getDateKey, parseDateKey } from "@/lib/date";
import type { BookingRecord, BookingStatus, BookingType } from "@/lib/types";

export type BookingListSort = "closest" | "sooner" | "latest";
export type BookingListView = "active" | "archive";

/** Archive is a date-based view. Booking records and statuses stay intact. */
export function getBookingListView(
  items: BookingRecord[],
  todayKey: string,
  { view = "active", sort = "closest", search = "", status = "all", type = "all" }: {
    view?: BookingListView;
    sort?: BookingListSort;
    search?: string;
    status?: "all" | BookingStatus;
    type?: "all" | BookingType;
  } = {},
) {
  const cutoff = getDateKey(addDays(parseDateKey(todayKey), -7));
  const archiveCount = items.filter((booking) => booking.dateKey < cutoff).length;
  const activeCount = items.length - archiveCount;
  const query = search.trim().toLowerCase();
  const today = Date.parse(`${todayKey}T00:00:00Z`);
  const bookings = items.filter((booking) => {
    const archived = booking.dateKey < cutoff;
    return archived === (view === "archive") &&
      (status === "all" || booking.status === status) &&
      (type === "all" || booking.bookingType === type) &&
      (!query || [booking.clientName, booking.clientEmail, booking.clientPhone, booking.serviceName, booking.dateKey].join(" ").toLowerCase().includes(query));
  }).sort((left, right) => {
    const dateOrder = left.dateKey.localeCompare(right.dateKey);
    const timeOrder = (left.startTime ?? "00:00").localeCompare(right.startTime ?? "00:00");
    if (sort === "sooner") return dateOrder || timeOrder || left.id.localeCompare(right.id);
    if (sort === "latest") return -dateOrder || -timeOrder || left.id.localeCompare(right.id);
    // UTC calendar midnights avoid daylight-saving shifts in day distances.
    const leftDistance = Math.abs(Date.parse(`${left.dateKey}T00:00:00Z`) - today);
    const rightDistance = Math.abs(Date.parse(`${right.dateKey}T00:00:00Z`) - today);
    return leftDistance - rightDistance || -dateOrder || -timeOrder || left.id.localeCompare(right.id);
  });
  return { bookings, activeCount, archiveCount, totalCount: view === "archive" ? archiveCount : activeCount };
}
