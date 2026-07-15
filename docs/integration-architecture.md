# Integration architecture

How `eudi-verify` layers fit together — from the browser widget to `@openeudi/core`.

**See also:** [Integration guide](./INTEGRATION.md) (quick start), [OpenAPI spec](../openapi/eudi-verifier.yaml), [ARF alignment](./ARF_ALIGNMENT.md).

---

## Overview

`eudi-verify` is three browser packages plus a Node handler library. Session lifecycle and tokens are owned by `@eudi-verify/server` (`IKVStore` + handlers). The pluggable `VerifierEngine` interface wraps a protocol strategy — today `@openeudi/core` `DemoMode` inside `OpenEudiEngine`.

**PHP and other non-Node backends:** implement the [OpenAPI contract](../openapi/eudi-verifier.yaml) in your language, or run a **Node sidecar** that mounts `@eudi-verify/server` and proxy wallet-facing URLs through your public origin ([production flow](#production-flow-php-proxy--node-sidecar)).

---

## Component diagram (embed → engine)

```mermaid
flowchart TB
  subgraph Browser["Browser (untrusted)"]
    E["eudi-verify embed<br/>@eudi-verify/embed"]
    C["@eudi-verify/client<br/>state machine · QR · polling"]
    E --> C
  end

  subgraph AppBackend["Your app backend (PHP, Node, etc.)"]
    P["/eudi-proxy<br/>public wallet URLs"]
    PHP["Protected routes<br/>e.g. /checkout"]
  end

  subgraph NodeSidecar["Node sidecar — @eudi-verify/server"]
    H["createVerifierHandlers()"]
    S["IKVStore<br/>sessions · rate limits"]
    T["TokenService<br/>HMAC mint / verify"]
    VE["VerifierEngine interface<br/>(swappable)"]
    OE["OpenEudiEngine<br/>(default adapter)"]
    H --> S
    H --> T
    H --> VE
    VE --> OE
  end

  subgraph Protocol["Protocol layer (inside engine)"]
    DM["@openeudi/core DemoMode<br/>today — simulated age + country"]
    PM["custom IVerificationMode<br/>+ @openeudi/openid4vp<br/>production crypto (roadmap)"]
    OE --> DM
    OE -.-> PM
  end

  W["EUDI Wallet<br/>(production only)"]

  C -->|"POST /sessions<br/>GET /sessions/:id"| P
  P -->|"proxy"| H
  PHP -->|"POST /tokens/verify"| P
  P -->|"proxy"| H

  W -->|"GET /request/:id (PAR)<br/>POST /callback"| P
  P -->|"proxy rawBody"| H
```

---

## Layer responsibilities

| Layer             | Package                         | Owns                                                |
| ----------------- | ------------------------------- | --------------------------------------------------- |
| Widget UI         | `@eudi-verify/embed`            | DOM, accessibility, custom events                   |
| Client logic      | `@eudi-verify/client`           | QR generation, polling, state machine               |
| API handlers      | `@eudi-verify/server`           | Sessions, rate limits, wallet callbacks, token mint |
| Session store     | `IKVStore` (in server)          | Session lifecycle — not `@openeudi/core`'s store    |
| Engine seam       | `VerifierEngine`                | Swappable protocol adapter                          |
| Protocol strategy | `@openeudi/core` `DemoMode`     | Credential simulation (demo today)                  |
| Production crypto | `@openeudi/openid4vp` (roadmap) | VP parsing and signature verification               |

The engine interface is the portability seam: swap `OpenEudiEngine` for another `VerifierEngine` implementation without changing handlers, the widget, or your session store.

---

## Request flows

### Browser polling flow (all integrations)

The widget and client never trust verification outcomes until your backend validates the HMAC token.

```mermaid
sequenceDiagram
  participant E as eudi-verify embed
  participant C as @eudi-verify/client
  participant API as Your API (/api/eudi)

  E->>C: start verification
  C->>API: POST /sessions
  API-->>C: session + qrUrl
  C-->>E: render QR

  loop Poll until terminal
    C->>API: GET /sessions/{id}
    API-->>C: pending / verified / rejected / expired
  end

  C-->>E: verified event (token)

  Note over E,API: Protected route — not the public wallet proxy
  E->>API: POST /checkout (with token)
  API->>API: POST /tokens/verify (server-side)
  API-->>E: allow / deny
```

### Production flow (PHP proxy + Node sidecar)

Use when your main app is PHP (or another stack) but wallet protocol handling runs in a Node sidecar. Wallet-facing URLs must be **public** on your origin; the sidecar can run on an internal port.

```mermaid
sequenceDiagram
  participant E as eudi-verify embed
  participant C as @eudi-verify/client
  participant P as PHP /eudi-proxy
  participant H as handlers (@eudi-verify/server)
  participant S as IKVStore
  participant OE as OpenEudiEngine
  participant Core as @openeudi/core
  participant W as EUDI Wallet

  Note over E,C: Browser layer (untrusted)
  E->>C: start verification
  C->>P: POST /sessions
  P->>H: POST /api/eudi/sessions
  H->>OE: createSession()
  OE-->>H: qrUrl + engineData (nonce, coreType)
  H->>S: set session (pending)
  H-->>P: session DTO + qrUrl (PUBLIC URLs)
  P-->>C: session + QR
  C-->>E: render QR

  Note over W: Wallet flow (separate from browser polling)
  W->>P: GET /request/{id}
  P->>H: GET /api/eudi/request/{id}
  H->>OE: getAuthorizationRequest()
  OE-->>H: authz JWT (production) / JSON stub (demo)
  Note over P: forward Content-Type<br/>application/oauth-authz-req+jwt
  P-->>W: JWT

  W->>P: POST /callback<br/>(application/x-www-form-urlencoded)
  P->>H: POST /api/eudi/callback<br/>(rawBody — no JSON.parse)
  H->>OE: parseCallback(rawBody)
  H->>S: get session
  H->>OE: handleCallback(data, session)
  OE->>Core: processCallback(session, vpToken)
  Core-->>OE: VerificationResult
  OE-->>H: claims + status (verified/rejected)
  H->>H: TokenService.mint() on success
  H->>S: update session (verified + token)
  H-->>P: { status: ok }
  P-->>W: ok

  Note over W: Wallet done — browser still polling

  C->>P: GET /sessions/{id} (poll)
  P->>H: GET /api/eudi/sessions/{id}
  H->>S: get session
  H-->>P: verified + token
  P-->>C: token
  C-->>E: verified event

  Note over P: Protected app route — not the public proxy
  E->>P: POST /checkout (with token)
  P->>H: POST /api/eudi/tokens/verify
  H->>S: getAndDelete (single-use)
  H-->>P: valid + claims
  P-->>E: allow / deny
```

**PHP proxy checklist:**

- Forward `POST /callback` as **raw form body** — do not `json_decode` the wallet payload.
- Forward `GET /request/{id}` with the upstream `Content-Type` (`application/oauth-authz-req+jwt` in production).
- Expose **public** URLs in `qrUrl` and authorization requests (your CDN/origin hostname, not `localhost:3000` on the sidecar).
- Keep `POST /tokens/verify` on protected app routes (checkout), not on the open wallet proxy.

### Demo mode flow (today)

Demo mode does not exercise full wallet cryptography. `OpenEudiEngine` delegates to `@openeudi/core` `DemoMode`, which returns simulated **age over 18** and **country/nationality** only.

```mermaid
sequenceDiagram
  participant C as @eudi-verify/client
  participant H as handlers
  participant OE as OpenEudiEngine
  participant DM as @openeudi/core DemoMode

  C->>H: POST /sessions
  H->>OE: createSession()
  OE-->>H: openid4vp://… QR URL
  Note over C: User scans QR → demo wallet page<br/>(not a certified EUDI Wallet)

  H->>OE: handleCallback() on simulated wallet POST
  OE->>DM: processCallback()
  DM-->>OE: random EU country + ageVerified: true
  OE-->>H: age_over_18 + nationality only
  H->>H: mint HMAC token
  C->>H: GET /sessions/{id}
  H-->>C: verified + token
```

Requests for `age_over_21`, `given_name`, `family_name`, or `birth_date` are accepted at the API layer but those claims are **not returned** in demo mode until a production engine path exists.

---

## Trust boundaries

| Component                  | Trusted? | Notes                                                          |
| -------------------------- | -------- | -------------------------------------------------------------- |
| Browser / widget           | No       | Can start verification; cannot assert verified claims          |
| Verifier API (your server) | Yes      | Owns sessions, callbacks, token signing, replay protection     |
| EUDI Wallet                | External | Validated via OpenID4VP / trust framework (production roadmap) |
| Your checkout route        | Yes      | Must call `POST /tokens/verify` — never trust the widget alone |

See [Error handling](./integration-errors.md) for how failures surface at each layer.
