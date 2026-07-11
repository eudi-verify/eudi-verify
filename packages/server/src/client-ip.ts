/**
 * Resolve the client IP for rate limiting behind reverse proxies / CDNs.
 *
 * Prefer X-Real-IP (set by nginx after real_ip) over X-Forwarded-For.
 * When only XFF is present, use the rightmost hop.
 */

function headerValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

function normalizeIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const trimmed = ip.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
}

/**
 * Best-effort client IP from proxy headers and the socket address.
 */
export function clientIpFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress?: string,
): string {
  const realIp = normalizeIp(headerValue(headers["x-real-ip"]));
  if (realIp) return realIp;

  const forwarded = headerValue(headers["x-forwarded-for"]);
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => normalizeIp(hop))
      .filter((hop): hop is string => Boolean(hop));
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return normalizeIp(remoteAddress) ?? "127.0.0.1";
}
