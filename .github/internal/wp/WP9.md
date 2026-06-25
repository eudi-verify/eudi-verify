# WP9: React Integration (`@eudi-verify/react`)

## Overview

First framework integration after MVP (WP0–WP7). A thin React wrapper around the `<eudi-verify>` custom element (WP4) — not a reimplementation of the widget.

React apps get typed props, callback props for custom-element events, and a reference example app. Core packages (`server`, `client`, `embed`) remain React-free.

## Prerequisites

- WP4 completed: `@eudi-verify/embed` (`<eudi-verify>` custom element)
- WP2 completed: server handlers (for `examples/react` demo backend)
- WP7 recommended: `docs/INTEGRATION.md` baseline (Node + HTML path)

## Deliverables

### 1. Package (`packages/react/`)

```
packages/react/
├── src/
│   ├── EudiVerify.tsx      # Main component
│   ├── types.ts            # Props, ref handle, event payloads
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

#### `<EudiVerify>` component

Wraps the registered `<eudi-verify>` element. Side-effect import of `@eudi-verify/embed` in the package entry (or document that consumers must import embed once).

**Props:**

| Prop        | Type                                 | Required | Maps to                |
| ----------- | ------------------------------------ | -------- | ---------------------- |
| `apiUrl`    | `string`                             | Yes      | `api-url` attribute    |
| `request`   | `VerificationRequest` or JSON string | Yes      | `request` attribute    |
| `autoStart` | `boolean`                            | No       | `auto-start` attribute |
| `className` | `string`                             | No       | host element class     |
| `style`     | `CSSProperties`                      | No       | host element style     |

**Callback props** (wire via `ref` + `addEventListener` internally — do not rely on React synthetic events on custom elements):

| Callback        | Payload                                              |
| --------------- | ---------------------------------------------------- |
| `onVerified`    | `{ token: string; claims: Record<string, unknown> }` |
| `onRejected`    | `{ error?: string }`                                 |
| `onExpired`     | `{}`                                                 |
| `onError`       | `{ error: string }`                                  |
| `onStateChange` | `{ state: VerificationState }`                       |

**Ref handle (optional):**

| Method     | Description           |
| ---------- | --------------------- |
| `start()`  | Start verification    |
| `cancel()` | Cancel active session |
| `reset()`  | Reset to idle         |

#### Dependencies

- `@eudi-verify/embed` (workspace)
- `react` as **peerDependency** `>=18`
- Re-export or import `VerificationRequest`, `VerificationState` types from `@eudi-verify/client` for props only

#### Tests

- Vitest + React Testing Library
- Mock custom element or use happy-dom
- Verify callbacks fire when element dispatches events
- Verify attribute updates when props change

### 2. Example (`examples/react/`)

```
examples/react/
├── src/
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── server.ts              # Same pattern as html-vanilla (mount WP2 handlers)
├── package.json
├── vite.config.ts
└── README.md
```

- Vite + React + TypeScript
- Age-gate flow: `<EudiVerify>` → `onVerified` → POST token to protected endpoint → success view
- Shares verifier API shape with `examples/html-vanilla` (`/api/eudi`)
- README: clone, install, `pnpm start`, open browser

### 3. Documentation

- `packages/react/README.md` — install, props, callbacks, theming via CSS vars on host
- `docs/INTEGRATION.md` — new **React** section pointing to `@eudi-verify/react` and `examples/react`
- Update `docs/SUPPORTED.md` when WP9 ships (React row → ✅)

## Acceptance Criteria

1. **`@eudi-verify/react` builds** and exports `<EudiVerify>`
2. **Demo flow works** — `examples/react` completes verification against demo server
3. **Callbacks typed** — `onVerified` receives token + claims; other events match embed contract
4. **No React in core** — `packages/{server,client,embed}` unchanged; no React imports there
5. **Tests pass** — `pnpm test` green for `packages/react`
6. **Docs** — package README + INTEGRATION.md React section are copy-pasteable

## Implementation Notes

### Why a wrapper?

React does not reliably map custom-element events to `on*` props. The wrapper owns:

- `useRef` on the host `<eudi-verify>` node
- `useEffect` to attach/detach `verified`, `rejected`, `expired`, `error`, `state-change` listeners
- Prop → attribute sync (`apiUrl` → `api-url`, `request` → JSON string)

### Theming

Style the host element with CSS custom properties (same as embed):

```css
.eudi-verify-host {
  --eudi-primary: #0052b4;
}
```

Pass `className` to the wrapper; it applies to the custom element host.

### Manual embed (without wrapper)

React apps can import `@eudi-verify/embed` directly and use `ref` + `addEventListener` instead of `@eudi-verify/react`. Documented in `docs/INTEGRATION.md` (Option B: embed, Option C: React wrapper).

## Out of Scope

- `@eudi-verify/next` — separate future WP or roadmap item
- Vue, Svelte, Angular wrappers
- WordPress plugin
- Production HAIP mode changes

## Dependency Order

```
WP4 (embed) ──┐
WP2 (server) ─┼──► WP9 (react)
WP7 (docs) ───┘
```
