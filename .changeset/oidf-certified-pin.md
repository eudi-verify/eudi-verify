---
"@eudi-verify/server": patch
---

Ship the OpenID Certified HAIP build: `@openeudi/openid4vp` is pinned to the ID3-bridge-free fork commit (`e08c2a81`) that the certified conformance run used. Published 1.4.0 still carried the earlier pin, which emitted the singular `authorization_encrypted_response_alg` / `_enc` client metadata fields the OIDF suite flagged as unexpected.
