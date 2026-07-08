import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "./client-ip.js";

describe("clientIpFromHeaders", () => {
  it("prefers X-Real-IP", () => {
    expect(
      clientIpFromHeaders(
        {
          "x-real-ip": "203.0.113.10",
          "x-forwarded-for": "185.111.111.158, 198.51.100.20",
        },
        "127.0.0.1",
      ),
    ).toBe("203.0.113.10");
  });

  it("uses the rightmost X-Forwarded-For hop when X-Real-IP is absent", () => {
    expect(
      clientIpFromHeaders(
        { "x-forwarded-for": "185.111.111.158, 203.0.113.10" },
        "127.0.0.1",
      ),
    ).toBe("203.0.113.10");
  });

  it("falls back to the socket address", () => {
    expect(clientIpFromHeaders({}, "203.0.113.44")).toBe("203.0.113.44");
  });

  it("normalizes IPv4-mapped IPv6 addresses", () => {
    expect(clientIpFromHeaders({}, "::ffff:203.0.113.55")).toBe("203.0.113.55");
  });
});
