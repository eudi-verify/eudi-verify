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

### Apex (root) domain with CDN-only origin lockdown

Pull zones are reached via **CNAME** (`<zone>.b-cdn.net`). Bunny does not publish a stable anycast A record for pull zones, and most DNS panels (including Hetzner DNS and typical `.eu` registrars) do not allow CNAME at the zone apex. **Bunny DNS** can flatten apex CNAMEs; if you keep DNS elsewhere, do not add the apex as a pull-zone hostname unless you migrate nameservers.

Common pattern when the apex has no app yet:

| Hostname             | DNS                                 | Traffic                                       |
| -------------------- | ----------------------------------- | --------------------------------------------- |
| `demo.example.eu`    | CNAME → CDN                         | Public site via CDN                           |
| `origin.example.eu`  | A → origin IP                       | CDN pull target only (firewall + origin auth) |
| `example.eu` / `www` | A → origin IP, or `www` CNAME → CDN | Redirect to `demo`                            |

If the origin firewall allows **only CDN edge IPs on :443**, apex must not upgrade HTTP to HTTPS on the origin (that sends visitors to a blocked port). On nginx, redirect apex `:80` straight to the canonical public URL:

```nginx
server {
    listen 80;
    server_name example.eu www.example.eu;
    return 302 https://demo.example.eu$request_uri;
}
```

Optional later: HTTPS redirect on apex `:443` (same `return 302`) requires opening public `:443` on the origin (weakens CDN-only lockdown) or registrar URL forwarding / Bunny DNS for the apex.

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
