# PHP Backend Integration

Add EUDI Wallet identity verification to a PHP application using the verifier REST API.

> **No server library for PHP exists today.** Two integration paths are available — choose based on your deployment constraints. For the full platform support matrix, see [SUPPORTED.md](./SUPPORTED.md).

## Two paths at a glance

```
Path A — Proxy to Node verifier service (recommended)
  Browser → PHP app (proxy) → Node verifier service → EUDI protocol

Path B — Implement endpoints from OpenAPI in PHP
  Browser → PHP app (own implementation) → EUDI protocol (manual)
```

**Path A** runs the Node verifier service as a sidecar, proxies `/api/eudi/*` requests from PHP to it, and calls `POST /tokens/verify` server-side to validate tokens. This is the recommended starting point for most teams.

**Path B** is for teams who cannot run a Node sidecar and are willing to implement the full [OpenAPI contract](../openapi/eudi-verifier.yaml) in PHP themselves, including the OpenID4VP protocol and Verifiable Presentation verification. No PHP library for this exists today — it is a manual undertaking.

---

## Path A: Proxy to Node verifier service

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
│    <eudi-verify api-url="/eudi-proxy">              │
└─────────────────┬───────────────────────────────────┘
                  │ HTTP /eudi-proxy/*
┌─────────────────▼───────────────────────────────────┐
│  PHP Application                                    │
│    proxy route → curl → Node service               │
│    checkout handler → verifyEudiToken()             │
└────────┬──────────────────────────┬─────────────────┘
         │ proxy (all routes)        │ POST /api/eudi/tokens/verify
┌────────▼──────────────────────────▼─────────────────┐
│  Node verifier service (sidecar, port 3000)         │
│    @eudi-verify/server                              │
└─────────────────────────────────────────────────────┘
```

### Step 1: Run the Node verifier service

Install Node.js 22+ and run the verifier service alongside your PHP app.

```bash
npm install @eudi-verify/server
```

```js
// verifier.mjs
import {
  createVerifierHandlers,
  OpenEudiEngine,
  MemoryKVStore,
} from "@eudi-verify/server";
import http from "node:http";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000/api/eudi";

const handlers = createVerifierHandlers({
  engine: new OpenEudiEngine({ mode: "demo", baseUrl: BASE_URL }),
  store: new MemoryKVStore(),
  baseUrl: BASE_URL,
  mode: "demo",
  tokenSecret: process.env.TOKEN_SECRET, // 32+ chars, required
});

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

function ctx(req, params = {}, body = undefined, rawBody = undefined) {
  return { ip: req.socket.remoteAddress ?? "127.0.0.1", params, body, rawBody };
}

const server = http.createServer(async (req, res) => {
  let result;
  const url = new URL(req.url, "http://localhost");

  if (req.method === "POST" && url.pathname === "/api/eudi/sessions") {
    const raw = await readBody(req);
    result = await handlers.createSession(ctx(req, {}, JSON.parse(raw), raw));
  } else if (
    req.method === "GET" &&
    url.pathname.startsWith("/api/eudi/sessions/")
  ) {
    const sessionId = url.pathname.split("/")[4];
    result = await handlers.getSession(ctx(req, { sessionId }));
  } else if (req.method === "POST" && url.pathname.endsWith("/cancel")) {
    const sessionId = url.pathname.split("/")[4];
    result = await handlers.cancelSession(ctx(req, { sessionId }));
  } else if (
    req.method === "POST" &&
    url.pathname === "/api/eudi/tokens/verify"
  ) {
    const raw = await readBody(req);
    result = await handlers.verifyToken(ctx(req, {}, JSON.parse(raw), raw));
  } else if (req.method === "POST" && url.pathname === "/api/eudi/callback") {
    // The wallet posts application/x-www-form-urlencoded — do not JSON.parse.
    // Pass the raw body string so the handler can decode the form fields itself.
    const raw = await readBody(req);
    result = await handlers.handleCallback(ctx(req, {}, undefined, raw));
  } else {
    res.writeHead(404).end(JSON.stringify({ error: "not_found" }));
    return;
  }

  res.writeHead(result.status, {
    "Content-Type": "application/json",
    ...result.headers,
  });
  res.end(JSON.stringify(result.body));
});

server.listen(3000, () => console.log("Verifier running on :3000"));
```

For a full server example see the [Express integration guide](./INTEGRATION.md) or [examples/server](../examples/server/).

### Step 2: Add a PHP proxy route

Create a route in your PHP application that forwards `/eudi-proxy/*` to the Node service. This keeps `TOKEN_SECRET` on the server and avoids exposing the Node service port to the internet.

```php
<?php
// routes/eudi-proxy.php — mount at /eudi-proxy, not publicly documented

$nodeBase = rtrim(getenv('EUDI_NODE_URL') ?: 'http://localhost:3000', '/');

// Strip the /eudi-proxy prefix to get the upstream path
$upstreamPath = preg_replace('#^/eudi-proxy#', '/api/eudi', $_SERVER['REQUEST_URI']);
$target = $nodeBase . $upstreamPath;

$method      = $_SERVER['REQUEST_METHOD'];
$rawBody     = file_get_contents('php://input');
// Pass through the client's Content-Type unchanged. The EUDI Wallet posts
// application/x-www-form-urlencoded to /callback; other routes use application/json.
$contentType = $_SERVER['CONTENT_TYPE'] ?? 'application/json';

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_POSTFIELDS     => $rawBody ?: null,
    CURLOPT_HTTPHEADER     => [
        "Content-Type: $contentType",
        'Accept: application/json',
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER         => true,
    CURLOPT_TIMEOUT        => 10,
]);

$raw        = curl_exec($ch);
$status     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$errno      = curl_errno($ch);
curl_close($ch);

if ($errno) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'upstream_error']);
    exit;
}

$body = substr($raw, $headerSize);

http_response_code($status);
header('Content-Type: application/json');
echo $body;
```

> **Security:** Do not expose `EUDI_NODE_URL` to the browser. The Node service should only be reachable from your PHP server (e.g. bind to `127.0.0.1` or a private network interface).

### Step 3: Configure the widget

Point `api-url` at your PHP proxy path, not at the Node service directly:

```html
<script type="module">
  import "https://cdn.jsdelivr.net/npm/@eudi-verify/embed/dist/embed.js";
</script>

<eudi-verify
  api-url="/eudi-proxy"
  request='{"age_over_18": true}'
></eudi-verify>

<script>
  document
    .querySelector("eudi-verify")
    .addEventListener("verified", async (e) => {
      const { token } = e.detail;

      // Send token to your PHP checkout endpoint for server-side validation
      const resp = await fetch("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eudiToken: token }),
      });

      if (resp.ok) window.location.href = "/success";
    });
</script>
```

---

## Token verification (captcha pattern)

**Call this from your PHP server, never from the browser.** This is the trust anchor — like reCAPTCHA's `siteverify`. The widget sends the token to your PHP handler; your PHP handler validates it against the verifier service before granting access.

```php
<?php
/**
 * Verify an EUDI token against the verifier service.
 *
 * @param string $token       Opaque token from the widget's 'verified' event.
 * @param string $verifierBase Base URL of the verifier service (Path A: Node,
 *                             Path B: your own PHP service).
 * @return array{valid: bool, claims?: array, sessionId?: string, error?: string}
 * @throws RuntimeException on network or non-200 response.
 */
function verifyEudiToken(string $token, string $verifierBase): array
{
    $url = rtrim($verifierBase, '/') . '/api/eudi/tokens/verify';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['token' => $token]),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
    ]);

    $response = curl_exec($ch);
    $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno    = curl_errno($ch);
    curl_close($ch);

    if ($errno || $response === false) {
        throw new RuntimeException('Verifier service unreachable');
    }
    if ($status !== 200) {
        throw new RuntimeException("Verifier service returned HTTP $status");
    }

    return json_decode($response, true);
}
```

### Using it in a protected endpoint

```php
<?php
// checkout.php

header('Content-Type: application/json');

$token = json_decode(file_get_contents('php://input'), true)['eudiToken'] ?? '';

if (empty($token)) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_token']);
    exit;
}

try {
    // Path A: Node sidecar URL. Path B: your own PHP service URL.
    $result = verifyEudiToken($token, getenv('EUDI_NODE_URL') ?: 'http://localhost:3000');
} catch (RuntimeException $e) {
    http_response_code(503);
    echo json_encode(['error' => 'verifier_unavailable']);
    exit;
}

if (!$result['valid']) {
    http_response_code(401);
    echo json_encode([
        'error'  => 'verification_failed',
        'reason' => $result['error'], // 'expired', 'already_consumed', 'invalid_signature'
    ]);
    exit;
}

$claims = $result['claims'] ?? [];

if (!($claims['age_over_18'] ?? false)) {
    http_response_code(403);
    echo json_encode(['error' => 'age_restricted']);
    exit;
}

// Token is valid and claims are verified — proceed
echo json_encode(['status' => 'ok']);
```

### Token properties

| Property   | Value                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Single-use | Consumed on first successful verify; replays return `already_consumed` |
| TTL        | 5 minutes from issuance                                                |
| Signature  | HMAC-signed with `TOKEN_SECRET`; tamper returns `invalid_signature`    |
| Format     | `eudi_v1.<base64url-payload>.<hmac>`                                   |

---

## Path B: Implement endpoints from OpenAPI

Choose this path only when a Node sidecar is not possible and you need a fully self-contained PHP stack.

### What must be implemented

The [OpenAPI contract](../openapi/eudi-verifier.yaml) defines six endpoints:

| Endpoint                             | Who calls it     | Notes                                                 |
| ------------------------------------ | ---------------- | ----------------------------------------------------- |
| `POST /api/eudi/sessions`            | Browser / widget | Creates session, returns `qrUrl`                      |
| `GET /api/eudi/sessions/:id`         | Browser / widget | Polls status; returns `token` when `verified`         |
| `POST /api/eudi/sessions/:id/cancel` | Browser / widget | Cancels active session                                |
| `POST /api/eudi/tokens/verify`       | Your PHP server  | Validates token — the captcha step                    |
| `POST /api/eudi/callback`            | EUDI Wallet      | Receives encrypted VP (`direct_post.jwt`) from wallet |
| `GET /api/eudi/request/:id`          | EUDI Wallet      | Serves the OpenID4VP authorization request object     |

The `/callback` and `/request/:id` endpoints are called by the EUDI Wallet itself — not by your frontend — and require implementing the [OpenID4VP](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) protocol, including JWE decryption and Verifiable Presentation verification. **No PHP library for the EUDI protocol exists today.** This is a significant undertaking.

### Minimal PHP skeleton for session storage

```php
<?php
// Minimal in-memory session structure — use a real store (Redis, database) in production.
// Follows the Session schema from openapi/eudi-verifier.yaml.

function createSession(string $id, array $request): array
{
    return [
        'id'        => $id,
        'status'    => 'pending',
        'qrUrl'     => "openid4vp://authorize?request_uri=" . urlencode(
                           getenv('BASE_URL') . "/api/eudi/request/$id"
                       ),
        'createdAt' => date('c'),
        'expiresAt' => date('c', time() + 300),
    ];
}
```

For `POST /tokens/verify`, your PHP implementation generates and validates HMAC-signed tokens. The token verification function shown in the [Token verification](#token-verification-captcha-pattern) section above works the same way — just point `$verifierBase` at your own PHP service URL instead of the Node sidecar.

### OpenAPI reference

All request/response schemas, status codes, and error formats are documented in [`openapi/eudi-verifier.yaml`](../openapi/eudi-verifier.yaml). Use that as the authoritative contract when implementing each endpoint.

---

## Demo mode

> **Warning:** Only demo mode is available today. Credentials are simulated — no real identity verification occurs.

All verifier API responses include `X-Eudi-Mode: demo`. Production HAIP mode depends on certified EU wallets, expected from December 2026. Never use demo mode for real identity decisions.

---

## Next steps

- [INTEGRATION.md](./INTEGRATION.md) — full Node.js + frontend guide (reference path)
- [SUPPORTED.md](./SUPPORTED.md) — full platform support matrix
- [openapi/eudi-verifier.yaml](../openapi/eudi-verifier.yaml) — API contract
- [packages/server/README.md](../packages/server/README.md) — Node handler documentation
