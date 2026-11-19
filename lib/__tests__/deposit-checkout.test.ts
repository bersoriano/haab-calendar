import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { detectReceiptMime, hashCheckoutToken, isDecodableReceiptImage, matchesCheckoutToken } from "@/lib/deposit-receipt-validation";
import { managedBookingCalendarLabel } from "@/lib/google/deposit-summary";

describe("receipt image validation", () => {
  it("accepts JPEG, PNG, and WebP signatures", () => {
    expect(detectReceiptMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(detectReceiptMime(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe("image/png");
    expect(detectReceiptMime(new TextEncoder().encode("RIFFxxxxWEBP"))).toBe("image/webp");
  });

  it("rejects content that merely has an image filename", () => {
    expect(detectReceiptMime(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(detectReceiptMime(new Uint8Array())).toBeNull();
  });

  it("decodes pixels and rejects a truncated image with a valid signature", async () => {
    const image = await sharp({ create: { width: 2, height: 2, channels: 3,
      background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();
    expect(await isDecodableReceiptImage(image, "image/png")).toBe(true);
    expect(await isDecodableReceiptImage(image.subarray(0, 12), "image/png")).toBe(false);
  });

  it("hashes a checkout capability before storage", () => {
    expect(hashCheckoutToken("secret")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCheckoutToken("secret")).not.toContain("secret");
    expect(matchesCheckoutToken(hashCheckoutToken("secret"), "secret")).toBe(true);
    expect(matchesCheckoutToken(hashCheckoutToken("secret"), "wrong")).toBe(false);
  });
});

describe("Google Calendar deposit label", () => {
  it("reserves pending slots as private busy events", () => {
    expect(managedBookingCalendarLabel("pending_payment_verification", "Studio"))
      .toEqual({ summary: "Pending payment · Studio", visibility: "private", transparency: "opaque" });
    expect(managedBookingCalendarLabel("payment_action_required", "Studio"))
      .toEqual({ summary: "Pending payment · Studio", visibility: "private", transparency: "opaque" });
  });

  it("restores regular event label after confirmation", () => {
    expect(managedBookingCalendarLabel("confirmed", "Studio", "payment_confirmed"))
      .toEqual({ summary: "Studio", visibility: "default", transparency: "opaque" });
  });
});
