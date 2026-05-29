import { pad } from "./utils";
import { WEEKDAY_KEYS } from "./constants";
import type { WeekdayKey } from "./types";

export function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function addMinutes(time: string, amount: number) {
  const total = toMinutes(time) + amount;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${pad(hours)}:${pad(minutes)}`;
}

export function getDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function compareDateKeys(left: string, right: string) {
  return parseDateKey(left).getTime() - parseDateKey(right).getTime();
}

export function getWeekStart(date: Date) {
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -date.getDay());
}

export function createWeekWindow(start: Date, weeksToShow: number) {
  return Array.from({ length: weeksToShow }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) =>
      addDays(start, weekIndex * 7 + dayIndex),
    ),
  );
}

export function createRollingWeekWindow(reference: Date, pastDays: number, weeksToShow: number) {
  const start = getWeekStart(addDays(reference, -pastDays));
  const end = addDays(start, weeksToShow * 7 - 1);

  return {
    start,
    end,
    startKey: getDateKey(start),
    endKey: getDateKey(end),
    weeks: createWeekWindow(start, weeksToShow),
  };
}

export function createMonthMatrix(anchor: Date) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) =>
      addDays(gridStart, weekIndex * 7 + dayIndex),
    ),
  );
}

export function clampDateKey(dateKey: string, minimumDateKey: string, maximumDateKey: string) {
  if (compareDateKeys(dateKey, minimumDateKey) < 0) {
    return minimumDateKey;
  }

  if (compareDateKeys(dateKey, maximumDateKey) > 0) {
    return maximumDateKey;
  }

  return dateKey;
}

export function compareMonthAnchors(left: Date, right: Date) {
  if (left.getFullYear() !== right.getFullYear()) {
    return left.getFullYear() - right.getFullYear();
  }

  return left.getMonth() - right.getMonth();
}

export function getWeekdayKey(dateKey: string): WeekdayKey {
  return WEEKDAY_KEYS[parseDateKey(dateKey).getDay()];
}

export function todayKey() {
  return getDateKey(new Date());
}

export function isPastDate(dateKey: string) {
  return compareDateKeys(dateKey, todayKey()) < 0;
}

export function getTimeKeyFromDate(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
