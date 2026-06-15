# Contributing to eudi-verify

Thank you for your interest in contributing to eudi-verify!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/eudi-verify/eudi-verify.git
cd eudi-verify

# Install dependencies (requires Node.js 22+)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint OpenAPI spec
pnpm lint:api

# Run all CI checks locally (mirrors GitHub Actions)
pnpm verify

# Optional: install pre-push hook (runs pnpm verify before every push)
pnpm hooks:install
```

## Project Structure

```
eudi-verify/
├── packages/
│   ├── server/          # @eudi-verify/server - REST API handlers
│   ├── client/          # @eudi-verify/client - API client + state machine
│   └── embed/           # @eudi-verify/embed - <eudi-verify> web component
├── examples/
│   └── html-vanilla/    # Reference demo application
├── openapi/             # OpenAPI 3.1 specification
└── docs/                # Documentation
```

## Code Style

- TypeScript strict mode (enforced by `tsc --noEmit`)
- Use existing patterns from the codebase
- Add tests for new features
- Follow the existing commit message style (see below)

## Commit Message Format

```
<type>: <brief description>

<optional longer description>

<optional metadata>
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`

Example:
```
feat(server): add rate limiting per session endpoint

- Add per-IP rate limiter for POST /sessions
- Add configurable threshold (default 10/min)
- Add 429 response with Retry-After header
```

## AI tooling (optional)

Cursor and other AI assistants are optional. You do not need them to contribute.

This repository includes [`.cursor/rules/`](.cursor/rules/) — Cursor-side copies of project conventions for agents using that editor. **The conventions themselves are required** (commit message format, documentation sync, public-docs accuracy, etc.); they are documented in this file and `docs/`. You can ignore the `.cursor/rules` files if you do not use Cursor.

- **Required (automated):** `pnpm verify` passes — mirrors CI (build, types, tests, OpenAPI lint, licenses, audit).
- **Required (review):** Commit message format and documentation guidelines in this file; human review for security-sensitive changes.
- **Optional:** Using Cursor, an AI assistant, or reading `.cursor/rules/` directly.
- **Public docs:** Do not add unevaluated third-party agent plugins or rulesets to `README.md`, `docs/`, or package READMEs.

## AI-assisted Development

This project uses AI-assisted tooling under human review. Contributors remain responsible for correctness, security, and integration of all changes, whether AI-assisted or not.

### When to Add Commit Metadata

| Situation | Action |
|-----------|--------|
| Substantive code/logic generated or heavily shaped by AI | Add metadata footer (required) |
| Docs/tests/scaffolding with minor AI help (spellcheck, formatting) | Optional footer; this policy is sufficient |
| Purely human-authored change | No footer |

### Commit Metadata Format

For AI-assisted work, add metadata after the commit body, separated by a blank line. The model name and version are required; the prompt summary is optional but recommended:

```
feat(embed): add keyboard trap for modal focus

- Trap focus inside verification dialog
- Restore focus on close

AI-assisted: <model-name> <version>
Prompt: <brief summary of what you asked> (optional)
```

If you edited AI-generated code manually, add `(edited)`:

```
fix(client): handle session timeout edge case

- Add retry logic for expired sessions
- Update state machine transitions

AI-assisted: <model-name> <version> (edited)
Prompt: Generate session timeout handling; manually verified state transitions (optional)
```

### Human Review Expectations

- Security-sensitive areas (`server` tokens, crypto, auth flows) require explicit human review before merge
- Contributors must understand and be able to explain design decisions in their PRs

See [.cursor/rules/commit-style.mdc](.cursor/rules/commit-style.mdc) for full conventional commit conventions.

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes with tests
4. Run `pnpm verify` to ensure everything passes (or `pnpm test` + `pnpm typecheck` for a quicker check)
5. Commit your changes following the commit message format above
6. Push to your fork and submit a pull request

## Testing

- Unit tests: `pnpm test`
- E2E tests (embed): `cd packages/embed && pnpm test:e2e`
- Test coverage is tracked but not enforced

## Documentation

If your change affects public APIs or user-facing behavior:

1. Update package READMEs in `packages/*/README.md`
2. Update `docs/INTEGRATION.md` if integration steps change
3. Update `docs/SUPPORTED.md` if platform support changes
4. Keep `openapi/eudi-verifier.yaml` in sync with API changes

See [.cursor/rules/docs-sync.mdc](.cursor/rules/docs-sync.mdc) for detailed documentation sync guidelines.

## Architecture Decisions

Before proposing major changes, please review:

- [docs/PLAN.md](docs/PLAN.md) — Technical roadmap and design principles
- [.cursor/rules/project-context.mdc](.cursor/rules/project-context.mdc) — Framework-agnostic philosophy
- [DEPENDENCY.md](DEPENDENCY.md) — Dependency policy and sovereignty constraints

The project maintains strict framework-agnostic design: no React/Vue/Lit in core packages (`server`, `client`, `embed`). Framework bindings go in separate packages (e.g., `@eudi-verify/react` in WP9).

## Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management. Include a changeset with PRs that change published packages.

1. Run `pnpm changeset` to add a changeset describing the change
2. Select which packages are affected
3. Choose the semver bump type (major/minor/patch)
4. Write a brief description for the changelog
5. Commit the changeset file

Maintainers: see [docs/RELEASING.md](docs/RELEASING.md) for version bumps, npm publish, tags, and GitHub releases.

## Security

Please report security vulnerabilities via [GitHub Security Advisories](https://github.com/eudi-verify/eudi-verify/security/advisories/new) (not via public issues). See [SECURITY.md](SECURITY.md) for our disclosure policy.

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.

## Questions?

- Open a [GitHub Discussion](https://github.com/eudi-verify/eudi-verify/discussions) for general questions
- Open an [Issue](https://github.com/eudi-verify/eudi-verify/issues) for bugs or feature requests
