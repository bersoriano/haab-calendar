import { generateSlug } from "@/lib/public-url";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function currentTimestamp() {
  return new Date().getTime();
}

export function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function slugify(value: string) {
  return generateSlug(value);
}
