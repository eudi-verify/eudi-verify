import { describe, it, expect } from "vitest";
import { clientIpFromHeaders } from "./client-ip.js";

describe("clientIpFromHeaders", () => {
  it("prioritizes X-Real-IP over X-Forwarded-For", () => {
    const ip = clientIpFromHeaders({
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.1, 89.187.188.227",
    });
    expect(ip).toBe("203.0.113.10");
  });

  it("uses rightmost hop from X-Forwarded-For when X-Real-IP absent", () => {
    const ip = clientIpFromHeaders({
      "x-forwarded-for": "203.0.113.10, 198.51.100.1, 89.187.188.227",
    });
    expect(ip).toBe("89.187.188.227");
  });

  it("extracts client IP from CDN proxy chain", () => {
    // Scenario: Client -> CDN Edge -> nginx (with real_ip module)
    // nginx sets X-Real-IP to the client IP (extracted from XFF before CDN edge)
    const ip = clientIpFromHeaders({
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "203.0.113.10, 89.187.188.227",
    });
    expect(ip).toBe("203.0.113.10");
  });

  it("handles different clients behind same CDN edge node", () => {
    // Different end-users routing through the same CDN PoP should get distinct IPs
    const clientA = clientIpFromHeaders({
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "203.0.113.10, 89.187.188.227",
    });
    const clientB = clientIpFromHeaders({
      "x-real-ip": "203.0.113.20",
      "x-forwarded-for": "203.0.113.20, 89.187.188.227",
    });

    expect(clientA).toBe("203.0.113.10");
    expect(clientB).toBe("203.0.113.20");
    expect(clientA).not.toBe(clientB);
  });

  it("normalizes IPv6-mapped IPv4 addresses", () => {
    const ip = clientIpFromHeaders({
      "x-real-ip": "::ffff:203.0.113.10",
    });
    expect(ip).toBe("203.0.113.10");
  });

  it("falls back to remoteAddress when no headers", () => {
    const ip = clientIpFromHeaders({}, "192.0.2.1");
    expect(ip).toBe("192.0.2.1");
  });

  it("returns 127.0.0.1 when no IP available", () => {
    const ip = clientIpFromHeaders({});
    expect(ip).toBe("127.0.0.1");
  });

  it("handles empty X-Real-IP and falls back to XFF", () => {
    const ip = clientIpFromHeaders({
      "x-real-ip": "  ",
      "x-forwarded-for": "203.0.113.10",
    });
    expect(ip).toBe("203.0.113.10");
  });

  it("handles array-form headers", () => {
    const ip = clientIpFromHeaders({
      "x-real-ip": ["203.0.113.10", "198.51.100.1"],
    });
    expect(ip).toBe("203.0.113.10");
  });
});
