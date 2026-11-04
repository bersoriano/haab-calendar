import { describe, it, expect } from "vitest";
import {
  validateImageFile,
  MAX_HEADER_IMAGE_BYTES,
  MAX_LOGO_IMAGE_BYTES,
  MAX_SERVICE_PHOTOS,
  normalizePhotoUrls,
} from "@/lib/image-upload";

describe("validateImageFile", () => {
  it("accepts jpeg, png, and webp", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateImageFile({ type, size: 1024 })).toEqual({ ok: true });
    }
  });

  it("rejects non-image / unsupported types", () => {
    const result = validateImageFile({ type: "image/gif", size: 1024 });
    expect(result.ok).toBe(false);
  });

  it("rejects files larger than the cap", () => {
    const result = validateImageFile({
      type: "image/png",
      size: MAX_HEADER_IMAGE_BYTES + 1,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the cap", () => {
    expect(
      validateImageFile({ type: "image/png", size: MAX_HEADER_IMAGE_BYTES }),
    ).toEqual({ ok: true });
  });

  it("honors a custom max size", () => {
    expect(validateImageFile({ type: "image/png", size: 2048 }, 1024).ok).toBe(false);
  });

  it("enforces the 1 MB logo limit", () => {
    expect(
      validateImageFile({ type: "image/png", size: MAX_LOGO_IMAGE_BYTES }, MAX_LOGO_IMAGE_BYTES),
    ).toEqual({ ok: true });
    expect(
      validateImageFile(
        { type: "image/png", size: MAX_LOGO_IMAGE_BYTES + 1 },
        MAX_LOGO_IMAGE_BYTES,
      ).ok,
    ).toBe(false);
  });
});

describe("normalizePhotoUrls", () => {
  it("keeps real URLs and app paths, once each, up to the limit", () => {
    expect(
      normalizePhotoUrls([" https://a.example/1.jpg ", "https://a.example/1.jpg", "/demo/2.jpg"]),
    ).toEqual(["https://a.example/1.jpg", "/demo/2.jpg"]);
    expect(
      normalizePhotoUrls(Array.from({ length: 9 }, (_, i) => `https://a.example/${i}.jpg`)),
    ).toHaveLength(MAX_SERVICE_PHOTOS);
  });

  it("drops what could not be a safe image source", () => {
    expect(
      normalizePhotoUrls(["javascript:alert(1)", "//evil.example/a.jpg", "data:image/png;base64,AA", "", 7]),
    ).toEqual([]);
    expect(normalizePhotoUrls(undefined)).toEqual([]);
  });
});
