# WP5: Demo + Deploy

## Overview

Create the `examples/html-vanilla` demo and document EU-sovereign deployment.

## Prerequisites

- WP2 completed: Server with handlers and OpenEUDI engine
- WP4 completed: `<eudi-verify>` custom element

## Deliverables

### 1. HTML-Vanilla Demo (`examples/html-vanilla/`)

Structure:
```
examples/html-vanilla/
├── public/
│   ├── index.html      # Landing page
│   ├── verify.html     # Age verification page
│   └── success.html    # Post-verification page
├── server.ts           # ~50-line Node server
├── package.json
└── README.md
```

#### `server.ts` (~50 lines)

```ts
import { createServer } from 'node:http';
import { createVerifierHandlers, MockEngine, MemoryKVStore } from '@eudi-verify/server';

const engine = new MockEngine();
const store = new MemoryKVStore();
const handlers = createVerifierHandlers({
  engine,
  store,
  baseUrl: 'http://localhost:3000/api/eudi',
  mode: 'demo',
  tokenSecret: process.env.TOKEN_SECRET || 'demo-secret-change-in-production',
});

const server = createServer(async (req, res) => {
  // Route to handlers or serve static files
});

server.listen(3000, () => {
  console.log('Demo running at http://localhost:3000');
  console.warn('⚠️  DEMO MODE - Do not use in production');
});
```

#### `public/verify.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Age Verification - EUDI Demo</title>
  <script type="module" src="/eudi-verify.js"></script>
  <style>
    eudi-verify {
      --eudi-primary: #003399;
      max-width: 400px;
      margin: 2rem auto;
    }
  </style>
</head>
<body>
  <main>
    <h1>Age Verification Required</h1>
    <p>Please verify you are over 18 to continue.</p>
    
    <eudi-verify
      api-url="/api/eudi"
      request='{"age_over_18":true}'
    ></eudi-verify>
    
    <form id="checkout" action="/api/checkout" method="POST" hidden>
      <input type="hidden" name="eudi_token" id="token">
    </form>
  </main>
  
  <script>
    const widget = document.querySelector('eudi-verify');
    
    widget.addEventListener('verified', (e) => {
      document.getElementById('token').value = e.detail.token;
      document.getElementById('checkout').submit();
    });
  </script>
</body>
</html>
```

### 2. Checkout Endpoint

Server-side token verification (captcha pattern):

```ts
// In server.ts
if (req.method === 'POST' && req.url === '/api/checkout') {
  const token = body.eudi_token;
  const result = await handlers.verifyToken(token);
  
  if (result.valid) {
    // Redirect to success page
    res.writeHead(302, { Location: '/success.html' });
  } else {
    // Redirect back with error
    res.writeHead(302, { Location: '/verify.html?error=invalid' });
  }
}
```

### 3. Deployment Documentation (`docs/deploy-eu.md`)

```markdown
# EU-Sovereign Deployment Guide

## Quick Start (Docker)

\`\`\`bash
docker build -t eudi-verify-demo .
docker run -p 3000:3000 -e TOKEN_SECRET=your-secret eudi-verify-demo
\`\`\`

## Hetzner Cloud Deployment

### 1. Create Server
- Location: Falkenstein (DE) or Helsinki (FI)
- Type: CX11 (€3.29/month)
- Image: Ubuntu 24.04

### 2. Setup
\`\`\`bash
ssh root@your-server
apt update && apt install -y docker.io docker-compose
git clone https://github.com/eudi-verify/eudi-verify
cd eudi-verify/examples/html-vanilla
docker-compose up -d
\`\`\`

### 3. SSL with Caddy
\`\`\`
# Caddyfile
demo.eudi-verify.eu {
  reverse_proxy localhost:3000
}
\`\`\`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TOKEN_SECRET` | Yes | HMAC secret for token signing |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Set to `production` for production |

## Security Checklist

- [ ] TOKEN_SECRET is random, >= 32 bytes
- [ ] HTTPS enabled (required for wallets)
- [ ] Rate limiting configured
- [ ] Demo mode warnings visible
```

### 4. Docker Configuration

`examples/html-vanilla/Dockerfile`:
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

`examples/html-vanilla/docker-compose.yml`:
```yaml
version: '3.8'
services:
  demo:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TOKEN_SECRET=${TOKEN_SECRET}
      - NODE_ENV=production
    restart: unless-stopped
```

### 5. Live Demo URL

Deploy to: `https://demo.eudi-verify.eu` (or similar EU domain)

Requirements:
- EU-hosted (Hetzner Falkenstein recommended)
- HTTPS (Let's Encrypt via Caddy)
- Visible demo mode warning banner

## Acceptance Criteria

1. **Clone-to-verified < 10 minutes**:
   ```bash
   git clone https://github.com/eudi-verify/eudi-verify
   cd eudi-verify
   pnpm install
   cd examples/html-vanilla
   pnpm start
   # Open http://localhost:3000, complete verification
   ```

2. **Live URL up**: Demo accessible at public URL

3. **Demo warnings visible**:
   - Console warning on server start
   - Banner in UI: "Simulated verification — credentials are fake. For local testing only."
   - `X-Eudi-Mode: demo` header in API responses

4. **Server-side verify works**: Form submission validates token

## Testing

```bash
cd examples/html-vanilla
pnpm test
pnpm start # Manual testing
```

## Files to Create

- `examples/html-vanilla/server.ts`
- `examples/html-vanilla/public/index.html`
- `examples/html-vanilla/public/verify.html`
- `examples/html-vanilla/public/success.html`
- `examples/html-vanilla/public/styles.css`
- `examples/html-vanilla/Dockerfile`
- `examples/html-vanilla/docker-compose.yml`
- `examples/html-vanilla/package.json`
- `examples/html-vanilla/README.md`
- `docs/deploy-eu.md`
