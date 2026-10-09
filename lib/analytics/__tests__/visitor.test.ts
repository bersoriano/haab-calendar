import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  classifyDevice,
  computeNetworkHash,
  computeVisitorHash,
  isLikelyBot,
  readClientIp,
} from "@/lib/analytics/visitor";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Safari/605.1.15";

describe("visitor hashing", () => {
  const base = {
    secret: "s3cret",
    providerId: "provider-1",
    ip: "203.0.113.7",
    userAgent: IPHONE,
    now: new Date("2026-10-08T15:00:00Z"),
  };

  it("is stable within a UTC day", () => {
    const later = { ...base, now: new Date("2026-10-08T23:59:59Z") };
    expect(computeVisitorHash(base)).toBe(computeVisitorHash(later));
    expect(computeVisitorHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes across days, providers and secrets", () => {
    const hash = computeVisitorHash(base);
    expect(computeVisitorHash({ ...base, now: new Date("2026-10-09T00:00:00Z") })).not.toBe(hash);
    expect(computeVisitorHash({ ...base, providerId: "provider-2" })).not.toBe(hash);
    expect(computeVisitorHash({ ...base, secret: "other" })).not.toBe(hash);
  });

  it("never contains the ip", () => {
    expect(computeVisitorHash(base)).not.toContain("203.0.113.7");
  });
});

describe("network hashing", () => {
  const base = {
    secret: "s3cret",
    providerId: "provider-1",
    ip: "203.0.113.7",
    now: new Date("2026-10-08T15:00:00Z"),
  };

  it("rotates daily and per provider, and never contains the ip", () => {
    const hash = computeNetworkHash(base);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203.0.113.7");
    expect(computeNetworkHash({ ...base, now: new Date("2026-10-09T00:00:00Z") })).not.toBe(hash);
    expect(computeNetworkHash({ ...base, providerId: "provider-2" })).not.toBe(hash);
    expect(computeNetworkHash({ ...base, ip: "203.0.113.8" })).not.toBe(hash);
  });
});

describe("request classification", () => {
  it("flags crawlers, link unfurlers and empty agents", () => {
    expect(isLikelyBot(null)).toBe(true);
    expect(isLikelyBot("WhatsApp/2.24")).toBe(true);
    expect(isLikelyBot("facebookexternalhit/1.1")).toBe(true);
    expect(isLikelyBot("Googlebot/2.1")).toBe(true);
    expect(isLikelyBot(IPHONE)).toBe(false);
  });

  it("classifies devices", () => {
    expect(classifyDevice(IPHONE)).toBe("mobile");
    expect(classifyDevice(IPAD)).toBe("tablet");
    expect(classifyDevice(MAC)).toBe("desktop");
  });

  it("reads the first forwarded address", () => {
    expect(readClientIp(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe(
      "198.51.100.1",
    );
    expect(readClientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(readClientIp(new Headers())).toBe("");
  });
});
