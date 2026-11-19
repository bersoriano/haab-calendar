import { createHash, timingSafeEqual } from "node:crypto";
import sharp from "sharp";

export function hashCheckoutToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function matchesCheckoutToken(storedHash: string, token: string) {
  if (!/^[0-9a-f]{64}$/.test(storedHash) || !token) return false;
  return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(hashCheckoutToken(token), "hex"));
}

export function detectReceiptMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function isDecodableReceiptImage(bytes: Uint8Array, expectedMime: string) {
  if (detectReceiptMime(bytes) !== expectedMime) return false;
  try {
    const image = sharp(Buffer.from(bytes), { failOn: "error", limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width < 2 || metadata.height < 2) return false;
    await image.stats();
    return true;
  } catch {
    return false;
  }
}
