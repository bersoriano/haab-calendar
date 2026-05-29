import {
  monthFormatter,
  longDateFormatter,
  compactDateFormatter,
} from "./constants";
import { parseDateKey } from "./date";
import { pad } from "./utils";
import type { BookingStatus, BookingType, Service } from "./types";

export function formatDateLabel(dateKey: string) {
  return longDateFormatter.format(parseDateKey(dateKey));
}

export function formatCompactDate(dateKey: string) {
  return compactDateFormatter.format(parseDateKey(dateKey));
}

export function formatMonthLabel(date: Date) {
  return monthFormatter.format(date);
}

export function formatTimeLabel(time?: string) {
  if (!time) {
    return "Full Day";
  }

  const [hours, minutes] = time.split(":").map(Number);
  const meridiem = hours >= 12 ? "PM" : "AM";
  const safeHours = hours % 12 || 12;
  return `${safeHours}:${pad(minutes)} ${meridiem}`;
}

export function formatTimeRange(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) {
    return "Full Day";
  }

  return `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`;
}

export function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${pad(seconds)}`;
}

export function formatDuration(service: Service) {
  if (service.bookingType === "full-day") {
    return "Full Day";
  }

  if (!service.durationMinutes) {
    return "Appointment";
  }

  if (service.durationMinutes >= 60 && service.durationMinutes % 60 === 0) {
    const hours = service.durationMinutes / 60;
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }

  return `${service.durationMinutes} min`;
}

export function formatCapacityLabel(service: Service) {
  return service.capacity || (service.bookingType === "appointment" ? "1 client" : "Not set");
}

export function getBookingTypeLabel(type: BookingType) {
  return type === "appointment" ? "Appointment" : "Full Day";
}

export function statusTone(status: BookingStatus) {
  if (status === "cancelled") {
    return "danger";
  }

  if (status === "rescheduled") {
    return "secondary";
  }

  return "primary";
}

export function bookingTypeTone(type: BookingType) {
  return type === "appointment" ? "primary" : "secondary";
}
