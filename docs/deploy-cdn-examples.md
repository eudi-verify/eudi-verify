# CDN / Reverse Proxy Provider Examples

Provider-specific supplements for [deploy-eu.md](./deploy-eu.md).

The main deployment guide stays provider-agnostic. Use this page when you need concrete steps for a particular CDN or reverse proxy in front of nginx.

## General requirements (all providers)

Regardless of vendor:

1. **Cache policy:** bypass edge cache for dynamic API routes (e.g. `/api/*`); cache static assets.
2. **Real client IP:** configure nginx `real_ip` trust for your provider's egress ranges.
3. **App context:** use `clientIpFromHeaders()` (or equivalent) so rate limits key on visitor IP.
4. **Origin exposure:** bind Node services to `127.0.0.1` (or firewall-block app ports).
5. **Range rotation:** refresh trusted egress IP lists on a schedule if your provider rotates edge nodes.

---

## Bunny.net

Reference: the public demo at [demo.eudi-verify.eu](https://demo.eudi-verify.eu/) uses Bunny in front of a Hetzner origin.

### Pull zone basics

| Setting         | Example value                   |
| --------------- | ------------------------------- |
| Origin URL      | `https://origin.your-domain.eu` |
| Public hostname | `demo.your-domain.eu`           |
| DNS cutover     | CNAME → `<pullzone>.b-cdn.net`  |

Use a dedicated origin hostname (not the CDN-facing hostname) to avoid CNAME loops.

### Cache bypass rule

| Setting      | Value                                         |
| ------------ | --------------------------------------------- |
| Trigger path | `*/api/*`                                     |
| Action       | Override Cache Time → `0` (bypass edge cache) |

### nginx real-IP trust list

Bunny edge IP ranges change over time. Generate nginx `set_real_ip_from` entries from Bunny's published list:

```bash
sudo bash /opt/eudi-verify/scripts/install-bunny-real-ip.sh
sudo nginx -t && sudo systemctl reload nginx
```

Re-run periodically (monthly is a practical default), or automate via cron:

```cron
17 3 1 * * /opt/eudi-verify/scripts/install-bunny-real-ip.sh >/var/log/cdn-real-ip-refresh.log 2>&1
```

### Header semantics

Bunny typically forwards client IP via `X-Forwarded-For` (`<edge-ip>, <client-ip>`) and may set `X-Real-IP` to the client. With nginx `real_ip` configured, `$remote_addr` and proxied `X-Real-IP` should reflect the visitor.

### Credentials

Store provider credentials on the server only (never in git), e.g. in `.env`:

- `BUNNY_API_KEY` — API access (cache purge, etc.)
- `BUNNY_PULL_ZONE_ID` — pull zone identifier

---

## Cloudflare

Not used by the eudi-verify demo today. If you front nginx with Cloudflare:

- Trust Cloudflare egress ranges in nginx (`set_real_ip_from`).
- Key rate limits/logs on `CF-Connecting-IP` (not raw `X-Forwarded-For`).
- See your ops runbook for Origin CA / Authenticated Origin Pull if you lock the origin to CDN-only traffic.

---

## Adding another provider

Document the same five areas: origin hostname, cache bypass paths, trusted egress IP source, client-IP header semantics, and credential handling.
