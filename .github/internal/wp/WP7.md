# WP7: Documentation

## Overview

End-user documentation for integrating the EUDI Verifier Kit packages.

## Prerequisites

- WP2, WP3, WP4 complete (packages implemented)

## Deliverables

### 1. Package READMEs

Each package gets a README with:

- Installation
- Quick start example
- API reference (key exports)
- Configuration options

Files:

- `packages/server/README.md`
- `packages/client/README.md`
- `packages/embed/README.md` (WP4)

### 2. Integration Guide (`docs/INTEGRATION.md`)

End-to-end walkthrough covering:

- Architecture overview
- Server setup (mounting handlers)
- Client-side integration options (widget vs custom UI)
- Token verification flow
- Error handling
- Theming (CSS variables)

### 3. Root README Updates

- Package status table kept current
- Links to integration guide and package READMEs

## Acceptance Criteria

1. **Each package has README** with working code examples
2. **Integration guide** covers full flow from install to verified token
3. **Code examples are tested** (copy-paste should work)
4. **No broken links** in documentation

## Notes

- Keep docs concise — developers read code, not prose
- Examples should be copy-pasteable
- Link to OpenAPI spec for full API reference
- **React integration** is [WP9](./WP9.md) (not WP7 scope)
