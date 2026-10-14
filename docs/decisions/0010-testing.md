# 0010. Tests: Jest (api), Vitest (web, shared), Playwright in two viewports

Date: 2026-10-14 · Status: Accepted

## Context

Agents need fast, deterministic feedback. Phone-first product means phone layouts must be tested, not assumed.

## Decision

- `apps/api`: Jest. Unit tests for services (Prisma mocked or test DB via Docker); one e2e test per module
  hitting the real Nest app against the Docker Postgres.
- `apps/web`, `packages/shared`: Vitest. Shared tests validate schema edge cases; web tests cover pure logic
  and component rendering with Testing Library.
- `apps/web/e2e`: Playwright with two projects: `mobile` (iPhone 14 preset emulated in Chromium) and `desktop` (1280×800).
  Every e2e spec runs in both. Only a few flows: sign up, create profile, search, reveal contact.
- `pnpm check` runs typecheck + lint + unit tests + prettier. E2E runs in CI on PRs only (slower), not in the Stop hook.
- API unit tests compile `packages/shared` from source (Jest `moduleNameMapper`), because Jest runs CommonJS.

## Consequences

Tests next to code (`*.spec.ts` in api, `*.test.ts` in web/shared) so the `test-writer` subagent knows where
to put them.
