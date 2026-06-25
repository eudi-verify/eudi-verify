# Licensing

This project is available under two licenses:

1. **AGPL-3.0** — Free for open source use. See [LICENSE](LICENSE).
2. **Commercial License** — For use without AGPL obligations, open a [GitHub Discussion](https://github.com/eudi-verify/eudi-verify/discussions) with subject "Commercial license inquiry".

## Licensing for integrators

AGPL-3.0 is copyleft: if you **modify** this code and run it as a network service, you must share your modifications under the same license. It does **not** mean that using `eudi-verify` automatically makes your entire product open source.

| Integration pattern                                           | Typical AGPL impact                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Import and configure `@eudi-verify/server` via its public API | Your application code stays yours                                          |
| Embed `<eudi-verify>` widget and call your own backend        | Your application code stays yours                                          |
| Build a custom UI with `@eudi-verify/client`                  | Your application code stays yours                                          |
| Modify the verifier for commercial deployment                 | Contact us — AGPL compliance is complex, commercial license may be simpler |

**Not a trigger:** calling a hosted verifier API, or using verification tokens from your backend. AGPL applies to the **software you run**, not to being a client of someone else's service.

**When to contact us for a commercial license:** you need to modify the verifier and ship those changes in a closed-source product, or your organization's policy excludes AGPL dependencies.

This is not legal advice. If your use case is unclear, ask in [GitHub Discussions](https://github.com/eudi-verify/eudi-verify/discussions) or consult counsel.
