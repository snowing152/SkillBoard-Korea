# Conventions (only what a linter cannot check)

Everything checkable lives in `packages/config` (tsconfig, ESLint), `prettier.config.mjs` and the hooks in
`.claude/hooks/`. This page holds the rest.

## Naming

- Files kebab-case: `talent-profiles.service.ts`, `language-switcher.tsx`. Suffixes: `.module`,
  `.controller`, `.service`, `.dto`, `.schema`, `.spec`, `.test`, `.e2e-spec`.
- Code: `PascalCase` for classes, types, React components and Zod schemas
  (`CreateTalentProfileSchema` → type `CreateTalentProfile`); `camelCase` for functions and variables;
  `SCREAMING_SNAKE` only for true constants (`LOCALES`, error codes) and env variables.
- Database: models PascalCase singular, columns camelCase, enum values SCREAMING. Wire JSON camelCase.
  Routes kebab-case plural nouns. Query params camelCase.
- Migrations `snake_case_what_changed`. Branches `feat/<spec-slug>`, `fix/<issue>-<slug>`,
  `chore/<slug>`, `docs/<slug>`.
- Booleans read as questions (`isActive`, `hasConsented`); timestamps end with `At`; references with `Id`.

## Folder layout

- API: one folder per domain module (`apps/api/CLAUDE.md`); `common/` for cross-cutting code. No `utils/`
  dumping ground: a helper lives next to its only user and moves to `common/` at the second user.
- Web: route files in `app/[locale]/…` stay thin (fetch and compose); feature components in
  `components/<feature>/`; primitives in `components/ui/`; pure helpers in `lib/`.
- Shared: `src/<domain>/`, one concept per file, `index.ts` re-exports only.

## Error handling

- API: services throw `ApiError(code, message, details?)`; the global filter formats. Never catch only to
  re-throw a generic error; never swallow. Unexpected errors bubble (500, logged with the requestId).
- Web: Server Components let errors reach `error.tsx`. Client code maps `error.code` to
  `t('errors.<CODE>')`; raw messages never reach users; the `requestId` is shown for support.
- Validation failures are `VALIDATION_FAILED` with Zod issues in `details`; forms show them per field.
- An optional value that is absent is `null` in responses, not an error.

## Comments

- Explain _why_ (constraint, ADR number, pitfall), not _what_: `// cursor = last id, time-ordered (ADR 0017)`.
- `TODO(#123):` only with an issue number. No commented-out code.

## Commits

- Conventional Commits: `type(scope): imperative summary`, at most 72 characters. Types: `feat`, `fix`,
  `docs`, `test`, `chore`, `refactor`, `ci`, `perf`. Scope is a package or module (`api`, `web`, `shared`,
  `talent-profiles`, `hooks`).
- Body when the why is not obvious: what changed and why, blank line, then `Refs #issue` or `ADR 0017`.
- Generated files (`openapi.json`, `schema.ts`, migrations) go in the same commit as the change that
  produced them. One logical change per commit; `pnpm check` green at every commit on `main`.

## Pull requests

- Title = the summary of the main commit. Fill `.github/PULL_REQUEST_TEMPLATE.md`: spec link, what and
  why, how it was tested (checks, viewports), screenshots for UI (phone first), docs or ADRs touched,
  follow-ups as issues.
- One PR implements one spec. Run `/review` (reviewer subagent) before asking a human.

## Why these rules exist (for the learning owner)

An agent facing an unstated choice picks at random, and random choices compound across features. Each
rule above removes one such choice. When a rule could be enforced by a tool, move it into config and
delete it from this page.
