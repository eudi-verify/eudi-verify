# EU-Sovereign Deployment Guide

Deploy eudi-verify on EU-hosted infrastructure.

Reference deployment: [https://demo.eudi-verify.eu/](https://demo.eudi-verify.eu/)

## Deployment Options

| Method                                     | Best For                  | Complexity |
| ------------------------------------------ | ------------------------- | ---------- |
| [Node + nginx](#option-1-node--nginx)      | Production, full control  | Medium     |
| [Docker](#option-2-docker)                 | Quick setup, reproducible | Low        |
| [Docker Compose](#option-3-docker-compose) | Multi-container setups    | Low        |

---

## Option 1: Node + nginx

Recommended for production deployments where you want full control.

### 1. Create Server

### 2. Server Setup

```bash
ssh root@your-server

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Install pnpm
corepack enable
corepack prepare pnpm@latest --activate

# Install nginx and certbot
apt install -y nginx certbot python3-certbot-nginx
```

### 3. Deploy Application

```bash
# Clone and build
git clone https://github.com/eudi-verify/eudi-verify /opt/eudi-verify
cd /opt/eudi-verify
pnpm install
pnpm build

# Create environment file
cat > /opt/eudi-verify/examples/html-vanilla/.env << 'EOF'
TOKEN_SECRET=your-random-secret-at-least-32-bytes-here
PORT=3001
API_PORT=3000
NODE_ENV=production
BASE_URL=https://demo.your-domain.eu/api/eudi
EOF

# Generate a secure secret
openssl rand -base64 32
```

### 4. Create systemd Service

The demo runs **two Node processes**: API (`examples/server`) and static/proxy (`examples/html-vanilla`). Use `start.sh` as the entrypoint:

```bash
cat > /etc/systemd/system/eudi-verify.service << 'EOF'
[Unit]
Description=EUDI Verify Demo
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/eudi-verify/examples/html-vanilla
EnvironmentFile=/opt/eudi-verify/examples/html-vanilla/.env
ExecStart=/opt/eudi-verify/examples/html-vanilla/start.sh
Restart=on-failure
RestartSec=5
KillMode=control-group

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable eudi-verify
systemctl start eudi-verify
```

**Upgrading from a single-process service** (pre–WP9 split): change `ExecStart` from `node --import tsx server.ts` to `start.sh` as above, add `API_PORT=3000` to `.env`, set `PORT=3001`, and point nginx at port `3001` (see step 5). If nginx must stay on port `3000`, keep `PORT=3000` and set `API_PORT` to a free port (e.g. `3002`); `start.sh` binds the API to `API_PORT` only.

### 5. Configure nginx

```bash
cat > /etc/nginx/sites-available/eudi-verify << 'EOF'
server {
    listen 80;
    server_name demo.your-domain.eu;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/eudi-verify /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

If a CDN (Bunny, etc.) sits in front of nginx, install trusted-proxy real IP handling so rate limiting sees visitor IPs, not the CDN edge:

```bash
bash /opt/eudi-verify/scripts/install-bunny-real-ip.sh
# Re-run monthly or after CDN connectivity issues (Bunny edge IPs change)
```

The demo API and static servers bind to `127.0.0.1` by default (`HOST` in `.env` overrides). Keep them off the public interface so clients cannot spoof `X-Real-IP` by bypassing nginx.

### 6. Enable HTTPS

```bash
certbot --nginx -d demo.your-domain.eu
```

### 7. CDN in front of origin (optional)

Many demos put a CDN (e.g. [Bunny](https://bunny.net)) in front of the public hostname for static assets. API routes must not be cached.

**Recommended edge rule** (Bunny Edge Rules; adapt for your CDN):

| Setting      | Value                                         |
| ------------ | --------------------------------------------- |
| Trigger path | `*/api/*`                                     |
| Action       | Override Cache Time → `0` (bypass edge cache) |

**Why:** HTML/JS/CSS benefit from edge cache; `/api/eudi/*` must always hit origin.

**Rate limiting behind CDN:** Bunny sends `X-Forwarded-For: <edge-ip>, <client-ip>`. Without nginx `real_ip` trust for Bunny ranges, the app would rate-limit per CDN edge IP (false positives when many users share a PoP). Run `scripts/install-bunny-real-ip.sh` on the origin and keep the Node API bound to `127.0.0.1`.

**Widget demo detection:** Do not rely on `HEAD /sessions` through a CDN — some pull zones return 404 for `HEAD` on dynamic paths even with cache bypass. The `<eudi-verify>` widget reads `X-Eudi-Mode` from `POST /sessions`, or use the `demo-mode` attribute on hosted demo pages.

**Optional split hostname:** Serve static via CDN on `demo.your-domain.eu` and add `origin.your-domain.eu` (same nginx server block) for direct API testing. Browser API calls can use either hostname if CORS is open (demo server sets `Access-Control-Allow-Origin: *`).

**Secrets:** Never commit CDN API keys or pull zone IDs to the repo. Store `BUNNY_API_KEY` and `BUNNY_PULL_ZONE_ID` in `.env` on the server only (used for post-deploy cache purge).

### 8. One-time migration (legacy nginx → static PORT)

If nginx currently proxies to `API_PORT` (3000) instead of `PORT` (3001):

```bash
sudo systemctl stop eudi-verify
sudo fuser -k 3000/tcp 3001/tcp 3002/tcp 2>/dev/null || true
# Edit nginx: proxy_pass http://127.0.0.1:3001;
sudo nginx -t && sudo systemctl reload nginx
# Ensure .env has PORT=3001 and API_PORT=3000
sudo systemctl start eudi-verify
pgrep -af server.ts   # API should not be orphaned (PPID 1)
```

---

## Option 2: Docker

Quick single-container deployment.

### 1. Server Setup

```bash
ssh root@your-server
apt update && apt install -y docker.io
```

### 2. Build and Run

```bash
git clone https://github.com/eudi-verify/eudi-verify
cd eudi-verify

docker build -t eudi-verify-demo -f examples/html-vanilla/Dockerfile .

docker run -d \
  --name eudi-verify \
  --restart unless-stopped \
  -p 3001:3001 \
  -e TOKEN_SECRET="$(openssl rand -base64 32)" \
  -e NODE_ENV=production \
  eudi-verify-demo
```

### 3. Add Reverse Proxy

Use nginx or Caddy for HTTPS termination (same as Option 1, step 5-6).

---

## Option 3: Docker Compose

For reproducible deployments.

```bash
cd eudi-verify/examples/html-vanilla

# Set required secret
export TOKEN_SECRET="$(openssl rand -base64 32)"

docker-compose up -d
```

---

## Environment Variables

| Variable       | Required | Default       | Description                                  |
| -------------- | -------- | ------------- | -------------------------------------------- |
| `TOKEN_SECRET` | **Yes**  | —             | HMAC secret for token signing (min 32 bytes) |
| `PORT`         | No       | `3001`        | Static/proxy server port (nginx target)      |
| `API_PORT`     | No       | `3000`        | Internal API server port                     |
| `BASE_URL`     | No       | Auto-detected | Public callback URL (API server)             |
| `NODE_ENV`     | No       | `development` | Set to `production` in production            |

---

## Security Checklist

Before going live:

- [ ] `TOKEN_SECRET` is cryptographically random (≥32 bytes)
- [ ] HTTPS enabled (Let's Encrypt via certbot or Caddy)
- [ ] Firewall allows only ports 80, 443, and SSH
- [ ] Demo mode banner visible in UI
- [ ] `X-Eudi-Mode: demo` header present in API responses
- [ ] Rate limiting enabled (default: 10 req/min per IP)
- [ ] Landing page only in search results (`robots.txt` allows `/` and `/sitemap.xml`; demo flow pages use `noindex` meta and `X-Robots-Tag`; `sitemap.xml` lists the canonical home URL)

---

## Updating

### Node deployment

```bash
cd /opt/eudi-verify
git pull
pnpm install
pnpm build
systemctl restart eudi-verify
```

### Docker deployment

```bash
cd /path/to/eudi-verify
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Monitoring

Check service status:

```bash
# Node deployment
systemctl status eudi-verify
journalctl -u eudi-verify -f

# Docker deployment
docker logs -f eudi-verify
```

---

## EU Sovereignty Notes

This deployment guide prioritizes EU-hosted infrastructure:

| Component | Recommended                         | Alternatives                           |
| --------- | ----------------------------------- | -------------------------------------- |
| Compute   | Hetzner Cloud (DE/FI)               | OVH (FR), Scaleway (FR), Exoscale (CH) |
| Domain    | EU registrar                        | —                                      |
| DNS       | Hetzner DNS, Cloudflare (edge only) | Self-hosted                            |
| TLS       | Let's Encrypt                       | —                                      |

Avoid US-hosted middleware (Auth0, Clerk, Firebase) in production deployments.
