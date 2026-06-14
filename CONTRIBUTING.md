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

AI-assisted: Claude via Cursor
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes with tests
4. Run `pnpm test` and `pnpm typecheck` to ensure everything passes
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

## Releasing (Maintainers Only)

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

### After merging a PR

1. Run `pnpm changeset` to add a changeset describing the change
2. Select which packages are affected
3. Choose the semver bump type (major/minor/patch)
4. Write a brief description for the changelog
5. Commit the changeset file

### Publishing a release

1. Run `pnpm changeset version` to bump versions and update changelogs
2. Review the generated changes
3. Commit: `git commit -m "chore: release"`
4. Authenticate with npm: `npm login`
5. Publish: `pnpm -r publish --access public`
6. Tag the release: `git tag v0.X.Y && git push origin v0.X.Y`
7. Create GitHub release: `gh release create v0.X.Y --title "v0.X.Y" --notes "<changelog>"`

## Security

Please report security vulnerabilities to [security@eudi-verify.org](mailto:security@eudi-verify.org) (not via public issues). See [SECURITY.md](SECURITY.md) for our disclosure policy.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.

## Questions?

- Open a [GitHub Discussion](https://github.com/eudi-verify/eudi-verify/discussions) for general questions
- Open an [Issue](https://github.com/eudi-verify/eudi-verify/issues) for bugs or feature requests
