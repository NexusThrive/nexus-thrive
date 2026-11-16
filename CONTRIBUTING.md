# Contributing to NexusThrive

This repository contains Thrive Business as a modular Next.js monolith. Start with [the documentation index](docs/README.md), [AGENTS.md](AGENTS.md) and [the product plan](docs/01-producto/plan.md).

## Workflow

Follow milestone M → sprint S → story HU → branch → PR → verification. Do not invent a current milestone or sprint. Task branches follow `<type>/HU-<english-slug>-<nn>` with feature, fix, chore or hotfix and two digits, for example `chore/HU-documentation-consolidation-01`. See [branches](docs/07-ingenieria/ramas.md).

Use Conventional Commits in English. Open one focused pull request per story with an English title and description, the relevant documentation updates and actual validation results. Use [the PR template](.github/pull_request_template.md). Keep unresolved dependencies or failing checks in draft. Independent QA/review is required; the implementer does not approve their own work. Never merge automatically or promote a sprint without human approval.

## Validation

```bash
pnpm docs:check
pnpm exec tsc --noEmit
pnpm lint
pnpm check:layers
pnpm test
```

Integration tests require a disposable PostgreSQL database and TEST_DATABASE_URL; run `pnpm test:integration` only against the intended test database. `pnpm verify` runs typecheck, architecture checks, unit tests, integration and the application build. Record environment limitations; do not claim skipped checks passed. CI also validates lint, production SQL, Storybook and migrations. See [testing](docs/07-ingenieria/testing.md) and [operations](docs/08-operaciones/README.md).

## Documentation and languages

Project documentation and the root README are Spanish. AGENTS.md, CONTRIBUTING.md, code, technical comments, tests, branch names, commits and pull requests are English. The UI defaults to Spanish. This policy does not authorize a functional translation or contract change. See [language policy](docs/07-ingenieria/language-policy.md).

Update each topic's canonical source and its index. Preserve ADR identifiers, accepted decisions and useful historical evidence. Significant changes to module boundaries, data contracts or security guarantees require an ADR and human review. Use [the ADR template](docs/05-decisiones/plantilla.md). Operational design is maintained in [packages/brand](packages/brand/README.md); link to it without copying it into docs.

## Repository safety

Never push directly to main or sprint/*, use --force or --no-verify, rewrite history, or commit secrets. Keep real configuration outside tracked files. Production model changes require the repository's established migration and SQL checks; this documentation cleanup does not change that process. Preserve the operational SQL paths and `docs/07-ingenieria/PAUSA`.

Release/version conventions are documented in [versioning](docs/07-ingenieria/versionado.md). The repository is the documentation source; there is no GitHub Wiki publisher.
