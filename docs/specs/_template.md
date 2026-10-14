# <Feature name>

Status: Draft | Ready | Implemented · Model: Sonnet · ADRs: 0014, 0017, 0018, … · Branch: `feat/<slug>`

## Goal

One paragraph: who needs this, what changes for them, what "done" looks like. Say whether it applies to
companies, private individuals, or both.

## User stories

- As a <talent | client (company or private person) | admin | visitor>, I want … so that …

Three to seven stories; each maps to at least one acceptance criterion.

## API contract

| Method and route | Auth                          | Request schema | Response schema            | Errors         |
| ---------------- | ----------------------------- | -------------- | -------------------------- | -------------- |
| `GET /v1/…`      | public / user / owner / ADMIN | `XQuerySchema` | `paginatedSchema(XSchema)` | `NOT_FOUND`, … |

Schemas live in `packages/shared/src/<domain>/`. List new schemas with fields, limits and defaults. Note
rate limits stricter than the global one, and cursor/pagination details.

## Data changes

Prisma models, columns and indexes added or changed (diff against `docs/domain.md`), migration name, seed
changes, deletion and cascade behaviour (PIPA).

## UI

Pages and routes (`/[locale]/…`), Server vs Client Components, shadcn components used.
States per page: loading, empty, error (which error code shows which message), success.
Phone layout first (390 px), then desktop notes.
Strings: namespace(s) and key list with the English text (ko/ru are translated in the PR).

## Acceptance criteria

Numbered, testable: "Given … when … then …". Cover validation limits, visibility rules, auth and
ownership, the three locales, phone width, logging and PIPA points. Mark the ones that get a Playwright
test with `[e2e]`.

## Out of scope

What is deliberately not built now, and where it would plug in later (module, table, hook point).

## Open questions

Only items no ADR decides. Empty when Status is Ready.
