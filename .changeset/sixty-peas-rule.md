---
"@eudi-verify/server": patch
---

Fix client IP extraction behind reverse proxies/CDNs so rate limiting keys on real visitor IP instead of edge IP.
