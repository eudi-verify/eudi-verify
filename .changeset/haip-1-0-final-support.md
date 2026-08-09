---
"@eudi-verify/server": minor
---

Add HAIP 1.0 Final support to `Openid4vpEngine` via a new optional `haip` config block: `x509_hash` client_id, signed request objects served via JAR (`request_uri`), and `direct_post.jwt` encrypted callback responses with a fresh per-session response-encryption key (HAIP requires verifiers not reuse a response-encryption key across Authorization Requests). `VerifierEngine` gains an optional `redirectUri` field, echoed on every `/callback` response body when set (HAIP 1.0 §5.1); unset for the existing plain `direct_post` path, which is unaffected.

Passed the free OpenID Foundation conformance suite's `oid4vp-1final-verifier-happy-flow` test on the HAIP 1.0 Final/HAIP plan (2026-08-09) — see `docs/INTEROP.md`. A free suite run is not a certification.
