import { addDays, getDateKey, parseDateKey } from "@/lib/date";
import type { BookingRecord, BookingStatus, BookingType } from "@/lib/types";

export type BookingListSort = "closest" | "sooner" | "latest";
export type BookingListView = "active" | "archive";

/** Lowercased with accents dropped, so "jose" finds "José". */
function fold(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Every word of the search must be found in the booking. A word made only of
 * phone characters is also compared digit to digit, so "9981234567" finds
 * "+52 (998) 123-4567" however either one is spaced or punctuated.
 */
function searchMatcher(search: string) {
  const terms = fold(search)
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({ text, digits: /^[\d()+.-]+$/.test(text) ? text.replace(/\D/g, "") : "" }));

  return (booking: BookingRecord) => {
    if (terms.length === 0) return true;
    const text = fold(
      [booking.clientName, booking.clientEmail, booking.clientPhone, booking.serviceName, booking.dateKey].join(" "),
    );
    const phone = (booking.clientPhone ?? "").replace(/\D/g, "");
    return terms.every(
      (term) => text.includes(term.text) || (term.digits !== "" && phone.includes(term.digits)),
    );
  };
}

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
  const matchesSearch = searchMatcher(search);
  const today = Date.parse(`${todayKey}T00:00:00Z`);
  // Search and filters apply to both views; only the date decides the view.
  const matches = items.filter((booking) =>
    (status === "all" || booking.status === status) &&
    (type === "all" || booking.bookingType === type) &&
    matchesSearch(booking));
  const bookings = matches.filter((booking) => (booking.dateKey < cutoff) === (view === "archive")).sort((left, right) => {
    const dateOrder = left.dateKey.localeCompare(right.dateKey);
    const timeOrder = (left.startTime ?? "00:00").localeCompare(right.startTime ?? "00:00");
    if (sort === "sooner") return dateOrder || timeOrder || left.id.localeCompare(right.id);
    if (sort === "latest") return -dateOrder || -timeOrder || left.id.localeCompare(right.id);
    // UTC calendar midnights avoid daylight-saving shifts in day distances.
    const leftDistance = Math.abs(Date.parse(`${left.dateKey}T00:00:00Z`) - today);
    const rightDistance = Math.abs(Date.parse(`${right.dateKey}T00:00:00Z`) - today);
    return leftDistance - rightDistance || -dateOrder || -timeOrder || left.id.localeCompare(right.id);
  });
  return {
    bookings,
    activeCount,
    archiveCount,
    totalCount: view === "archive" ? archiveCount : activeCount,
    /** Bookings the same search and filters find in the view not shown. */
    otherViewMatches: matches.length - bookings.length,
  };
}
