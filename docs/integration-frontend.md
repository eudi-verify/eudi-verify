# Frontend integration

Add the verification UI to your site — widget, custom UI, React, or Vue.

**Prerequisites:** A running verifier API ([server setup](./INTEGRATION.md#server-setup)). See [architecture](./integration-architecture.md) for how the browser talks to your backend.

---

## Option A: Widget (simplest)

Drop in the `<eudi-verify>` element.

```bash
pnpm add @eudi-verify/embed
```

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module">
      import "@eudi-verify/embed";
    </script>
  </head>
  <body>
    <h1>Age Verification Required</h1>

    <eudi-verify
      api-url="/api/eudi"
      request='{"age_over_18": true}'
    ></eudi-verify>

    <script>
      document
        .querySelector("eudi-verify")
        .addEventListener("verified", async (e) => {
          const response = await fetch("/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eudiToken: e.detail.token }),
          });

          if (response.ok) {
            window.location.href = "/success";
          }
        });

      document.querySelector("eudi-verify").addEventListener("rejected", () => {
        alert("Verification was declined");
      });
    </script>
  </body>
</html>
```

### Attributes

| Attribute    | Description                                              |
| ------------ | -------------------------------------------------------- |
| `api-url`    | Base URL of your verifier API                            |
| `request`    | JSON string of requested claims                          |
| `auto-start` | (Optional) Start verification automatically on page load |

### Events

| Event          | Detail              | Description                            |
| -------------- | ------------------- | -------------------------------------- |
| `verified`     | `{ token, claims }` | User approved, token ready             |
| `rejected`     | `{ error? }`        | User declined in wallet                |
| `expired`      | `{}`                | Session timed out                      |
| `error`        | `{ error }`         | Something went wrong                   |
| `state-change` | `{ state }`         | Any state change (for custom handling) |

### Theming

```css
eudi-verify {
  --eudi-primary: #0052b4;
  --eudi-text: #1a1a1a;
  --eudi-background: #ffffff;
  --eudi-border-radius: 8px;
  --eudi-font-family: system-ui, sans-serif;
  --eudi-error: #d32f2f;
}
```

Full API: [packages/embed/README.md](../packages/embed/README.md)

---

## Option B: Custom UI

Build your own UI with the client library.

```bash
pnpm add @eudi-verify/client
```

```ts
import { createVerification } from "@eudi-verify/client";

const verification = createVerification({
  apiUrl: "/api/eudi",
});

verification.subscribe((state) => {
  switch (state.status) {
    case "showQR":
      qrImage.src = state.qrDataUrl;
      qrContainer.style.display = "block";
      break;
    case "waitingForWallet":
      statusText.textContent = "Approve in your wallet...";
      break;
    case "verified":
      submitToken(state.token);
      break;
  }
});

verifyButton.onclick = () => {
  verification.start({ age_over_18: true });
};
```

Full API: [packages/client/README.md](../packages/client/README.md)

---

## Option C: React

**Requirements:** React 18+

React does not wire `on*` props to custom element events. The wrapper attaches DOM listeners internally. For raw `<eudi-verify>`, use Option B (`ref` + `addEventListener`).

```bash
pnpm add @eudi-verify/react
```

```tsx
import { EudiVerify } from "@eudi-verify/react";

function AgeGate() {
  const handleVerified = async ({ token }) => {
    const response = await fetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eudiToken: token }),
    });

    if (response.ok) {
      window.location.href = "/success";
    }
  };

  return (
    <EudiVerify
      apiUrl="/api/eudi"
      request={{ age_over_18: true }}
      onVerified={handleVerified}
      onRejected={() => alert("Verification declined")}
      onError={({ error }) => console.error(error)}
    />
  );
}
```

### Props

| Prop         | Type                            | Description                       |
| ------------ | ------------------------------- | --------------------------------- |
| `apiUrl`     | `string`                        | Base URL of your verifier API     |
| `request`    | `VerificationRequest \| string` | Claims to request                 |
| `onVerified` | `(detail) => void`              | Called when verification succeeds |
| `onRejected` | `(detail) => void`              | Called when user declines         |
| `onExpired`  | `() => void`                    | Called when session expires       |
| `onError`    | `(detail) => void`              | Called on errors                  |

### Imperative control

```tsx
import { useRef } from "react";
import { EudiVerify, type EudiVerifyRef } from "@eudi-verify/react";

function App() {
  const ref = useRef<EudiVerifyRef>(null);

  return (
    <>
      <EudiVerify
        ref={ref}
        apiUrl="/api/eudi"
        request={{ age_over_18: true }}
      />
      <button onClick={() => ref.current?.start()}>Start</button>
      <button onClick={() => ref.current?.cancel()}>Cancel</button>
    </>
  );
}
```

### Next.js

```tsx
"use client";

import { EudiVerify } from "@eudi-verify/react";

export default function VerificationPage() {
  return <EudiVerify apiUrl="/api/eudi" request={{ age_over_18: true }} />;
}
```

Reference app: [examples/react](../examples/react/). Full docs: [packages/react/README.md](../packages/react/README.md)

---

## Option D: Vue

**Requirements:** Vue 3+

Vue handles custom-element events natively — no separate Vue package needed.

```bash
pnpm add @eudi-verify/embed
```

```ts
// vite.config.ts
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === "eudi-verify",
        },
      },
    }),
  ],
});
```

```vue
<script setup lang="ts">
import "@eudi-verify/embed";
import type { EudiVerifyEventMap } from "@eudi-verify/embed";

type VerifiedEvent = EudiVerifyEventMap["verified"];

const request = JSON.stringify({ age_over_18: true });

async function handleVerified(event: Event) {
  const { token } = (event as VerifiedEvent).detail;
  await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ eudi_token: token }),
  });
}
</script>

<template>
  <eudi-verify
    api-url="/api/eudi"
    :request="request"
    @verified="handleVerified"
    @rejected="() => alert('Verification declined')"
  />
</template>
```

Reference app: [examples/vue](../examples/vue/)
