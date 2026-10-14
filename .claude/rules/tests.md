---
paths:
  - '**/*.spec.ts'
  - '**/*.test.ts'
  - '**/*.test.tsx'
  - '**/*.e2e-spec.ts'
  - 'apps/web/e2e/**'
  - '**/vitest.config.*'
  - '**/jest*.config.*'
  - '**/playwright.config.ts'
---

# Test rules (ADR 0010)

- API unit tests `*.spec.ts` next to the service: `Test.createTestingModule` with `PrismaService`
  replaced by a `useValue` mock (see `health.service.spec.ts`). No Docker; `pnpm check` passes offline.
- API e2e `test/<module>.e2e-spec.ts`: real `AppModule` + `setupApp`, Docker Postgres, one happy path and
  one error-shape assertion per module. Parse responses with the shared Zod schemas instead of asserting
  field by field.
- Shared `*.test.ts` (Vitest): schema edge cases (max lengths, trimming, bad URLs, enum typos).
- Web `*.test.ts(x)` (Vitest + Testing Library, jsdom): pure logic and component states (loading, empty,
  error). Wrap components in `NextIntlClientProvider` with the `en` messages.
- Playwright `apps/web/e2e/*.spec.ts`: only the flows a spec names. Both viewports run automatically, so
  never set a viewport inside a test. Locate by role and by the `messages/en` text. Rely on seed data;
  create data through the UI only when that is the flow under test.
- Deterministic: no `Date.now()` without fake timers, no random values in assertions, no network.
- A bug fix ships with a regression test in the same PR.
- The Jest config quirks (`moduleNameMapper`, `JEST_TS_OVERRIDES`) are deliberate; read `docs/pitfalls.md`
  before changing them.
