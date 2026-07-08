---
"@eudi-verify/server": patch
---

Fix client IP extraction behind Bunny/NGINX so rate limiting keys on real visitor IP instead of CDN edge IP.
