import { describe, it, expect } from "vitest";
import {
  validateImageFile,
  MAX_HEADER_IMAGE_BYTES,
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
});
