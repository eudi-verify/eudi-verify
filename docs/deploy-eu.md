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
PORT=3000
NODE_ENV=production
BASE_URL=https://demo.your-domain.eu/api/eudi
EOF

# Generate a secure secret
openssl rand -base64 32
```

### 4. Create systemd Service

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
ExecStart=/usr/bin/node --import tsx server.ts
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable eudi-verify
systemctl start eudi-verify
```

### 5. Configure nginx

```bash
cat > /etc/nginx/sites-available/eudi-verify << 'EOF'
server {
    listen 80;
    server_name demo.your-domain.eu;

    location / {
        proxy_pass http://127.0.0.1:3000;
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

### 6. Enable HTTPS

```bash
certbot --nginx -d demo.your-domain.eu
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
  -p 3000:3000 \
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
| `PORT`         | No       | `3000`        | Server listening port                        |
| `BASE_URL`     | No       | Auto-detected | Public callback URL                          |
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
- [ ] Landing page only in search results (`robots.txt` allows `/` only; demo flow pages use `noindex` meta and `X-Robots-Tag`)

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
