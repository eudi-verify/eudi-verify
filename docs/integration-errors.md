# Integration error handling

How failures surface across server handlers, wallet callbacks, and frontend integrations.

**See also:** Package READMEs — [server](../packages/server/README.md#error-boundaries), [client](../packages/client/README.md#error-boundaries), [embed](../packages/embed/README.md#error-boundaries).

---

## Three channels on the server

| Channel                | When                                                         | How to detect                                                                        |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **HTTP error**         | Bad input, rate limit, origin denied, engine crash on create | `result.status >= 400` and `result.body.error`                                       |
| **Session outcome**    | User declined, VP invalid, session timed out                 | `result.body.status` on `getSession` — values include `rejected`, `expired`, `error` |
| **Token soft failure** | Token invalid, expired, or already used at checkout          | `verifyToken` returns HTTP 200 with `{ valid: false, error: '...' }`                 |

Handlers **return** `HandlerResponse` objects; they do not throw. Your route adapter is the error boundary:

```ts
async function sendHandlerResult(res, result) {
  if (result.status >= 400 && "error" in result.body) {
    reportError({ httpStatus: result.status, code: result.body.error });
  }
  res.status(result.status).set(result.headers).json(result.body);
}
```

---

## Wallet callback vs your frontend

`POST /callback` is called by the **EUDI Wallet**, not your page. HTTP status on that endpoint means “payload received,” not “user verified”:

| Callback result                                   | HTTP to wallet             | Where the outcome lives                   |
| ------------------------------------------------- | -------------------------- | ----------------------------------------- |
| Malformed body, unknown session                   | **400** + `ApiError`       | Wallet may show delivery failure          |
| VP processed (success, declined, or crypto error) | **200** `{ status: 'ok' }` | Session record — poll `GET /sessions/:id` |

Your widget or client learns verification outcomes by **polling session status**, not from the callback response.

---

## Frontend boundaries

| Integration                           | Boundary                   | User declined                                  | System/network failure                                 |
| ------------------------------------- | -------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| **Widget** (`@eudi-verify/embed`)     | DOM events                 | `rejected`                                     | `error`                                                |
| **Custom UI** (`@eudi-verify/client`) | `verification.subscribe()` | `state.status === 'rejected'`                  | `state.status === 'error'`                             |
| **Direct API** (`createApiClient`)    | `try/catch`                | Session `status: 'rejected'` from `getSession` | Typed throws: `NetworkError`, `ApiResponseError`, etc. |

`createVerification` does **not** throw on flow failures — it transitions to `{ status: 'error', error: string }`. Use `createApiClient` directly if you need typed HTTP error codes (e.g. rate-limit retry).

---

## Error reporting (Sentry, Datadog, etc.)

```ts
// Server — wrap handler calls
const result = await handlers.getSession(ctx);
if (result.status === 200 && result.body.status === "error") {
  reportError({ sessionId: result.body.id, error: result.body.error });
}

// Client — subscribe
verification.subscribe((state) => {
  if (state.status === "error") reportError({ message: state.error });
});

// Widget — events
widget.addEventListener("error", (e) => reportError({ error: e.detail.error }));
widget.addEventListener("rejected", (e) =>
  reportEvent({ type: "rejected", detail: e.detail }),
);
```
