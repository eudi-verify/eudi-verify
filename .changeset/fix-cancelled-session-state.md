---
"@eudi-verify/client": patch
---

fix: map cancelled wallet sessions to rejected state

When polling returns `cancelled`, verification state is now `rejected` with
error "Request was declined" instead of resetting to `idle`.
