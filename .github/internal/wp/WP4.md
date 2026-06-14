# WP4: Embed Widget (`@eudi-verify/embed`)

## Overview

Implement the `<eudi-verify>` vanilla Custom Element that wraps the client library (WP3). Uses open Shadow DOM with CSS custom property theming. WCAG 2.1 AA compliant.

## Prerequisites

- WP3 completed: Client library with API client, state machine, QR generation

## Deliverables

### 1. Custom Element (`packages/embed/src/element.ts`)

```ts
export class EudiVerifyElement extends HTMLElement {
  static get observedAttributes(): string[];
  
  // Attributes
  get apiUrl(): string;
  set apiUrl(value: string);
  get request(): string; // JSON string
  set request(value: string);
  
  // Methods
  start(): void;
  cancel(): void;
  reset(): void;
}

customElements.define('eudi-verify', EudiVerifyElement);
```

### 2. Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `api-url` | string | Yes | Base URL for verifier API |
| `request` | JSON string | Yes | Verification request (e.g., `'{"age_over_18":true}'`) |
| `auto-start` | boolean | No | Start verification on connect |

### 3. Events

| Event | Detail | Description |
|-------|--------|-------------|
| `verified` | `{ token: string, claims: VerifiedClaims }` | Verification succeeded |
| `rejected` | `{ error?: string }` | User rejected in wallet |
| `expired` | `{}` | Session expired |
| `error` | `{ error: string }` | Error occurred |
| `state-change` | `{ state: VerificationState }` | Any state change |

### 4. CSS Custom Properties (Theme Tokens)

```css
eudi-verify {
  /* Required: set on host element */
  --eudi-primary: #003399;      /* EU blue - buttons, success */
  --eudi-text: #1a1a1a;         /* Body text */
  --eudi-background: #ffffff;   /* Widget surface */
  --eudi-border-radius: 8px;    /* Corner rounding */
  --eudi-font-family: system-ui, sans-serif;
  --eudi-error: #d32f2f;        /* Error/rejected state */
}
```

### 5. Shadow DOM Structure

```html
<eudi-verify>
  #shadow-root (open)
    <style>/* Internal styles using CSS vars */</style>
    <div class="eudi-widget" role="region" aria-label="Identity verification">
      <!-- State: idle -->
      <button class="eudi-start">Verify with EU Wallet</button>
      
      <!-- State: loading -->
      <div class="eudi-loading" aria-live="polite">Loading...</div>
      
      <!-- State: showQR -->
      <div class="eudi-qr">
        <img alt="Scan with EUDI Wallet" />
        <p>Scan with your EU Digital Identity Wallet</p>
      </div>
      
      <!-- State: waitingForWallet -->
      <div class="eudi-waiting" aria-live="polite">
        Waiting for wallet approval...
      </div>
      
      <!-- State: verified -->
      <div class="eudi-success" aria-live="assertive">
        ✓ Verified
      </div>
      
      <!-- State: rejected/expired/error -->
      <div class="eudi-error" aria-live="assertive">
        <p>Verification failed</p>
        <button>Try again</button>
      </div>
    </div>
</eudi-verify>
```

### 6. Accessibility Requirements (WCAG 2.1 AA)

- **Focus management**: Trap focus within widget during flow, restore on complete
- **ARIA live regions**: Announce state changes to screen readers
- **Keyboard navigation**: All interactive elements reachable via Tab
- **Color contrast**: Default theme meets 4.5:1 ratio
- **Motion**: Respect `prefers-reduced-motion`
- **Visible focus**: Clear focus indicators on all interactive elements

## Acceptance Criteria

1. **Works in plain HTML**: No build step required for consumers
2. **Theming via CSS vars only**: No JS configuration for styling
3. **Playwright e2e tests pass**: Against WP2 demo server
4. **axe-core clean**: Zero accessibility violations
5. **Events fire correctly**: All lifecycle events with proper detail

## Testing

### Unit Tests
```bash
cd packages/embed
pnpm test
```

### E2E Tests (Playwright)
```bash
pnpm test:e2e
```

Test files to create:
- `src/element.test.ts` - Custom element unit tests
- `src/styles.test.ts` - Theme token application
- `e2e/verification-flow.spec.ts` - Full flow against demo server
- `e2e/accessibility.spec.ts` - axe-core integration

## Usage Example

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="https://unpkg.com/@eudi-verify/embed"></script>
  <style>
    eudi-verify {
      --eudi-primary: #003399;
      --eudi-border-radius: 12px;
    }
  </style>
</head>
<body>
  <h1>Age Verification</h1>
  
  <eudi-verify
    api-url="/api/eudi"
    request='{"age_over_18":true}'
  ></eudi-verify>
  
  <script>
    const widget = document.querySelector('eudi-verify');
    
    widget.addEventListener('verified', (e) => {
      console.log('Verified!', e.detail.token);
      document.getElementById('token').value = e.detail.token;
      document.getElementById('form').submit();
    });
    
    widget.addEventListener('error', (e) => {
      console.error('Error:', e.detail.error);
    });
  </script>
  
  <form id="form" action="/checkout" method="POST">
    <input type="hidden" id="token" name="eudi_token" />
  </form>
</body>
</html>
```

## Files to Create/Modify

- `packages/embed/src/element.ts` - Custom element class
- `packages/embed/src/styles.ts` - CSS template with variables
- `packages/embed/src/render.ts` - State-based rendering
- `packages/embed/src/a11y.ts` - Accessibility utilities
- `packages/embed/src/index.ts` - Auto-register element
- `packages/embed/e2e/` - Playwright tests

## Build Output

The embed package should produce:
- `dist/eudi-verify.js` - ES module (primary)
- `dist/eudi-verify.iife.js` - IIFE for `<script>` tag
- `dist/eudi-verify.d.ts` - TypeScript declarations

## Notes

- Use **open Shadow DOM** (not closed) for devtools access
- No slots for MVP — fixed internal structure
- EU-institutional aesthetic: clean, high contrast, trustworthy
- Test in Firefox, Chrome, Safari, Edge
