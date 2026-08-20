---
"@eudi-verify/server": patch
---

Depend on `@openeudi/openid4vp` `^0.10.0` from the npm registry instead of a pinned fork commit. The `x509_hash` client_id support and the ID3 `client_metadata` removal that the OpenID Certified HAIP build was tested against are now released upstream ([openeudi/openid4vp#33](https://github.com/openeudi/openid4vp/pull/33)).

This fixes installation under pnpm 11, which blocks git-resolved subdependencies by default (`ERR_PNPM_EXOTIC_SUBDEP`) and so could not install 1.4.1 at all. Registry installs also restore integrity checking and no longer need github.com reachable at install time.
