// Pure validation for provider image uploads (header now, gallery later).
// Kept framework-free so it can run client-side before upload and be unit-tested.

export const MAX_HEADER_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_LOGO_IMAGE_BYTES = 1 * 1024 * 1024; // 1 MB
export const MAX_SERVICE_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
/** Matches the services_photo_urls_limit constraint. */
export const MAX_SERVICE_PHOTOS = 5;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPTED_IMAGE_EXTENSIONS = ".jpg,.jpeg,.png,.webp";

export type ImageValidationResult = { ok: true } | { ok: false; error: string };

type ValidatableFile = { type: string; size: number };

export function validateImageFile(
  file: ValidatableFile,
  maxBytes: number = MAX_HEADER_IMAGE_BYTES,
): ImageValidationResult {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Use a JPG, PNG, or WEBP image." };
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, error: `Image must be ${mb} MB or smaller.` };
  }
  return { ok: true };
}

/**
 * The photos a service keeps: real URLs only, no repeats, at most the limit.
 * A site-relative path is allowed for images shipped with the app. Anything
 * else is dropped rather than failing the whole save.
 */
export function normalizePhotoUrls(source: unknown): string[] {
  if (!Array.isArray(source)) return [];
  const seen = new Set<string>();

  for (const entry of source) {
    if (typeof entry !== "string") continue;
    const url = entry.trim();
    if (/^https?:\/\/\S+$/i.test(url) || /^\/(?!\/)\S*$/.test(url)) {
      seen.add(url);
    }
  }

  return [...seen].slice(0, MAX_SERVICE_PHOTOS);
}
